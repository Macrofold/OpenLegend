# World of Warcraft: map literacy, learned actions and configurable density

[Research ledger](../research.md) · [Inventory guidance](../inventory.md) · [Screenshot manifest](../screenshots/wow/manifest.json)

**Evidence reviewed:** 2026-10-04. Five distinct Blizzard images, downloaded and visually inspected. The first three are from the **2022 Dragonflight UI preview**; the new map and spellbook examples are from the **July 2024 War Within UI announcement**. These are historical publisher captures, not claims about the latest client. The bag source marks work in progress. Publisher comparisons count once each, including the two-size spellbook image. No live session, add-on installation or accessibility test was performed.

## Why this example matters

WoW supplies evidence for three different player goals: viewing possessions, interpreting the world map and finding learned abilities. It makes a useful distinction between physical bag capacity and how possessions are presented. Multiple equipped bags need not force multiple windows. Its layout editor also demonstrates a valid place for forms: configuring an optional preference while seeing the result. That does not imply that ordinary gameplay should be executed through configuration forms.

**Actual player evidence.** In the October 26, 2022 [“consolidate bags” discussion](https://us.forums.blizzard.com/en/wow/t/thank-you-for-the-consolidate-bags-option/1380103), SellySel described relying on Bagnon to see possessions together, then welcomed a built-in equivalent. TidelWave also specifically liked consolidation. In the same thread, Bodach reported the combined bag being obstructed by a sidebar while moving items; other posters wanted the same behavior for banks. These are direct player reports about particular operations, not proof that every player preferred the new UI. The date matters: they establish a historical failure mode, not an unresolved 2026 bug.

## WOW-01 — One carried collection, regardless of bag count

![WoW separated bag windows compared with a combined backpack](../screenshots/wow/01-separated-combined-bags.png)

_Source: Blizzard, [Dragonflight HUD and UI Revamp](https://worldofwarcraft.blizzard.com/en-us/news/23841481), 2022-09-01. © Blizzard Entertainment. Publisher-composed comparison, counted once._

**Observed layout.** On the left, several narrow bag windows stack around the lower-right edge. Each has its own title/close control and slot grid. On the right, a single Combined Backpack exposes the carried slots together. It has a header and close button, a search field, a small sorting utility, occupied/empty slots, numerical stack counts, and currency totals along the bottom. The equipped bag icons remain outside the large window. The minimap and objective header remain visible above. The bottom system-icon strip is peripheral navigation; this image does not establish the function of every unlabeled symbol.

**Documented interaction.** Blizzard's [release guide](https://worldofwarcraft.blizzard.com/en-us/news/23837944) directs the player to open all bags with Shift+B and use the bag settings to enable a combined bag. The image demonstrates the two presentation states; it does not itself demonstrate drag behavior or bank access.

**Why it works.** A unified collection reduces repeated window opening and fragmented scanning. Item stacks retain stable visual units. A small number of collection utilities serves all visible items, instead of a row of buttons on every object. Search sits where the collection is read.

**What it does not solve.** A wall of icons still depends on item recognition. The illustrated backpack has enough slots to cover a substantial part of the world. The player reports show that a correct collection concept can still fail when another panel overlaps the intended drop target. This image does not demonstrate accessible names, focus navigation or enlarged text.

**Open Legend application.** Show carried possessions coherently, retaining bag identity when it affects rules. When a chest is opened, present the chest and carried items as two clear collections. The physical storage model should determine legality, while the layout should support the current transfer. Keep transfer targets free of overlapping chat, hotbars and popups. Include readable item names and non-drag controls for newly invented or visually similar items.

## WOW-02 — Optional HUD configuration shows the actual result

![WoW HUD edit mode with layout selector, alignment grid, selectable elements and Save](../screenshots/wow/02-hud-edit-layout.png)

_Source: [Blizzard's 2022 UI preview](https://worldofwarcraft.blizzard.com/en-us/news/23841481), © Blizzard Entertainment. Full game screenshot._

**Observed controls.** A centered HUD Edit Mode window includes a named layout selector, Show Grid, grid-spacing slider, and checkboxes for target/focus, party, stance, pet, possess, buff, debuff, cast, encounter and extra-ability frames. Revert All Changes and Save appear at the bottom. The world is covered by a placement grid, while movable regions have visible outlines. Party frames, target/player frames, hotbar groups and minimap are recognizable in their current positions. This is explicitly a layout-edit state, not an ordinary combat state.

**Documented behavior.** The [release article](https://worldofwarcraft.blizzard.com/en-us/news/23837944) describes choosing elements, rearranging them, saving named layouts and sharing layout configuration. The screenshot supplies the live placement context; the article supplies the save/share behavior.

**Why it works.** The effect of a setting is visible where it matters. The player manipulates layout against the real game view and retains a route to revert. The controls are appropriate to an occasional preference task.

**Weakness and Open Legend lesson.** This many options would be oppressive before every object interaction. Open Legend can offer optional layout/text-density preferences while shipping a coherent default. The player should not need to become a HUD designer to open a chest or speak to someone. Saving display preferences must not imply changing game-world objects or actions.

## WOW-03 — Local configuration with immediate visual feedback

![WoW debuff frame editor with orientation, wrapping, icon size and padding controls](../screenshots/wow/03-frame-edit-preview.png)

_Source: [Blizzard's 2022 UI preview](https://worldofwarcraft.blizzard.com/en-us/news/23841481), © Blizzard Entertainment. Full game screenshot._

**Observed controls.** The Debuff Frame window contains Orientation, Icon Wrap and Icon Direction selectors; Icon Size, Icon Padding and Icon Limit sliders; a Show Full checkbox; Revert Changes; and a close control. The selected debuff region is highlighted beside it. A second nearby status region allows the player to see spacing and potential collision. Sample status icons include remaining-duration labels.

**Interpretation boundary.** The labels establish the intended preferences, but this still image cannot establish the exact range of each slider, keyboard increments, persistence after cancellation, or what Show Full does in all cases. Do not import those unverified details.

**Why it works.** The player can connect a control to an affected region. Size, spacing and wrapping are shown with representative content instead of an abstract settings list.

**What can go wrong.** Enlarging icons can make neighboring content collide. Dense, color-rich symbols may remain hard to distinguish after scaling. A usable editor must also provide correct defaults, text labels and cancellation semantics; this screenshot proves none of those by itself.

**Open Legend application.** Preview enlarged text and item density in the actual inventory or conversation region. Test narrow and short windows with real long names and replies. Keep the selected item and draft during layout adaptation. Use optional settings for preferences, not compulsory configuration of every action's actor, object and destination.

## WOW-04 — Explain the symbols where the player needs to read them

![WoW Map and Quest Log with area breadcrumbs, world markers and an expanded labeled map legend](../screenshots/wow/04-map-legend.png)

_Source: [Blizzard's July 2024 UI announcement](https://news.blizzard.com/en-gb/article/24117139/user-interface-and-quest-updates-in-the-war-withintm), © Blizzard Entertainment. Full publisher capture; War Within preview period, exact client build unspecified._

**Player goal and observed controls.** The player wants to identify nearby content and understand its markers. The map occupies the left; a scrollable legend replaces the right-hand detail area. Location breadcrumbs progress from World through Azeroth and Khaz Algar to Hallowfall. The legend has a Back button and named groups: Quests, Limited Time Activities, Activities and partly visible Movement. Each symbol is paired with text; Campaign, Important, Repeatable, In Progress and Turn In are visibly different. Top-right window controls provide size/close affordances. Three circular controls above the map and a gear above the legend are visible, but this source does not establish every control's function; the hamburger must not be asserted to filter just from its shape.

**Documented flow.** `M` opens the map and its legend. `L` opens the quest log, where checkboxes select tracked quests and hovering a quest explains its category/status. These are linked ways to understand content, rather than a requirement to memorize every symbol. [Official announcement](https://news.blizzard.com/en-gb/article/24117139/user-interface-and-quest-updates-in-the-war-withintm).

**Why it helps.** Help is adjacent to the thing being interpreted, and shape plus label avoids depending only on color. Breadcrumbs preserve geographic orientation. **What is weaker:** many categories and markers can still overwhelm the map; a key explains clutter without reducing it. The source does not show every filter or what happens when several markers overlap.

**Original player response.** In the [July 22, 2024 announcement discussion](https://us.forums.blizzard.com/en/wow/t/user-interface-and-quest-updates-in-the-war-within%E2%84%A2/1897936), Leounity asked for icon filtering and FrodoBggns described the existing Dragonflight map as crowded. LordVader praised the new presentation's detail. Those are individual reactions to a preview; they do not establish a tested majority preference or prove a missing filter. DeadlyKitten's approval of hiding already-completed quests on alternate characters is an anticipated benefit, not evidence of that poster completing a hands-on test.

**Open Legend application.** Make unfamiliar spatial symbols explain themselves in place, with a concise legend or accessible named detail when needed. Keep current selection and relevant nearby information prominent. If filters are introduced, show what is hidden and preserve the player's choice. Do not conceal the only way to find a person behind a tiny settings icon. These lessons concern permitted spatial information; they do not authorize adding quest taxonomies or revealing undiscovered locations.

## WOW-05 — A learned-action catalogue and a quick-action bar serve different goals

![WoW spellbook in full and minimized layouts with named abilities, class tabs, search, Hide Passives and page controls](../screenshots/wow/05-spellbook.png)

_Source: [Blizzard's July 2024 UI announcement](https://news.blizzard.com/en-gb/article/24117139/user-interface-and-quest-updates-in-the-war-withintm), © Blizzard Entertainment. One original publisher comparison, counted once. Preview build unspecified._

**Observed arrangement.** The book offers icons **and names**, separated into Warrior and specialization sections. Passive is written beneath relevant abilities; unavailable-looking entries are dimmed. Warrior/General tabs sit above the pages. Search and Hide Passives stay at the top; numbered page arrows at the bottom. Specialization, Talents and Spellbook are persistent lower tabs, with Spellbook selected. A corner size control changes the presentation; close remains beside it. The minimized version shows fewer entries and more pages, preserving names instead of making every entry tiny. The exact blocker for each dim entry is not visible.

**Documented flow.** `N` opens the consolidated Talents and Spellbook surface. The spellbook can be minimized, searched and filtered to hide passive abilities; search can identify abilities missing from the action bar. [Official announcement](https://news.blizzard.com/en-gb/article/24117139/user-interface-and-quest-updates-in-the-war-withintm). This image does not demonstrate dragging an ability, a tooltip or an actual cast, so those actions are not inferred from it.

**Why it helps.** Discovery and inspection have space for meaningful labels; frequent execution can stay elsewhere. A passive effect is distinguished from a command the player can invoke. **What is weaker:** class, specialization and character-development navigation create several layers, and the full book occupies substantial scene space. Names/search help learned catalogues, but a small set of current actions should not require opening a catalogue every time.

**Open Legend application.** Present the controlled character's actual available abilities or learned techniques in readable groups when browsing is the task. Keep the immediate verb attached to its selected person, object or station. Distinguish an ongoing effect from an actionable command and explain known blockers. A compact layout should retain the same subject and readable names; avoid shrinking a dense desktop catalogue into illegible cells. Do not copy WoW's class, talent or hotbar systems unless those mechanics are separately supported and approved.

## Workflows supported by the evidence

| Player task                                    | Verified or observed sequence                                                                                                                                        | Design lesson                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| See carried possessions together               | Open all bags → enable the combined presentation → inspect the shared grid. The setting route is documented by Blizzard.                                             | Separate physical bag structure from presentation fragmentation.                                            |
| Find an item                                   | A search field sits directly above the combined collection. Exact matching/filter rules were not tested.                                                             | Scope search to the collection being read; do not make search the sole path for ordinary small inventories. |
| Adjust the HUD                                 | Open Edit Mode → select/reposition a frame → inspect the actual layout → save or revert. Documented by the release article and illustrated by two distinct captures. | Preference forms work when their purpose is explicit and effects are visible.                               |
| Move an item without an obstructed destination | Historical player reports describe sidebar overlap during movement.                                                                                                  | Qualify real pointer paths and stacking; a beautiful static screen is insufficient.                         |

## Conclusions for Open Legend

The wider interface study supports in-place explanations for unfamiliar symbols and a separate reference catalogue for learned actions. Keep frequent actions attached to their current subject. Make compact presentation preserve readable names, and let players understand which information a filter hides. Neither a symbol legend nor optional customization excuses an overloaded default.

The positive evidence supports **a unified view of possessions**, not a global menu of nearby storage objects. Adopt that distinction. A container's capacity and access can remain authoritative without making its identity a required dropdown field for every transfer. The player begins with the chest they opened; the UI shows its contents and the possessions they can move.

The negative evidence gives a concrete acceptance scenario: open a chest, select or drag an item, bring chat or a tooltip into view, and confirm the intended destination remains visible and reachable. Also qualify the non-drag path and keyboard focus. This dossier proposes lessons only; the handbook and owning implementation plan hold accepted requirements.

## Reference-image rights

All screenshots are Blizzard's reference material, retained for attributed research and criticism. They are not Open Legend artwork or licensed production assets and are not relicensed under AGPL. The manifest records original URLs, dates, dimensions, hashes and uncertainties.

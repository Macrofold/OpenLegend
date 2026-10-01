# Research and exemplar ledger

[Handbook](README.md) · [Current-surface coverage](verification.md#current-surface-coverage)

**Researched/accessed: 2026-09-30.** This is a curated interaction-design study, not an aesthetic ranking, a representative player survey, or a claim to have played every current version. Official design documentation establishes a documented pattern; original player discussions establish reported experiences, not prevalence or causation. Open Legend recommendations are our synthesis and must be evaluated in its own tasks.

The [148-game roster](../../archive/02-research/game-inspiration/research-roster.md) guided selection: Baldur's Gate 3 (G26), Diablo IV (G12), RuneScape (G48), Old School RuneScape (G49), Final Fantasy XIV (G91) and Factorio (G27). Guild Wars 2 is an additional targeted MMO reference here. This pass does not rerun or close the broader corpus's research-completion gates. It focuses on inventory, information discovery, spatial navigation and repeated management tasks.

## How to use the evidence

Read a source when a decision depends on its details, not on every UI task. The source IDs below provide stable local links; source pages may evolve. Dates distinguish enduring older guidance from newer product examples. Undated living documentation is labeled as the accessed snapshot rather than assigned an invented publication date.

Borrow the reason a pattern works, not its theme, economic model, exact limits or undocumented implementation. A current release note proves a feature or fix was documented; it does not prove the whole product is best in class. A complaint followed by a workaround can identify a discoverability problem even when the capability already exists. A fresh repost of an old incident is not a fresh incident.

## Foundational design and implementation sources

### F01

**Nielsen Norman Group — Jakob Nielsen, Progressive Disclosure (December 3, 2006; historical principle).** [Original article](https://www.nngroup.com/articles/progressive-disclosure/).

Keep the main task understandable and defer secondary complexity. This informs the handbook's visible/nearby/specialist layers. Our additional rule is that costs, blockers and consequential effects remain visible when needed for the decision; progressive disclosure is not permission to conceal them. Destination: [Foundations](foundations.md).

### F02

**Nielsen Norman Group — Hoa Loranger, Accordions Are Not Always the Answer for Complex Content (May 18, 2014; historical principle).** [Original article](https://www.nngroup.com/articles/accordions-complex-content/).

Accordions can burden users who need most of the content or must compare sections. Use them for selectively needed detail, not as a substitute for coherent structure. Destination: [Controls](controls.md).

### F03

**Microsoft Fluent 2 — Layout (living documentation, accessed September 2026).** [Official guidance](https://fluent2.microsoft.design/layout).

Systematic spacing and layout create relationships across components and screen sizes. Adopt a shared vocabulary and responsive structure; keep Open Legend's existing token scale rather than copying a vendor's numerical system. Destination: [Foundations](foundations.md).

### F04

**Atlassian Design System — Spacing (living documentation, accessed September 2026).** [Official guidance](https://atlassian.design/foundations/spacing).

Tokenized spacing supports consistent rhythm and hierarchy. This backs reuse of named spacing relationships, not a claim that one fixed gap is correct for every game surface. Destination: [Foundations](foundations.md).

### F05

**GOV.UK Design System — Text input (living documentation, accessed September 2026).** [Official component guidance](https://design-system.service.gov.uk/components/text-input/).

Persistent labels, purposeful widths, hints and associated errors make forms understandable. The relevant transfer is practical form behavior, not the public-service site's visual style. Destination: [Controls](controls.md).

### F06

**W3C — Web Content Accessibility Guidelines 2.2.** [Normative recommendation](https://www.w3.org/TR/WCAG22/).

Use the relevant text/non-text contrast, keyboard, focus, resizing and interaction criteria as web-interface baselines. These include qualifications and exceptions; this handbook does not certify the game or substitute for an accessibility audit. Destination: [React accessibility](react.md#accessibility-is-a-behavior-contract).

### F07

**W3C WAI — ARIA Authoring Practices, Combobox Pattern.** [Official pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

A combobox combines a value field with an associated popup and defined keyboard/focus behavior. It is not an arbitrary nesting of two independent controls. Distinguish editable text, selected value and active option. Destination: [Controls](controls.md).

### F08

**Adobe — React Aria ComboBox (living documentation).** [Official documentation](https://react-aria.adobe.com/ComboBox).

Provides an accessible composite-control structure and collection/selection behavior. Open Legend already uses React Aria; extend the current semantic owner rather than installing a second system. Check the installed lockfile/API before adapting a current documentation example. Destination: [Controls](controls.md), [React](react.md).

### F09

**MDN — `::-webkit-search-cancel-button` (page updated April 17, 2026).** [Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::-webkit-search-cancel-button).

Documents the non-standard cancel affordance associated with WebKit/Blink search inputs. The current inventory contains a native search input, so browser chrome is a plausible source of a clear-X mismatch. This is not a reproduced diagnosis of the user's blue-X report, and that pseudo-element is not a cross-browser styling solution. Destination: [Controls](controls.md#clear-x-explicit-quiet-and-singular).

### F10

**W3C WAI — Dialog (Modal) Pattern; Adobe — Modal.** [APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) · [React Aria](https://react-aria.adobe.com/Modal).

Use genuine background isolation, deliberate initial focus, keyboard containment and focus restoration for a modal. Long content may need initial focus on a heading rather than the first action. A panel that leaves the world interactive is not a modal simply because it floats. Destination: [Controls](controls.md).

### F11

**W3C WAI — Understanding Target Size (Minimum), WCAG 2.2 criterion 2.5.8.** [Official explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

The AA criterion uses 24×24 CSS pixels with specified exceptions. Do not conflate it with the 44×44 enhanced criterion or with a comfortable touch-target recommendation. Open Legend's preferred sizes are separately labeled proposals. Destination: [UXL03](../limits/ui-ux.md#uxl03).

### F12

**W3C WAI — Understanding Reflow.** [Official explanation](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Qualify surrounding forms, menus and conversation UI at narrow effective widths. Exceptions for content genuinely requiring a two-dimensional layout do not excuse every overlay around a game map. Destination: [React](react.md), [Verification](verification.md).

### F13

**React — Sharing State Between Components.** [Official documentation](https://react.dev/learn/sharing-state-between-components).

Lift shared state to the appropriate common owner, rather than synchronizing divergent copies. Open Legend extends this distinction to authoritative server data, local drafts and ephemeral interaction state. Destination: [React](react.md).

### F14

**React — Preserving and Resetting State.** [Official documentation](https://react.dev/learn/preserving-and-resetting-state).

Component identity and keys affect state retention. Preserve drafts and selection through ordinary rerenders, and reset intentionally when the owning conversation/entity changes. Nested component definitions can accidentally reset state. Destination: [React](react.md).

### F15

**React — You Might Not Need an Effect.** [Official documentation](https://react.dev/learn/you-might-not-need-an-effect).

Derive display data during rendering when appropriate; put interaction-specific work in event handlers and use Effects for external synchronization. Selection or rendering must not accidentally trigger a consequential mutation. Destination: [React](react.md).

### F16

**Microsoft — Xbox Accessibility Guidelines, including UI navigation.** [Guideline family](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines) · [XAG 112: UI navigation](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112) · [Version history](https://learn.microsoft.com/en-us/gaming/accessibility/xag-version-history).

Game UI needs deliberate focus navigation, discoverable controls and suitable input alternatives. Consult the relevant family guidance for text, motion, input or navigation when changing that area. A focusable desktop button alone is not evidence of controller or assistive-device support. These are design resources, not proof that Open Legend passes a certification. Destination: [World interaction](world-interaction.md), [React](react.md).

## Agent-product exemplars

### A01

**OpenAI — ChatGPT release notes, September 2026 snapshot.** [Official release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes).

September 29 documents editable Pages and interactive plugin panels alongside conversation; September 10 documents source previews beside chat. The transferable pattern is conversation plus an identifiable working object, with source/context and permissions kept explicit. Do not copy rollout-specific behavior or treat sharing a work product as sharing every private conversation. Destination: [Chat and invention](chat-and-invention.md).

### A02

**Anthropic — What are artifacts and how do I use them?, September 2026 snapshot.** [Official help](https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them).

The current guide treats artifacts as reusable work products refined through conversation and distinguishes legacy artifacts created before September 16, 2026. Use a stable candidate/version with direct inspection and editing, rather than burying the only usable result in a long transcript. This example does not authorize arbitrary generated code or markup in Open Legend. Destination: [Chat and invention](chat-and-invention.md).

## Game exemplars

| Reference | Relevant strength to study | Caution / what not to copy | Open Legend application |
| --- | --- | --- | --- |
| Baldur's Gate 3 | Contextual inventory actions, party transfer and rich item decisions | A complex inventory can still create sorting chores and poorly discovered workflows | Selected-object detail, clear recipient, comparable facts; not a literal screen clone |
| Diablo IV, April 2026 update | Configurable loot filtering and inspection of hidden drops | A filtering error hides useful objects; rarity alone is not universal value | Visible filter state, recoverable hiding, explicit item-purpose rules |
| RuneScape | Stable bank organization and placeholders | Historical bank constraints and account economy are game-specific | Preserve organization when stock changes; reduce repeated rearrangement |
| Old School RuneScape, 2025 QoL | Repeatable withdrawal/charge preferences and shortfall feedback | Automated consumption must remain deliberate and authorized | Named presets with clear resource consequences and failure explanation |
| Final Fantasy XIV, current UI guide | Equipment comparison, gear sets, market search, HUD configuration and camera options | Its jobs, slots, bindings and market rules are not Open Legend's | Consistent comparisons, reusable configurations, explicit camera automation |
| Guild Wars 2, 2025 QoL | Consolidating many convenience items into a few usable tools | Some Open Legend objects need meaningful physical existence | Remove pointless bookkeeping before adding more bag space |
| Factorio | Spatial search, persistent personal pins and organized alerts | Its map knowledge and remote capabilities need not be available to an embodied actor | Find a known thing, orient to it and retain a reference without granting extra knowledge |

These are task-specific references, not a league table of overall UI quality. Modern examples complement older durable patterns. The study does not claim to have audited every subsequent patch or every input platform.

### G01

**Larian — Baldur's Gate 3, Hotfix #21 (March 7, 2024).** [Official notes](https://baldursgate3.game/news/hotfix-21-is-now-live_112).

The notes restore sending items to particular companions in camp from outside camp. The relevant lesson is explicit destination and reducing unnecessary navigation during inventory management. This is a dated feature example, not a claim that this is the latest BG3 patch. Original player discussion below adds a counterpoint about sorting and discoverability. Destination: [Inventory](inventory.md).

### G02

**Blizzard — Diablo IV, Prepare for the Reckoning: Lord of Hatred Draws Near (April 2026), and patch 3.0.1a (April 28, 2026).** [Feature announcement](https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near) · [Patch notes](https://news.blizzard.com/en-us/article/24266869/diablo-iv-patch-notes-2-6).

The feature announcement documents configurable rules for showing/hiding/recoloring ground loot and a way to inspect filtered items. It explicitly distinguishes ground filtering from inventory/stash/vendor display. Subsequent notes fix incorrect filtering of some high-aspect items. Adopt reversible filtering and clear rules; do not treat a hidden item as nonexistent. The patch URL retains an older version label, so the dated page content, not its slug, establishes the cited patch. Destination: [Inventory](inventory.md).

### G03

**Jagex — RuneScape, Bank Placeholders & Improvements (September 30, 2019; historical reference).** [Official announcement](https://secure.runescape.com/m=news/bank-placeholders--improvements).

Placeholders preserve an organizing position after withdrawal; related bank improvements make repeat management more predictable. The enduring lesson is retaining the player's organization, not importing RuneScape's slot counts or requiring empty physical objects in the world. Destination: [Inventory](inventory.md).

### G04

**Jagex — Old School RuneScape, Game Jam: Charges & QoL (March 5, 2025).** [Official update](https://secure.runescape.com/m=news/game-jam-charges-qol?oldschool=1).

Documents withdrawal/charge quality-of-life controls and feedback when the desired withdrawal cannot be fulfilled. Repeat-task presets should expose what they consume and explain shortfalls. Do not silently automate a new class of world actions merely because a preset is convenient. Destination: [Inventory](inventory.md).

### G05

**Square Enix — Final Fantasy XIV UI Guide (site last-update label September 8, 2026 at inspection).** [Guide](https://na.finalfantasyxiv.com/uiguide/) · [Gear sets](https://na.finalfantasyxiv.com/uiguide/equipment/equipment-gearset/equipment_set.html) · [Comparing equipment](https://na.finalfantasyxiv.com/uiguide/equipment/equipment-compare/equipment_compare.html) · [Market search](https://na.finalfantasyxiv.com/uiguide/item/item-market/market_search.html) · [HUD layout](https://na.finalfantasyxiv.com/uiguide/know/know-hud/hud-layout.html) · [Legacy camera configuration](https://na.finalfantasyxiv.com/uiguide/faq/faq-other/setting_legacy.html).

The targeted pages show side-by-side equipment comparison, saved equipment choices, market filtering and configurable HUD organization. The camera page distinguishes movement-relative automatic camera behavior from an option to disable automatic pivot. Borrow predictable modes and explicit configuration; retain Open Legend's own camera meanings and world-authority boundaries. The site's update label does not prove each subpage changed on that date. Destinations: [Inventory](inventory.md), [World interaction](world-interaction.md).

### G06

**ArenaNet — Quality-of-Life Improvements in Janthir Wilds: Absolution (May 29, 2025, for the June 3 update).** [Official article](https://www.guildwars2.com/en/news/quality-of-life-improvements-in-janthir-wilds-absolution/).

The update consolidates many travel and exchange convenience items into fewer tools. This is an example of reducing the number of bookkeeping objects, not merely enlarging inventory capacity. Preserve meaningful physical tools/resources where Open Legend's world design requires them. Destination: [Inventory](inventory.md).

### G07

**Wube — Factorio Friday Facts #400, Chart search and pins (March 1, 2024).** [Original developer article](https://factorio.com/blog/post/fff-400).

Describes spatial search, personal pins and more organized alerts. Its search scope deliberately avoids some overly broad contents searches. Transfer the task sequence of finding, orienting and retaining a reference; do not import omniscient map access or remote actions into an embodied character's UI. Destination: [World interaction](world-interaction.md).

## Original player feedback

### P01

**Baldur's Gate 3 Steam community — too many useless items (April 30, 2025).** [Original discussion](https://steamcommunity.com/app/1086940/discussions/0/600777204942523998/).

The original poster reports inventory/sorting fatigue. Replies disagree and point to wares, sorting, bags and more selective looting. This is evidence of both friction and existing workarounds, not unanimous dissatisfaction. The useful design question is whether purpose and bulk-management tools are discoverable without coaching. Self-reported time spent sorting is not a measured benchmark.

Access note: the original discussion's text was available in indexed retrieval; a direct render returned a Steam community shell. Do not treat the shell as evidence of additional unseen replies. Destination: [Inventory](inventory.md).

### P02

**Guild Wars 2 Steam community — Inventory is always too full and transmogs are ugly (August 5, 2025).** [Original discussion](https://steamcommunity.com/app/1284210/discussions/0/594030422158175317/).

Players describe difficulty judging item purpose and recurring inventory-management work; replies describe deposit, sell and salvage workflows that make it more manageable for them. The actionable lesson is to reveal useful bulk actions and consequences rather than assume players already know the economy. The thread does not establish how common the problem is, or prove a monetization motive. Destination: [Inventory](inventory.md).

## Synthesis and evidence limits

The strongest cross-source pattern is not a particular visual style: make the current object, scope, next action and consequential state legible; preserve the player's working context; and remove repetitive management where it has no gameplay purpose. Composite controls, modal focus and transaction integrity require explicit behavior contracts, not visual intuition alone.

Quantitative layout ranges in [UXL01–05](../limits/ui-ux.md) are Open Legend starting proposals. WCAG thresholds remain separately attributed standards with their qualifications. Existing product choices remain in their owners. No cited company has endorsed these Open Legend-specific values.

Research covered documented examples and selected implementation source, not hands-on comparative play, live ChatGPT/Claude product testing, every game patch, every UI component body or a statistically representative player sample. Images linked by official guides are references, not licensed assets for the game. Keep attribution/licensing separate from the right to learn an interaction pattern. Recheck living sources when changing a dependency API, a product-specific claim or a version-sensitive recommendation; stable task principles do not require rereading the web on every UI edit.

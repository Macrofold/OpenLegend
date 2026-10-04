# Research and exemplar ledger

[Handbook](README.md) · [Current-surface coverage](verification.md#current-surface-coverage)

**Original handbook research: September 30–October 1, 2026. Game-interface screenshot research and current-code diagnosis: October 3–4, 2026.** This is one maintained, topic-organized evidence base for the handbook. Official guidance establishes a documented pattern; pinned implementation establishes behavior at the inspected revision; original player discussions establish reported experiences, not prevalence or causation. Open Legend recommendations are our synthesis, not company endorsements or a claim that every cited product is best in class.

**Repository evidence:** Open Legend UI structure, selected implementation bodies and design owners were inspected at runtime baseline `0382be76648879cf8a8397ad6c3534b4431916f5`. The handbook at `e8d6c8950cadd715cfed97df4a0e379ff1593d02` was critiqued against additional primary sources; PR #26's target `Macrofold/OpenLegend/main` remained at the same runtime baseline. Specific external code revisions and reading ranges are recorded below. Neither source inspection nor documentation review is a running-game, comparative product or usability test.

The [148-game roster](../../archive/02-research/game-inspiration/research-roster.md) guided selection: Baldur's Gate 3 (G26), Diablo IV (G12), RuneScape (G48), Old School RuneScape (G49), Final Fantasy XIV (G91) and Factorio (G27). Guild Wars 2, Riot's clarity notes and Blizzard's Classic UI notes add targeted evidence. The handbook does not rerun or close the broader corpus's research-completion gates.

## How to use the evidence

Read a source when a decision depends on its details, not on every UI task. Source IDs are stable citation anchors, not reading order or authority rankings. They are retained across consolidation so existing references keep their meaning. Undated living documentation is identified by its access period; retrieval dates are not publication dates. Historical examples remain useful without pretending to describe every current version.

Borrow the reason a pattern works, not its theme, economic model, exact limits or undocumented implementation. A release note establishes documented delivery or a fix, not overall design quality. A complaint followed by a workaround can reveal discoverability friction even when the capability exists. A few comments cannot establish consensus, prevalence or commercial causation.

## Principle-to-evidence map

| Decision to get right           | Current guidance                                                                                                                                | Supporting evidence and caution                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Searchable selection            | Choose an editable combobox or an intentionally opened searchable picker; prohibit invalid nested interactive elements, not the latter workflow | [Controls](controls.md#a-combobox-is-one-composite-control), F07/F08/S01          |
| Disabled explanations           | Keep important reasons reachable; native disabled controls cannot rely on a keyboard-focus tooltip                                              | [Controls](controls.md#disabled-controls-and-reachable-explanations), S02/S11     |
| Utility colors                  | Quiet clear/close styling preserves deliberate focus and forced colors                                                                          | [Controls](controls.md#clear-x-explicit-quiet-and-singular), S12                  |
| Modal and child dismissal       | Modality bounds interaction; the active child handles its gesture before the parent                                                             | [World](world-interaction.md#one-owner-for-each-gesture), S04                     |
| Adaptive layout                 | Preserve selected object, draft, filters and reading anchor when panes change                                                                   | [Foundations](foundations.md#adapt-the-task-not-just-the-boxes), S03/S08          |
| Component composition           | Check prop/ref/ID forwarding, handler ordering, cancellation and installed-version behavior                                                     | [React](react.md#component-composition-must-preserve-behavior), S01/S05/S06       |
| Persistence and performance     | Separate sharable navigation, private drafts and server truth; distinguish local feedback from completion and field INP                         | [System feedback](system-feedback.md), [UXL05](../limits/ui-ux.md#uxl05), S07/S15 |
| Agent correction and reliance   | Communicate supported tasks, enable targeted edits and expose evidence without invented confidence                                              | [Chat](chat-and-invention.md), S16–S18                                            |
| Inventory inspection and action | Distinguish focus, inspection, selection and execution; make comparison and bulk scope deliberate                                               | [Inventory](inventory.md), S09/S20                                                |

The topic chapters own these principles. This map locates their evidence rather than creating a competing specification. Existing aesthetics, save policy, authority and approved dimensions are not superseded by vendor examples.

## Information hierarchy, layout and system feedback

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

### S07

**Vercel — Web Interface Guidelines and its public repository (accessed October 1, 2026).** [Company guidance](https://vercel.com/design/guidelines) · [pinned README](https://github.com/vercel-labs/web-interface-guidelines/blob/e3d624baaf29dc1fc645aff3e38f03e564d2d6b1/README.md).

Read company/repository guidance; GitHub search resolved the pinned README and its zoom-related passage at `e3d624baaf29dc1fc645aff3e38f03e564d2d6b1`. Useful checks include stable busy controls, native editing, intentional animation, internationalized display and robust layout. Not every imperative transfers: URL state must respect privacy; controlled inputs are appropriate for owned drafts; a sub-500ms mutation target is not a save/AI guarantee. The README's `maximum-scale=1` suggestion conflicts with its own instruction to preserve zoom and is not adopted. Its preferred contrast method does not replace WCAG conformance criteria. This is a reviewed checklist, not a transplanted agent skill.

### S08

**Google — adaptive canonical layouts (accessed October 1, 2026).** [Material overview](https://m3.material.io/foundations/layout/canonical-examples/overview) · [Android adaptive-layout guidance](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts).

List/detail and supporting-pane patterns preserve the selected task across available-space changes. Read the Android page's behavior guidance; Material's overview was available through indexed text while the direct page required JavaScript. Transfer selection/back-navigation continuity to React rather than importing Android APIs, breakpoints or a universal pane ratio. A responsive layout is not a reason to reset a draft.

### S09

**IBM Carbon — Data table guidelines (accessed October 1, 2026).** [Official guidance](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines).

The living page describes structured comparison, toolbar search/filtering and a distinct batch-action mode. It motivates explicit selected scope and avoiding competing per-row operations during a bulk task. Do not turn Carbon's presentation-specific counts into universal menu rules or equate a visual grid with an ARIA grid. The handbook's list-versus-grid decision remains task-driven.

### S10

**IBM Carbon — Notification guidance and accessibility (accessed October 1, 2026).** [Guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/notification/guidelines) · [accessibility](https://www.carbondesignsystem.com/building-blocks/core/components/notification/accessibility).

Distinguish contextual inline feedback, transient notices and actionable persistent information. Use the current component/version's accessibility contract; do not import an older actionable-notice focus behavior into a live game. The transfer is appropriate persistence and an accessible action, not fixed toast lifetimes, universal copy lengths or permission to interrupt the player for every result.

### S13

**Apple Human Interface Guidelines — Searching (accessed October 1, 2026).** [Official guidance](https://developer.apple.com/design/human-interface-guidelines/searching).

The indexed page, including a June 8, 2026 update note, describes locating search according to its importance and clarifying search scope. The direct page was a JavaScript shell; no unseen screenshot/interaction inspection is claimed. Apply discoverable scoped search and careful handling of recent queries, not Apple-specific navigation placement on every game panel.

### S14

**Apple Human Interface Guidelines — Alerts (accessed October 1, 2026).** [Official guidance](https://developer.apple.com/design/human-interface-guidelines/alerts).

Read the substantive indexed guidance: reserve interruption for important actionable information; confirmation is not a substitute for a reversible common operation. Open Legend still requires its existing consequential save/conjure approvals, and undo is offered only where the backend really supports it. No hands-on Apple UI qualification was performed.

## Accessible controls and interaction engineering

### F06

**W3C — Web Content Accessibility Guidelines 2.2.** [Normative recommendation](https://www.w3.org/TR/WCAG22/).

Use the relevant text/non-text contrast, keyboard, focus, resizing and interaction criteria as web-interface baselines. These include qualifications and exceptions; this handbook does not certify the game or substitute for an accessibility audit. Destination: [React accessibility](react.md#accessibility-is-a-behavior-contract).

### F07

**W3C WAI — ARIA Authoring Practices, Combobox Pattern.** [Official pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

A combobox combines a value field with an associated popup and defined keyboard/focus behavior. It is not an arbitrary nesting of two independent controls. Distinguish editable text, selected value and active option. This does not exclude other deliberately designed searchable-picker patterns. Destination: [Controls](controls.md).

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

### S01

**GitHub Primer — SelectPanel accessibility and production component source (accessed October 1, 2026).** [Guidance](https://primer.style/product/components/select-panel/accessibility/) · [source, lines 1–260](https://github.com/primer/react/blob/c4189aa896eaf53b7ce41a71150df10d757732f1/packages/react/src/SelectPanel/SelectPanel.tsx#L1-L260) · [selection/closing, lines 550–790](https://github.com/primer/react/blob/c4189aa896eaf53b7ce41a71150df10d757732f1/packages/react/src/SelectPanel/SelectPanel.tsx#L550-L790).

Living documentation plus the inspected excerpts at commit `c4189aa896eaf53b7ce41a71150df10d757732f1`. The component separates anchor, search, collection, gesture-specific close behavior and modal intermediate selection. It checks a consumer event's cancellation before applying its own selection and distinguishes keyboard focus from selected values. A stable selected-order snapshot avoids repeatedly reshuffling options as the user chooses. Borrow those contracts, not Primer's entire API or its persistence semantics: a selection callback does not itself mean a game command was saved. Experimental SelectPanel2 was found in search but is not the implementation evidence here.

### S02

**GitHub Primer — Tooltip accessibility (accessed October 1, 2026).** [Official guidance](https://primer.style/product/components/tooltip/accessibility/).

Tooltips are supplementary and easily missed across input/assistive modes. The page specifically calls out disabled controls that cannot receive focus. This strengthens the rule that important blockers need another reachable explanation. Preserve Open Legend's plain-text tooltip presentation; the recommendation concerns access and meaning, not importing a visual style.

### S03

**Adobe — Daniel Lu, Building a ComboBox (July 13, 2021).** [Original engineering article](https://react-aria.adobe.com/blog/building-a-combobox).

Historical account covering mobile trays, visual-viewport/keyboard issues, portalled content and assistive navigation. It explains why an anchored desktop popup cannot simply be shrunk for mobile. Use its problem analysis and test cases, not unexamined 2021 workarounds or an assumption that every browser still behaves identically. Relevant owners: Controls, Foundations and React.

### S04

**Adobe React Spectrum — overlay interaction implementation (inspected October 1, 2026).** [Pinned complete file](https://github.com/adobe/react-spectrum/blob/57c56b8cbfa65294fbaed528ab9580ade0d339cb/packages/react-aria/src/overlays/useOverlay.ts).

Inspected at `57c56b8cbfa65294fbaed528ab9580ade0d339cb`. The visible-overlay stack closes only its top entry; outside-interaction start/end and focus movement into a child scope are treated explicitly. This supports child-before-parent dismissal and a single gesture owner. It is evidence about this upstream revision, not proof of the installed package's exact behavior or a reason to duplicate its implementation in Open Legend.

### S05

**Adobe React Spectrum — prop composition implementation (inspected October 1, 2026).** [Pinned complete file](https://github.com/adobe/react-spectrum/blob/57c56b8cbfa65294fbaed528ab9580ade0d339cb/packages/react-aria/src/utils/mergeProps.ts).

This revision chains events, combines classes, reconciles IDs/refs and applies override rules for other properties. The lesson is explicit composition, not generic object spreading or assuming every callback chain stops on cancellation. Ref support and other details must be checked against the local pinned version before use. No upstream code is copied into the game.

### S06

**Radix UI — Composition and Slot (accessed October 1, 2026).** [Composition guide](https://www.radix-ui.com/primitives/docs/guides/composition) · [Slot reference](https://www.radix-ui.com/primitives/docs/utilities/slot).

The guides explain leaf-component prop/ref forwarding and event-handler precedence. They provide a concrete way to review custom wrappers for preserved behavior. They do not justify adding Radix alongside React Aria, prescribing one ref API for every React version, or assuming a library wrapper removes semantic responsibilities.

### S11

**MDN — `aria-disabled` and tooltip semantics (accessed October 1, 2026).** [Disabled-state reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled) · [tooltip role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role).

`aria-disabled` communicates state but does not itself block activation or remove focus. Pointer suppression does not cover keyboard activation. Tooltips do not host interactive controls. These references support the concrete disabled/explanation and interaction contracts; native semantics and server enforcement remain distinct responsibilities.

### S12

**Adobe Spectrum — Close button (accessed October 1, 2026).** [Official component guidance](https://spectrum.adobe.com/page/close-button/).

The neutral dismissal control has separate focus treatment. This is a useful counterexample to interpreting a complaint about default-blue utilities as a ban on accessible focus colors. Keep Open Legend's utility tokens and qualify normal, focused and forced-color states separately.

## React state and performance

### F13

**React — Sharing State Between Components.** [Official documentation](https://react.dev/learn/sharing-state-between-components).

Lift shared state to the appropriate common owner, rather than synchronizing divergent copies. Open Legend extends this distinction to authoritative server data, local drafts and ephemeral interaction state. Destination: [React](react.md).

### F14

**React — Preserving and Resetting State.** [Official documentation](https://react.dev/learn/preserving-and-resetting-state).

Component identity and keys affect state retention. Preserve drafts and selection through ordinary rerenders, and reset intentionally when the owning conversation/entity changes. Nested component definitions can accidentally reset state. Destination: [React](react.md).

### F15

**React — You Might Not Need an Effect.** [Official documentation](https://react.dev/learn/you-might-not-need-an-effect).

Derive display data during rendering when appropriate; put interaction-specific work in event handlers and use Effects for external synchronization. Selection or rendering must not accidentally trigger a consequential mutation. Destination: [React](react.md).

### S15

**Google web.dev — Optimize Interaction to Next Paint (accessed October 1, 2026).** [Engineering guidance](https://web.dev/articles/optimize-inp).

The article distinguishes field and lab diagnosis and defines good INP as no more than 200ms at the 75th percentile of page visits, segmented by device class. This is not a per-operation completion deadline, a camera frame budget or the handbook's proposed local-feedback target. It informs measurement terminology only; no new telemetry, benchmark result or latency guarantee is introduced.

## Agent-product exemplars and human-AI interaction

### A01

**OpenAI — ChatGPT release notes, September 2026 snapshot.** [Official release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes).

September 29 documents editable Pages and interactive plugin panels alongside conversation; September 10 documents source previews beside chat. The transferable pattern is conversation plus an identifiable working object, with source/context and permissions kept explicit. Do not copy rollout-specific behavior or treat sharing a work product as sharing every private conversation. Destination: [Chat and invention](chat-and-invention.md).

### A02

**Anthropic — What are artifacts and how do I use them?, September 2026 snapshot.** [Official help](https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them).

The inspected guide treats artifacts as reusable work products refined through conversation and distinguishes legacy artifacts created before September 16, 2026. Use a stable candidate/version with direct inspection and editing, rather than burying the only usable result in a long transcript. This example does not authorize arbitrary generated code or markup in Open Legend. Destination: [Chat and invention](chat-and-invention.md).

### S16

**Microsoft HAX — capability communication and correction (accessed October 1, 2026).** [Guideline: make capabilities clear](https://www.microsoft.com/en-us/haxtoolkit/guideline/make-clear-what-the-system-can-do/) · [PowerPoint correction example](https://www.microsoft.com/en-us/haxtoolkit/example/copilot-in-powerpoint-g9-rich-and-detailed-edits/).

Explain supported tasks with useful examples and let users correct a useful result selectively rather than restart everything. The Copilot example is historical product evidence, not a claim that its screenshot represents today's product. This informs World Agent onboarding and candidate editing, not technical chatter in NPC dialogue.

### S17

**Google PAIR — Explainability and trust (accessed October 1, 2026).** [Official guidebook chapter](https://pair.withgoogle.com/guidebook-v2/chapter/explainability-trust/).

Design for calibrated reliance rather than maximum trust. Explanations and confidence displays are useful only when users understand them and can make a better decision. The Open Legend synthesis is to expose evidence, limits and actionable correction, not invent a model-confidence percentage or present generated prose as a verified causal trace.

### S18

**OpenAI — Plugin UI guidelines (accessed October 1, 2026).** [Official guide](https://developers.openai.com/plugins/concepts/ui-guidelines).

The display-mode and interaction guidance explains when structured UI improves a conversation's task. A small inline result should not become a nested application with duplicated input/navigation. Larger work can move to an explicit workspace while retaining conversational context. Its card action counts, carousel sizes, fonts and branding rules are host-specific and are not adopted as universal Open Legend rules. The optional SDK UI library is not added.

## Game exemplars

| Reference                              | Relevant strength to study                                              | Caution / what not to copy                                           | Open Legend application                                                          |
| -------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Baldur's Gate 3                        | Contextual inventory actions, party transfer and rich item decisions    | Sorting chores and poorly discovered workflows can remain            | Selected-object detail, clear recipient and comparable facts, not a screen clone |
| Diablo IV, April 2026 update           | Configurable loot filtering and inspection of hidden drops              | A filtering error hides useful objects; rarity alone is not value    | Visible filter state, recoverable hiding and explicit purpose rules              |
| RuneScape                              | Stable bank organization and placeholders                               | Historical bank constraints and account economy are game-specific    | Preserve organization when stock changes                                         |
| Old School RuneScape, 2025 QoL         | Repeatable withdrawal/charge preferences and shortfall feedback         | Consumption must remain deliberate and authorized                    | Named presets with clear resource consequences                                   |
| Final Fantasy XIV, inspected UI guide  | Equipment comparison, gear sets, market search, HUD and camera options  | Jobs, slots, bindings and market rules are not Open Legend's         | Consistent comparisons, reusable configurations and explicit modes               |
| Guild Wars 2, 2025 QoL                 | Consolidating convenience items into a few tools                        | Some objects need meaningful physical existence                      | Remove pointless bookkeeping before adding bag space                             |
| Factorio                               | Spatial search, personal pins and organized alerts                      | Map knowledge and remote capabilities may not suit an embodied actor | Find, orient and retain a reference without gaining hidden knowledge             |
| Riot's League clarity notes            | Readable target/effect boundaries and visual priority                   | Combat rules and aesthetics do not transfer wholesale                | Match graphics to known geometry and attention to consequence                    |
| Blizzard's Classic UI notes, July 2026 | Shared infrastructure, deliberate comparisons and discoverable settings | Shared changes can introduce player-facing regressions               | Qualify other callers; avoid unsolicited comparison clutter                      |

These are task-specific references, not a league table. Modern examples complement durable older patterns. This study does not claim to have audited every subsequent patch or input platform.

### F16

**Microsoft — Xbox Accessibility Guidelines, including UI navigation.** [Guideline family](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines) · [XAG 112: UI navigation](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112) · [Version history](https://learn.microsoft.com/en-us/gaming/accessibility/xag-version-history).

Game UI needs deliberate focus navigation, discoverable controls and suitable input alternatives. Consult relevant text, motion, input or navigation guidance when changing that area. A focusable desktop button alone is not evidence of controller or assistive-device support. These are design resources, not proof that Open Legend passes certification. Destination: [World interaction](world-interaction.md), [React](react.md).

### G01

**Larian — Baldur's Gate 3, Hotfix #21 (March 7, 2024).** [Official notes](https://baldursgate3.game/news/hotfix-21-is-now-live_112).

The notes restore sending items to particular companions in camp from outside camp. The lesson is explicit destination and reducing unnecessary navigation during inventory management. This is a dated example, not a claim that this is the latest BG3 patch. Player discussion P01 adds a counterpoint about sorting and discoverability. Destination: [Inventory](inventory.md).

### G02

**Blizzard — Diablo IV, Prepare for the Reckoning: Lord of Hatred Draws Near (April 2026), and patch 3.0.1a (April 28, 2026).** [Feature announcement](https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near) · [Patch notes](https://news.blizzard.com/en-us/article/24266869/diablo-iv-patch-notes-2-6).

The announcement documents configurable rules for showing/hiding/recoloring ground loot and inspecting filtered items. It distinguishes ground filtering from inventory/stash/vendor display. Subsequent notes fix incorrect filtering of some high-aspect items. Adopt reversible filtering and clear rules; hidden does not mean nonexistent. The patch URL retains an older version label, so dated page content, not the slug, establishes the cited patch. Destination: [Inventory](inventory.md).

### G03

**Jagex — RuneScape, Bank Placeholders & Improvements (September 30, 2019; historical reference).** [Official announcement](https://secure.runescape.com/m=news/bank-placeholders--improvements).

Placeholders preserve an organizing position after withdrawal; related bank improvements make repeat management more predictable. Retain the player's organization without importing RuneScape's slot counts or requiring empty physical objects in the world. Destination: [Inventory](inventory.md).

### G04

**Jagex — Old School RuneScape, Game Jam: Charges & QoL (March 5, 2025).** [Official update](https://secure.runescape.com/m=news/game-jam-charges-qol?oldschool=1).

Documents withdrawal/charge quality-of-life controls and feedback when the desired withdrawal cannot be fulfilled. Presets should expose consumption and explain shortfalls; convenience does not authorize automating a new class of world actions. Destination: [Inventory](inventory.md).

### G05

**Square Enix — Final Fantasy XIV UI Guide (site last-update label September 8, 2026 at inspection).** [Guide](https://na.finalfantasyxiv.com/uiguide/) · [Gear sets](https://na.finalfantasyxiv.com/uiguide/equipment/equipment-gearset/equipment_set.html) · [Comparing equipment](https://na.finalfantasyxiv.com/uiguide/equipment/equipment-compare/equipment_compare.html) · [Market search](https://na.finalfantasyxiv.com/uiguide/item/item-market/market_search.html) · [HUD layout](https://na.finalfantasyxiv.com/uiguide/know/know-hud/hud-layout.html) · [Legacy camera configuration](https://na.finalfantasyxiv.com/uiguide/faq/faq-other/setting_legacy.html).

Targeted pages show side-by-side equipment comparison, saved choices, market filtering and configurable HUD organization. The camera page distinguishes movement-relative automatic camera behavior from disabling automatic pivot. Borrow predictable modes and explicit configuration; retain Open Legend's camera meanings and authority. The site's update label does not prove every subpage changed then. Destinations: [Inventory](inventory.md), [World interaction](world-interaction.md).

### G06

**ArenaNet — Quality-of-Life Improvements in Janthir Wilds: Absolution (May 29, 2025, for the June 3 update).** [Official article](https://www.guildwars2.com/en/news/quality-of-life-improvements-in-janthir-wilds-absolution/).

The update consolidates travel and exchange convenience items into fewer tools. This reduces bookkeeping objects rather than merely enlarging capacity. Preserve physical tools/resources where Open Legend's world design requires them. Destination: [Inventory](inventory.md).

### G07

**Wube — Factorio Friday Facts #400, Chart search and pins (March 1, 2024).** [Original developer article](https://factorio.com/blog/post/fff-400).

Describes spatial search, personal pins and organized alerts; search scope deliberately avoids some overly broad contents searches. Transfer finding, orienting and retaining a reference, not omniscient map access or remote actions for an embodied character. Destination: [World interaction](world-interaction.md).

### S19

**Riot Games — Clarity in League (March 12, 2021).** [Original developer article](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/).

Historical rationale connects meaningful silhouettes, effect readability and visual priority to gameplay decisions. Transfer legibility of known target/effect boundaries and consequence-weighted attention, not League's combat model or aesthetic. Visual precision must not imply extra knowledge or guaranteed outcomes in Open Legend.

### S20

**Blizzard — User Interface Updates in Classic, staff posts July 10 and July 17, 2026.** [Initial staff explanation](https://us.forums.blizzard.com/en/wow/t/user-interface-updates-in-classic/2325408) · [follow-up fixes](https://us.forums.blizzard.com/en/wow/t/user-interface-updates-in-classic/2325408/59).

Official posts discuss shared modern UI infrastructure, player-facing regressions, native settings replacing temporary scripts, and restoring deliberate rather than always-on equipment comparison. Staff statements are distinct from player replies. Inspect other callers after shared-component changes, make settings discoverable and avoid unsolicited comparisons obscuring the task. A modifier-key shortcut cannot be the sole accessible comparison method.

## Original player feedback

### P01

**Baldur's Gate 3 Steam community — too many useless items (April 30, 2025).** [Original discussion](https://steamcommunity.com/app/1086940/discussions/0/600777204942523998/).

The original poster reports inventory/sorting fatigue. Replies disagree and point to wares, sorting, bags and selective looting. This establishes friction and existing workarounds, not unanimous dissatisfaction. Ask whether purpose and bulk-management tools are discoverable without coaching. Self-reported sorting time is not a benchmark.

Access note: original discussion text was available in indexed retrieval; direct rendering returned a Steam community shell. Do not infer additional unseen replies from that shell. Destination: [Inventory](inventory.md).

### P02

**Guild Wars 2 Steam community — Inventory is always too full and transmogs are ugly (August 5, 2025).** [Original discussion](https://steamcommunity.com/app/1284210/discussions/0/594030422158175317/).

Players describe difficulty judging item purpose and recurring management; replies describe deposit, sell and salvage workflows that help them. Reveal useful bulk actions and consequences instead of assuming economy knowledge. This thread establishes neither prevalence nor a monetization motive. Destination: [Inventory](inventory.md).

## Game interface screenshot atlas

The [game atlas](games/README.md) and [continuous image gallery](screenshots/gallery.md) add **71 distinct digital UI screenshots across 12 games**, plus one display photograph explicitly excluded from that count. Every image is embedded in a game dossier with visible controls/layout, documented workflow, strengths, weaknesses and a concrete Open Legend application. [The verified index](screenshots/index.json) links per-game provenance manifests; each records source page and image URLs, exact file identity, inspection and version/platform knowledge. Publisher composites count once. Source crops and developer previews are labeled; Open Legend wireframes are excluded.

This is an extension of this one maintained research ledger. The topic chapters own lasting guidance; the dossiers are image-level supporting evidence, not parallel policy documents. Research includes original developer guidance, manuals, primary player discussions/reviews, firsthand guides and screenshot sources, with each source's role disclosed. No representative survey, current-patch completeness or hands-on playtest is claimed.

### GI01 — Baldur's Gate 3

[Twelve-image dossier](games/baldurs-gate-3.md): individual/party/controller inventory, context actions, the paired Traveller's Chest, comparison, Throw, alchemy, dye, trade and dialogue. [Larian's controller explanation](https://blog.playstation.com/?p=383943&sf268739969=1) supplies input-design rationale; [Patch 6](https://baldursgate3.game/news/patch-6-now-live_108) and [Patch 7](https://baldursgate3.game/news/patch-7-now-live_121) bound historical screenshots. Original player/reviewer evidence includes controller praise, equipped-item mistakes and competing preferences about organization. Adopt explicit object context and focused missing choices; avoid weak equipped markers, large overlapping paper dolls and uncontrolled radial growth.

### GI02 — Divinity: Original Sin 2

[Four-image dossier](games/divinity-original-sin-2.md): chest, staged barter, controller inventory and organization/crafting. The [official Xbox-hosted manual](https://dlassets-ssl.xboxlive.com/public/content/6778dff3-8d6c-4615-a8a3-1f1770057d09/GameManual/9e540603-b9bb-44a0-83cd-bb98f1d40b32/en-US/index.html) and original player discussions inform input behavior. The alpha barter image and optional Improved Organization gift bag are prominently identified. Slot-first compatible equipment selection supplies specific positive player evidence; category bags also demonstrate how organization can create extra extraction chores.

### GI03 — Minecraft

[Six-image dossier](games/minecraft.md): carried inventory versus catalog, recipe book, crafting grid, large chest, furnace and trade. [Mojang's crafting guide](https://www.minecraft.net/en-us/article/how-craft) supplies actual guide images and [villager design interview](https://www.minecraft.net/en-us/article/meet-villagers) explains trade presentation. Preserve distinctions between Creative catalog and owned objects, Java/Bedrock and visible controller glyphs. The selected chest/station supplies the task; a compact input/output arrangement can show meaningful material decisions without a generic action form.

### GI04 — Valheim

[Seven-image dossier](games/valheim.md): workbench, repair, cart storage, building, controller focus and help. [Iron Gate's 2023 announcements](https://store.steampowered.com/news/posts/?appids=892970&enddate=1693393302&feed=steam_community_announcements) document a quick-stack revision following player reaction, with direct input and visible transferred-inventory feedback. Original player discussions distinguish native behavior from mods. Learn station-led choice and visible results; the easily missed repair hammer is a discoverability counterexample.

### GI05 — Terraria

[Eight-image dossier](games/terraria.md): named storage, bulk verbs, nearby quick-stack, recipe inquiry, rename, shop tooltip, NPC conversation and contextual controller prompts. [Re-Logic/DR Studios' May 2024 announcements](https://store.steampowered.com/news/posts/?appids=105600&enddate=1717286400&feed=steam_community_announcements) explicitly explain why controls should appear near their task; two associated images are labeled WIP. Optional nearby convenience is different from mandatory destination selection. Borrow intelligible verbs and matching-item chore reduction only with explicit native scope and consequences.

### GI06 — Factorio

[Six-image dossier](games/factorio.md): consistent player/object placement, a storage GUI, stable quickbar, readable machine status, recipe notifications and optional icon naming. [FFF-363](https://www.factorio.com/blog/post/fff-363) documents unifying inventory/object sides and removing disruptive tab nesting; [FFF-278](https://www.factorio.com/blog/post/fff-278) explains quickbar direction. Original forum responses praise stable slots and counts while raising discoverability questions. Historical previews are not represented as today's complete UI. Adopt stable task placement and visible reasons; don't import automation-game complexity into an ordinary chest.

### GI07 — Stardew Valley

[Four digital screenshots and one excluded display photograph](games/stardew-valley.md): standard/big chest, equipment, crafting and recipe reference. Original forum screenshots and first-person reports include matching-stack praise, hidden shortcuts, replacement problems and tooltip overflow. One image-search result called the Collections → Cooking screen a cooking interface; the dossier corrects it. The [workbench](https://wiki.stardewvalley.net/Workbench) and [cooking](https://wiki.stardewvalley.net/Cooking) references inform declared station supply scope. Keep ordinary transfer direct and restrictions visible.

### GI08 — Project Zomboid

[Six-image dossier](games/project-zomboid.md): physical loot target, timed handling, station crafting, building and detailed fluid operations. [The developer's inventory rationale](https://projectzomboid.com/blog/news/2012/09/zomboid-ui-explained-badly/) separates meaningful packing time from interface inconvenience; [Liquid Zedball](https://projectzomboid.com/blog/news/2022/07/liquid-zedball/) retains quick ordinary actions alongside detailed fluid control. A firsthand player praises its unobtrusive inventory while others want clearer organization. Prototypes/developer-only-looking controls are qualified. Learn object context and explicit time costs, not accidental friction or debug-form controls.

### GI09 — Final Fantasy XIV

[Six-image dossier](games/final-fantasy-xiv.md): full controller HUD, inventory variants, item context commands, crafting and chat. The [official UI guide](https://na.finalfantasyxiv.com/uiguide/) documents controls; a [2021 original forum discussion](https://forum.square-enix.com/ffxiv/threads/446902) contains specific praise for customization alongside disagreement about crowded frames. Separate reading filters from message audience. Adopt clear destination and persistent input with usable defaults; customization does not excuse a confusing default.

### GI10 — Guild Wars 2

[Five-image dossier](games/guild-wars-2.md): inventory, trading post, wallet, crafting discovery and a populated bank with carried items beside storage. The [official new-player guide](https://www.guildwars2.com/en/new-player-guide/) and a [firsthand tested player guide](https://www.gaisciochmagazine.com/guides/new_adventures_in_gw2.html) establish their distinct source roles. Original praise for convenience is paired with protected-bag confusion. Account services and remote-access items differ from physical-world chests. Borrow readable paired transfer and visible exceptions without granting global or hidden access. A dedicated saved GW2 chat screenshot is absent; FFXIV provides the inspected chat counterpart.

### GI11 — World of Warcraft

[Three-image dossier](games/world-of-warcraft.md): a publisher-composed separate/combined bag comparison, full HUD editor and individual-frame settings. The [2022 Dragonflight preview](https://worldofwarcraft.blizzard.com/en-us/news/23841481) is explicitly historical. [Original player feedback](https://us.forums.blizzard.com/en/wow/t/thank-you-for-the-consolidate-bags-option/1380103) praises consolidation and also reports panel obstruction during item movement. Use one coherent carried view while retaining meaningful bag restrictions; settings forms belong in deliberate configuration, not routine item use.

### GI12 — Disco Elysium

[Four-image dossier](games/disco-elysium.md): dialogue/consequences, contextual checks, Thought Cabinet and equipment. [Developer media](https://discoelysium.com/media), [Thought Cabinet explanation](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet) and first-person reviews distinguish visual identity from control quality. The [PS5 launch accessibility review](https://caniplaythat.com/2021/03/31/disco-elysium-the-final-cut-can-i-play-that-accessibility-review/) reports unclear reach and unstable selection. Adopt speaker continuity and visible consequences; do not copy unpermitted inner thoughts, scripted-only dialogue or exact probabilities without native knowledge.

### Open Legend application and evidence boundary

The [current-interface audit](current-interface-audit.md) is pinned to `b50ec6ce75f260d68c18ec99d767982c65b0fccb` and explains the collection/detail-to-picker switch, missing world-object entry, repeated amount/destination workflow and schema-driven activities. It separates the authored 1.6m handling rule from the displayed position distance and preserves native access/consent boundaries. This is source evidence, not a reproduced running-game test.

Mike explicitly requested object-opened grids and ordinary play without execution forms. That direction supersedes the routine chooser/review recommendation in the affected handbook chapters and UI brief. The [feature specification](../projects/game-interaction-redesign-feature-spec.md) specifies sixteen integrated journeys; the [technical design](../projects/game-interaction-redesign-tech-design.md) retains native ownership and scoped reads; [four original wireframes](wireframes/README.md) illustrate the layouts. [UIUX07–UIUX11](../maintainers/ui-ux.md#uiux07) separates completed research, the branch implementation and open gameplay acceptance. The [verification report](../verification/game-interaction-redesign.md) records actual runtime checks and their limits. No copied screenshot becomes a production asset, and no reference game's rule silently becomes an Open Legend world law.

## Synthesis and evidence limits

The shared lesson is to make the object, scope, next action and consequential state legible, preserve working context and remove repetitive management with no gameplay purpose. Composite controls, focus and transaction integrity need explicit behavior contracts, not visual intuition alone. The handbook's quantitative ranges in [UXL01–05](../limits/ui-ux.md) remain Open Legend proposals; attributed WCAG thresholds retain their qualifications. No cited company endorses our particular values.

Primer was read in the specified excerpts; Adobe's two named implementation files were read completely. Vercel's guideline text and pinned identity were inspected, not its runtime implementation. These snapshots may be newer than the local lockfile. That original handbook source study installed or copied no vendor package, skill, test or asset; the later game atlas saves third-party reference screenshots as explicitly attributed research evidence.

In the original September 30–October 1 handbook research, most pages were read as parsed text; Apple, Material and Steam access limits are recorded individually. The later game atlas additionally downloads and visually inspects its actual image files. Coverage is not hands-on comparative play, live ChatGPT/Claude product testing, every component body, every patch or a representative player sample. Official guide images are references, not licensed game assets. Recheck living sources when a version-sensitive claim or dependency API changes; ordinary UI edits need not reread every source.

No game/browser, assistive-technology, native agent-dispatch or user study was run for this research. Tooling evidence and open checks belong in [verification](verification.md) and [UIUX06](../maintainers/ui-ux.md#uiux06). Research refines requirements; it does not certify present conformance or authorize every described enhancement.

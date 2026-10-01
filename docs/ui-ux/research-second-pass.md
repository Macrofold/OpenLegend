# Second research pass: authoritative patterns and engineering evidence

[Handbook](README.md) · [First-pass ledger](research.md) · [Verification](verification.md)

**Accessed October 1, 2026.** Reviewed the handbook at `e8d6c8950cadd715cfed97df4a0e379ff1593d02`, on PR #26's `docs/ui-ux-principles` branch. Its target, `Macrofold/OpenLegend/main`, remained `0382be76648879cf8a8397ad6c3534b4431916f5` when refreshed. This pass seeks counterexamples and missing engineering detail, not endorsements based on company reputation alone.

The sources below are new pages, publications or implementation files relative to the first ledger. Adobe, Google and Microsoft recur as organizations, but their selected material is different. Official product guidance, historical engineering explanations and implementation observations have different evidential weight. No comparative hands-on product study, runtime code change or claim that every cited system is best in class is made.

## Critique and disposition

| First-pass weakness | Correction in the canonical chapter | Evidence |
| --- | --- | --- |
| Core wording implied every searchable choice must be a combobox | Permit editable comboboxes and deliberately opened searchable pickers; prohibit invalid nested interactive elements, not the second workflow | [Controls](controls.md#a-combobox-is-one-composite-control), S01 |
| Focus/hover help did not account for native disabled controls | Require a reachable explanation; use focusable `aria-disabled` only with intentional activation guards | [Controls](controls.md#disabled-controls-and-reachable-explanations), S02/S11 |
| “No blue” could be misread as overriding accessibility colors | Neutral utility role remains; preserve deliberate focus/forced-color treatment | [Controls](controls.md#clear-x-explicit-quiet-and-singular), S12 |
| Modal-first ordering could let a parent consume a child's Escape | A modal bounds eligible interaction; the active child handles its gesture before the parent | [World](world-interaction.md#one-owner-for-each-gesture), S04 |
| Responsive guidance emphasized fitting boxes more than preserving the task | Keep selection, draft, filters and reading anchor across list/detail and supporting-pane changes | [Foundations](foundations.md), S03/S08 |
| Reuse guidance lacked a concrete behavior-preservation contract | Check prop/ref forwarding, handler merge/ordering, cancellation, identity and installed-version behavior | [React](react.md#component-composition-must-preserve-behavior), S01/S05/S06 |
| Persistence, loading and quantitative targets needed more qualification | Classify URL/draft/server state; separate immediate feedback, actual completion and field INP | [System feedback](system-feedback.md), [UXL05](../limits/ui-ux.md#uxl05), S07/S15 |
| Agent UX emphasized status but underdeveloped correction and calibrated trust | Show supported tasks and evidence, allow targeted edits, avoid invented confidence or misleading causal explanations | [Chat](chat-and-invention.md), S16–S18 |
| Advanced inventories needed clearer row/bulk and inspection semantics | Distinguish focus, selection and action; show deliberate comparison and bulk scope | [Inventory](inventory.md), S09/S20 |

The core remains a short task entrypoint. Detailed rules live in their existing chapters; neither research ledger is required on ordinary UI tasks. Existing aesthetics, save policy, authority, approved panel sizes and gameplay contracts are not superseded by vendor examples.

## Sources and bounded takeaways

### S01

**GitHub Primer — SelectPanel accessibility and production component source.** [Guidance](https://primer.style/product/components/select-panel/accessibility/) · [source, lines 1–260](https://github.com/primer/react/blob/c4189aa896eaf53b7ce41a71150df10d757732f1/packages/react/src/SelectPanel/SelectPanel.tsx#L1-L260) · [selection/closing, lines 550–790](https://github.com/primer/react/blob/c4189aa896eaf53b7ce41a71150df10d757732f1/packages/react/src/SelectPanel/SelectPanel.tsx#L550-L790).

Living documentation plus the inspected excerpts at commit `c4189aa896eaf53b7ce41a71150df10d757732f1`. The component separates anchor, search, collection, gesture-specific close behavior and modal intermediate selection. It checks a consumer event's cancellation before applying its own selection and distinguishes keyboard focus from selected values. A stable selected-order snapshot avoids repeatedly reshuffling options as the user chooses. Borrow those contracts, not Primer's entire API or its persistence semantics: a selection callback does not itself mean a game command was saved. Experimental SelectPanel2 was found in search but is not the implementation evidence here.

### S02

**GitHub Primer — Tooltip accessibility.** [Official guidance](https://primer.style/product/components/tooltip/accessibility/).

Tooltips are supplementary and easily missed across input/assistive modes. The page specifically calls out disabled controls that cannot receive focus. This strengthens the rule that important blockers need another reachable explanation. Preserve Open Legend's plain-text tooltip presentation; the recommendation concerns access and meaning, not importing a visual style.

### S03

**Adobe — Daniel Lu, Building a ComboBox (July 13, 2021).** [Original engineering article](https://react-aria.adobe.com/blog/building-a-combobox).

Historical account covering mobile trays, visual-viewport/keyboard issues, portalled content and assistive navigation. It explains why an anchored desktop popup cannot simply be shrunk for mobile. Use its problem analysis and test cases, not unexamined 2021 workarounds or an assumption that every browser still behaves identically. Relevant owners: Controls, Foundations and React.

### S04

**Adobe React Spectrum — overlay interaction implementation.** [Pinned complete file](https://github.com/adobe/react-spectrum/blob/57c56b8cbfa65294fbaed528ab9580ade0d339cb/packages/react-aria/src/overlays/useOverlay.ts).

Inspected at `57c56b8cbfa65294fbaed528ab9580ade0d339cb`. The visible-overlay stack closes only its top entry; outside-interaction start/end and focus movement into a child scope are treated explicitly. This supports child-before-parent dismissal and a single gesture owner. It is evidence about this upstream revision, not proof of the installed package's exact behavior or a reason to duplicate its implementation in Open Legend.

### S05

**Adobe React Spectrum — prop composition implementation.** [Pinned complete file](https://github.com/adobe/react-spectrum/blob/57c56b8cbfa65294fbaed528ab9580ade0d339cb/packages/react-aria/src/utils/mergeProps.ts).

This revision chains events, combines classes, reconciles IDs/refs and applies override rules for other properties. The lesson is explicit composition, not generic object spreading or assuming every callback chain stops on cancellation. Ref support and other details must be checked against the local pinned version before use. No upstream code is copied into the game.

### S06

**Radix UI — Composition and Slot.** [Composition guide](https://www.radix-ui.com/primitives/docs/guides/composition) · [Slot reference](https://www.radix-ui.com/primitives/docs/utilities/slot).

The guides explain leaf-component prop/ref forwarding and event-handler precedence. They provide a concrete way to review custom wrappers for preserved behavior. They do not justify adding Radix alongside React Aria, prescribing one ref API for every React version, or assuming a library wrapper removes semantic responsibilities.

### S07

**Vercel — Web Interface Guidelines and its public repository.** [Company guidance](https://vercel.com/design/guidelines) · [pinned README](https://github.com/vercel-labs/web-interface-guidelines/blob/e3d624baaf29dc1fc645aff3e38f03e564d2d6b1/README.md).

Read company/repository guidance; GitHub search resolved the pinned README and its zoom-related passage at `e3d624baaf29dc1fc645aff3e38f03e564d2d6b1`. Useful checks include stable busy controls, native editing, intentional animation, internationalized display and robust layout. Not every imperative transfers: URL state must respect privacy; controlled inputs are appropriate for owned drafts; a sub-500ms mutation target is not a save/AI guarantee. The README's `maximum-scale=1` suggestion conflicts with its own instruction to preserve zoom and is not adopted. Its preferred contrast method does not replace WCAG conformance criteria. This is a reviewed checklist, not a transplanted agent skill.

### S08

**Google — adaptive canonical layouts.** [Material overview](https://m3.material.io/foundations/layout/canonical-examples/overview) · [Android adaptive-layout guidance](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts).

List/detail and supporting-pane patterns preserve the selected task across available-space changes. Read the Android page's behavior guidance; Material's overview was available through indexed text while the direct page required JavaScript. Transfer selection/back-navigation continuity to React rather than importing Android APIs, breakpoints or a universal pane ratio. A responsive layout is not a reason to reset a draft.

### S09

**IBM Carbon — Data table guidelines.** [Official guidance](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines).

The living page describes structured comparison, toolbar search/filtering and a distinct batch-action mode. It motivates explicit selected scope and avoiding competing per-row operations during a bulk task. Do not turn Carbon's presentation-specific counts into universal menu rules or equate a visual grid with an ARIA grid. The handbook's list-versus-grid decision remains task-driven.

### S10

**IBM Carbon — Notification guidance and accessibility.** [Guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/notification/guidelines) · [accessibility](https://www.carbondesignsystem.com/building-blocks/core/components/notification/accessibility).

Distinguish contextual inline feedback, transient notices and actionable persistent information. Use the current component/version's accessibility contract; do not import an older actionable-notice focus behavior into a live game. The transfer is appropriate persistence and an accessible action, not fixed toast lifetimes, universal copy lengths or permission to interrupt the player for every result.

### S11

**MDN — `aria-disabled` and tooltip semantics.** [Disabled-state reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled) · [tooltip role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role).

`aria-disabled` communicates state but does not itself block activation or remove focus. Pointer suppression does not cover keyboard activation. Tooltips do not host interactive controls. These references support the concrete disabled/explanation and interaction contracts; native semantics and server enforcement remain distinct responsibilities.

### S12

**Adobe Spectrum — Close button.** [Official component guidance](https://spectrum.adobe.com/page/close-button/).

The neutral dismissal control has separate focus treatment. This is a useful counterexample to interpreting a complaint about default-blue utilities as a ban on accessible focus colors. Keep Open Legend's utility tokens and qualify normal, focused and forced-color states separately.

### S13

**Apple Human Interface Guidelines — Searching.** [Official guidance](https://developer.apple.com/design/human-interface-guidelines/searching).

The indexed page, including a June 8, 2026 update note, describes locating search according to its importance and clarifying search scope. The direct page was a JavaScript shell; no unseen screenshot/interaction inspection is claimed. Apply discoverable scoped search and careful handling of recent queries, not Apple-specific navigation placement on every game panel.

### S14

**Apple Human Interface Guidelines — Alerts.** [Official guidance](https://developer.apple.com/design/human-interface-guidelines/alerts).

Read the substantive indexed guidance: reserve interruption for important actionable information; confirmation is not a substitute for a reversible common operation. Open Legend still requires its existing consequential save/conjure approvals, and undo is offered only where the backend really supports it. No hands-on Apple UI qualification was performed.

### S15

**Google web.dev — Optimize Interaction to Next Paint.** [Engineering guidance](https://web.dev/articles/optimize-inp).

The article distinguishes field and lab diagnosis and defines good INP as no more than 200ms at the 75th percentile of page visits, segmented by device class. This is not a per-operation completion deadline, a camera frame budget or the handbook's proposed local-feedback target. It informs measurement terminology only; no new telemetry, benchmark result or latency guarantee is introduced.

### S16

**Microsoft HAX — capability communication and correction.** [Guideline: make capabilities clear](https://www.microsoft.com/en-us/haxtoolkit/guideline/make-clear-what-the-system-can-do/) · [PowerPoint correction example](https://www.microsoft.com/en-us/haxtoolkit/example/copilot-in-powerpoint-g9-rich-and-detailed-edits/).

Explain supported tasks with useful examples and let users correct a useful result selectively rather than restart everything. The Copilot example is historical product evidence, not a claim that its screenshot represents today's product. This informs World Agent onboarding and candidate editing, not technical chatter in NPC dialogue.

### S17

**Google PAIR — Explainability and trust.** [Official guidebook chapter](https://pair.withgoogle.com/guidebook-v2/chapter/explainability-trust/).

Design for calibrated reliance rather than maximum trust. Explanations and confidence displays are useful only when users understand them and can make a better decision. The Open Legend synthesis is to expose evidence, limits and actionable correction, not invent a model-confidence percentage or present generated prose as a verified causal trace.

### S18

**OpenAI — Plugin UI guidelines.** [Official guide](https://developers.openai.com/plugins/concepts/ui-guidelines).

Read the display-mode and interaction guidance, not merely release notes. Structured UI is useful when it improves the conversation's task; a small inline result should not become a nested application with duplicated input/navigation. Larger work can move to an explicit workspace while retaining conversational context. Its card action counts, carousel sizes, fonts and branding rules are host-specific and are not adopted as universal Open Legend rules. The optional SDK UI library is not added.

### S19

**Riot Games — Clarity in League (March 12, 2021).** [Original developer article](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/).

Historical design rationale connects meaningful silhouettes, effect readability and visual priority to gameplay decisions. Transfer legibility of known target/effect boundaries and consequence-weighted attention, not League's combat model or aesthetic. Visual precision must not imply extra knowledge or guaranteed outcomes in Open Legend.

### S20

**Blizzard — User Interface Updates in Classic, staff posts July 10 and July 17, 2026.** [Initial staff explanation](https://us.forums.blizzard.com/en/wow/t/user-interface-updates-in-classic/2325408) · [follow-up fixes](https://us.forums.blizzard.com/en/wow/t/user-interface-updates-in-classic/2325408/59).

The official posts discuss shared modern UI infrastructure, player-facing regressions, native settings replacing temporary script workarounds, and restoring deliberate rather than always-on equipment comparison. Read the staff statements separately from player replies. Lessons: inspect the blast radius of shared-component changes, make settings discoverable, and avoid unsolicited comparisons obscuring the task. Do not copy a modifier-key-only route as the sole accessible comparison method.

## Evidence and applicability limits

Repository observations are pinned above. Primer was read in specified excerpts; Adobe's two named implementation files were read completely. Vercel's public guideline text was read with its pinned repository identity checked; this is not a runtime implementation audit. These snapshots may be newer than Open Legend's lockfile. No packages, vendor skills, tests or reference assets were installed or copied.

Most web pages were read as parsed text; Apple and Material limitations are stated individually. Company authority supports attribution, not universal correctness. Historical examples are labeled; retrieval dates are not publication dates. The old ledger remains the first-pass record. Current principles live in the chapters and quantitative choices in the tuning inventory, not in this research appendix.

No game/browser, screen-reader, native agent-dispatch or user study was run. Tooling evidence and outstanding checks remain in [verification](verification.md) and [UIUX06](../maintainers/ui-ux.md#uiux06). Research refines requirements; it does not certify present conformance or authorize implementing every possible enhancement.

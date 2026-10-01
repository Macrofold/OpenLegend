# Open Legend interaction-design handbook

A practical standard for deciding what the player sees, how controls behave and how React implements them. This is not an aesthetic replacement, a gallery of screens to copy, or a claim that the current game passes every rule.

**Research snapshot:** 2026-09-30. **Repository baseline:** `0382be76648879cf8a8397ad6c3534b4431916f5` on `Macrofold/OpenLegend/main`. This pass inspected the current UI structure, selected implementation owners and existing specifications, then researched official design systems, accessibility guidance, current product documentation, selected game updates and firsthand player discussions. It did not run the game or conduct a usability study.

## Start here, not everywhere

Every UI/UX or frontend task loads the short [essential rules](../../.agents/rules/ui-ux.md). Read only the relevant chapters below. A spacing correction does not require reading trading or the research ledger; an inventory search change normally needs Controls, Inventory and the relevant React section.

| Decision | Chapter |
| --- | --- |
| How much information, what hierarchy, what size and spacing, how to arrange controls? | [Foundations and layout](foundations.md) |
| Which input, when an accordion/tab/modal, how a typeahead works without duplicate controls? | [Controls and overlays](controls.md) |
| How to find, inspect, equip, compare, move, manage and trade many objects? | [Inventory and trading](inventory.md) |
| How to navigate the world and camera without accidental actions or obstructing play? | [World interaction](world-interaction.md) |
| How to converse, retain drafts, show AI work and refine inventions? | [Chat and invention](chat-and-invention.md) |
| How search, notices, settings, saves and recovery communicate clearly? | [System feedback](system-feedback.md) |
| How to compose components, own state, arbitrate events and preserve accessibility? | [React implementation](react.md) |
| What to inspect and exercise before saying the UI works? | [Verification and current-surface audit](verification.md) |
| Which companies/games informed this, what did players actually report, and how current is it? | [Research and exemplar ledger](research.md) |

## Authority and interpretation

**Rules** are prospective design and implementation guardrails for in-scope work. Existing violations are not automatically fixed by documenting the rule. **Starting values** are explicitly identified tuning proposals, not scientific optima, accessibility certifications or new runtime limits. **Future patterns** describe how a capability should behave when separately selected for implementation; they do not claim that advanced trading, loadouts or other proposed features already exist.

The [UI design brief](../ui-design-brief.md) owns accepted presentation and interaction behavior; the [production design-system guide](../../apps/client/src/design-system/README.md) records its implementation and explicit product adaptations. The [world-presentation](../world-presentation.md), [spatial-world](../spatial-world.md), [save/load](../save-and-load.md), [timed UI](../timed-ui.md), [hearing](../hearing-and-speech.md), [narration](../narration-and-conversations.md) and engine/authority owners remain controlling for their semantics. This handbook owns cross-cutting decision methods, not a competing copy of those contracts.

In particular, preserve the current 4px spacing system, 336px ordinary and 504px conversation/agent panel adaptations, 32px compact close/new controls, plain text tooltips, existing primary-action treatment, current camera meanings and restrained in-world chat statuses unless an authorized change explicitly revisits them. A larger preferred touch target is not permission to silently change an owner-approved desktop layout. Conversely, a current size is not proof of accessibility: test and record the gap.

When guidance conflicts, retain the explicit current requirement, identify the conflict, and propose the smallest deliberate correction in its owner. Never quietly weaken a requirement to excuse a defect. Root privacy, authority, spending and [development save policy](../../AGENTS.md#development-save-policy) are not tunable UX preferences.

## Quantitative guidance without false precision

Use measurable fit, target size, information coverage, task completion and state-transition criteria. Do not justify a design with a universal golden ratio, seven-item limit, three-click rule or an uncited claim about what every player prefers.

New display-only starting values are catalogued with scope and tradeoffs in [UX tuning inventory](../limits/ui-ux.md). Existing implemented caps and historical values remain in [interface limits](../limits/interface.md), [object limits](../limits/objects.md) and their feature owners. A test fixture containing 1,000 items is not a new inventory cap. A popup showing eight rows does not mean only eight results are searchable.

## Decision record: 2026-09-30

Mike requested reusable, research-backed interaction principles and selective agent loading. This handbook adopts a task-first decision process, coherent composite controls, semantic component reuse, explicit input ownership and evidence-based verification. It supplements rather than replaces the existing aesthetic and gameplay contracts. Root and client guidance route to one short rule body; detailed chapters and research remain conditional.

This change documents requirements and future patterns only. No game behavior, dependency, save format, camera binding, provider permission or paid-work policy changes. Browser reproduction of reported control problems, numerical tuning and cross-agent loading verification remain open in [UI/UX follow-through](../maintainers/ui-ux.md); existing subsystem trackers retain implementation ownership.

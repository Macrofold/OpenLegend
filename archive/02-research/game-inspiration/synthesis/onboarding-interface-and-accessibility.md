# Onboarding, interface and accessibility

**Status: Partial synthesis. Topic: UX.** Rust's scoped evidence is incorporated; broader game/world comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md)

## Scope and questions

How can players discover and use the game's depth without having to study its implementation?

- Compare first-session goals, teaching through play, tutorials, progressive disclosure, tooltips and causal feedback.
- How do interfaces support complex inventories, groups and worlds without hiding essential choices?
- Compare input, readability, disability access, cognitive load and error recovery while preserving desired challenge.

## Ownership boundary

Owns learning and usable interaction. Expressive audiovisual identity belongs to PRESENT and in-world unknowns to KNOW. This is research, not an approved OpenLegend specification.

## Candidate reading routes — not assessed

[Dwarf Fortress](../dossiers/dwarf-fortress.md) · [Factorio](../dossiers/factorio.md) · [Baldur's Gate 3](../dossiers/baldurs-gate-3.md). Candidates are not an exhaustive relevance decision or evidence of incorporation.

## Desired experiences and contrasting approaches

The interface should help someone choose and perform a meaningful action, recognize the result and recover from a mistake. Direct manipulation, explicit menus and contextual commands have different strengths. A deliberately uncertain fictional world still needs reliable controls and truthful system feedback; uncertainty about another character is not the same as uncertainty about whether a click worked.

## Cross-game evidence and counterexamples

[Rust's UI analysis](../dossiers/rust.md#rust-ux) and [48-asset atlas](../dossiers/rust-visual-atlas.md) separate inspected screen layouts from inferred interaction quality. Contextual verbs, upkeep horizons, server filters and search are useful observations. The atlas also identifies mislabeled/reused imagery and missing current inventory/building sequences. This is one scoped case; no cross-game accessibility ranking or hands-on performance result is implied.

## Consolidated lessons and tradeoffs

<a id="ux-l001"></a>

### Preserve desired challenge while removing manipulation burden

Snapping, understandable destinations, contextual verbs and reliable repeated actions can make interaction easier without selecting a strategy for the player. Explain actionable blockers and costs rather than expose implementation fields indiscriminately. A shortcut that is undiscoverable, a color-only refusal or a label that overstates protection can undermine that convenience. Compare simpler controls as well as more elaborate assistance.

<a id="ux-l002"></a>

### Show the decision horizon and the actual transaction state

Translate relevant stock, timing and consequences into something a person can act on. Distinguish a preview, an accepted action, its visible animation and its completed result. For joining/loading, separate discovery, admission, preparation, readiness and failure. For building, distinguish maintenance time from damage protection. A progress animation or an attractive screenshot is not evidence that the underlying operation succeeded.

## Current OpenLegend baseline and existing design owners

Use the [source and goal map](source-and-goal-map.md#topic-ux) to locate relevant research, current contracts and existing designs. Record delivered scope, designed-but-unimplemented scope and genuinely new questions separately; linked documents are not a fresh runtime audit.

## Complete situations and cross-topic consequences

**Constructed comparison:** a player tries to extend a shelter. The interface previews the intended result, explains a specific missing condition, preserves the attempted placement while the player resolves it, and confirms the actual outcome. The player then discovers the changed upkeep or use consequence. Contrast this with a warning that merely turns red and forces repeated guessing. The fictional challenge can remain finding materials or choosing a layout; the interface should not add unexplained refusal as a second challenge.

## Possible OpenLegend applications and limits

Use these research questions with existing UI owners rather than creating a Rust-themed design system. Evaluate real task transitions, including cancellation and full/error states. Do not infer accessibility from a library, a settings tab or a captured frame.

## Open questions and missing evidence

Capture complete ordinary and failure workflows with version, role and input method recorded. Test keyboard, reading/contrast needs and recovery where applicable. Rust's atlas supports visual observations, not a claim that those interaction or assistive-technology checks passed.

## OpenLegend-specific research subtopics

### Finding opportunities across modes of participation

How do people discover peaceful, adversarial and creative activities when controlling a character, observing lives or authoring a world? Do not make a long command vocabulary or an empty editor the player's first meaningful experience.

### Intent, capability and actual outcome

How can free-form requests and explicit controls communicate what is supported, what a character knows, what was attempted and what really happened? Link CREATE, KNOW and NPC; clear technical diagnostics alone do not establish a usable player experience.

### Additional boundaries from the broader source review

Separate the opportunity in ACTION, its controls here, audiovisual response in PRESENT and fictional knowledge in KNOW. Include disabled-player access, reading load, localization, recoverable mistakes, changing between character/observer/creator roles and the time until the first meaningful activity. Linguistic mystery must not excuse inaccessible interface text.

## Design subtopics

None registered yet. These research questions are not implementation tasks. Use the [adaptable template](main-topic-template.md) and [Future work needing design](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) when adding a scoped proposal. Design status lives in that existing register under its ND identifiers; implementation modules are defined in the technical design and tracked in its linked maintainer owner.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |

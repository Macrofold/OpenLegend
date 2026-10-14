# Building, homes and settlements

**Status: Partial synthesis. Topic: BUILD.** Rust's scoped evidence is incorporated; broader game/world comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md)

## Scope and questions

How does a constructed place become useful, expressive and worth returning to?

- Compare freeform placement, modular construction, decoration, functional rooms, terrain integration and shared building.
- What makes a home, workshop or town socially meaningful beyond its production bonuses?
- How do expansion, maintenance, defense, rebuilding and moving preserve attachment without trapping players in upkeep?

## Ownership boundary

Owns inhabited construction and place attachment. Construction processes belong to CRAFT, industries to LOGISTICS, and institutions to SOCIETY. This is research, not an approved OpenLegend specification.

## Candidate reading routes — not assessed

[Minecraft](../dossiers/minecraft.md) · [Valheim](../dossiers/valheim.md) · [The Sims](../dossiers/the-sims.md). Candidates are not an exhaustive relevance decision or evidence of incorporation.

## Desired experiences and contrasting approaches

A builder should be able to make a place that supports a chosen life, recognize their contribution and understand the consequences of changing it. Modular snapping, freeform placement and authored expandable rooms offer different expression/precision tradeoffs. Destructible competitive property is one option; secure homes and freely reversible construction are legitimate alternatives, not lesser versions of the same goal.

## Cross-game evidence and counterexamples

Initial evidence is one scoped case, not a completed cross-game conclusion. [Rust's building account](../dossiers/rust.md#rust-building) separates placement, permission, locks, support, resistance and upkeep. Its [visual atlas](../dossiers/rust-visual-atlas.md#a-building-privilege-upkeep-and-spatial-reasoning) shows spatial layouts and upkeep feedback, while the preserved contrasting reviews describe both attachment and punishing loss. Those observations do not establish that constant vulnerability improves every home-building experience.

## Consolidated lessons and tradeoffs

<a id="build-l001"></a>

### Assist manipulation without deciding the building's purpose

Reduce repeated alignment and accidental placement while preserving decisions about circulation, use, privacy, appearance, expansion and, where appropriate, defense. A small consistent construction grammar can support varied outcomes. Assistance becomes restrictive when the snapping system prevents a wanted valid arrangement or hides which constraint is failing. Compare manual override and simpler room templates rather than assuming maximum geometric freedom is always best.

<a id="build-l002"></a>

### A finished silhouette is not a complete home

Assess entrance, storage, recovery, work space, maintenance and other inhabitants' access as one daily-use situation. Distinguish ownership from use permission, structural support, decay and damage protection; one reassuring status label should not imply all six. Upkeep can make scale consequential, but its horizon should be legible and compatible with ordinary absence. A permanently comfortable home can remain a successful outcome.

## Current OpenLegend baseline and existing design owners

Use the [source and goal map](source-and-goal-map.md#topic-build) to locate relevant research, current contracts and existing designs. Record delivered scope, designed-but-unimplemented scope and genuinely new questions separately; linked documents are not a fresh runtime audit.

## Complete situations and cross-topic consequences

**Constructed comparison:** a household wants room for shared meals and a workshop. Before adding a wing, the builder evaluates access, available resources and any ongoing obligations. Other occupants need a usable route and appropriate permissions. After construction, carry supplies through the entrance, perform the intended activity and leave/return. A competitive variant may trade convenient circulation for defensive compartments; a peaceful variant may prioritize hospitality. Neither is validated by an attractive exterior alone. Link CRAFT, GEAR, MULTI and LOSS rather than reproducing their full rules here.

## Possible OpenLegend applications and limits

Evaluate understandable placement/correction and the first genuinely useful shelter within the selected world. Do not import universal raiding, forced decay or a solved defensive layout as requirements. NPC access and purpose would need their own actual behavior, not assumptions drawn from human multiplayer.

## Open questions and missing evidence

Compare novice and experienced builders on an ordinary expansion and one blocked placement. Can they predict why it fails, correct it and use the result? The Rust atlas lacks a complete current preview-to-correction capture; it cannot certify smooth interaction or accessibility.

## OpenLegend-specific research subtopics

### Homes, hospitality and shared expression

How do public and private space, shared ownership, decoration, gatherings and peaceful projects support different inhabitants' purposes? A home should be considered as more than a survival buff or factory footprint.

### Places carrying consequences

How do destruction, repair, abandonment, inheritance, ruins and memorials preserve a place's history? Link MULTI, TRUST, SOCIETY and LORE without turning every build into a future raid target or every building into permanent safety.

### Additional boundaries from the broader source review

Connect a place to LEISURE's activities, SPEECH's privacy and audible life, BODY's access needs and TECH's services. Compare public and private places, moving or unusual interiors, permanent successes and changed uses without importing every speculative building type into the selected world.

## Design subtopics

None registered yet. These research questions are not implementation tasks. Use the [adaptable template](main-topic-template.md) and [Future work needing design](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) when adding a scoped proposal. Design status lives in that existing register under its ND identifiers; implementation modules are defined in the technical design and tracked in its linked maintainer owner.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |

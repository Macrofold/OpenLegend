# Logistics, automation and management

**Status: Partial synthesis. Topic: LOGISTICS.** Rust's scoped evidence is incorporated; broader game/world comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md)

## Scope and questions

How can organizing work free attention for better decisions rather than make the player redundant?

- Compare production chains, hauling, storage, transport, staffing, schedules and constrained service capacity.
- When do bottlenecks and automation create legible puzzles, and when do they require repetitive micromanagement?
- What remains for the player to choose after reliable execution is delegated?

## Ownership boundary

Owns coordinating flows and work at scale. Recipes belong to CRAFT, economic incentives to ECON, and personal motivations to NPC. This is research, not an approved OpenLegend specification.

## Candidate reading routes — not assessed

[Factorio](../dossiers/factorio.md) · [Satisfactory](../dossiers/satisfactory.md) · [Oxygen Not Included](../dossiers/oxygen-not-included.md). Candidates are not an exhaustive relevance decision or evidence of incorporation.

## Desired experiences and contrasting approaches

Organizing a dependable process can itself be satisfying or can free attention for something else. Detailed routing, simple service abstractions and manual small-scale work have different costs. Automation should not require deliberate tedium first simply to make its eventual removal feel valuable.

## Cross-game evidence and counterexamples

[Rust's logistics account](../dossiers/rust.md#rust-logistics) connects physical inventories, filters, production and infrastructure. Its electric-furnace example changes a by-product, not only speed, and its public-infrastructure case distinguishes shared benefits from private machinery. The atlas inspected machine exteriors rather than complete diagnostics. This is one case and does not establish that every game needs vulnerable factories or explicit pipes.

## Consolidated lessons and tradeoffs

<a id="logistics-l001"></a>

### An upgrade can change dependencies, not just throughput

A new process may remove hauling or fuel work while changing inputs, by-products, power needs or concentration of value. Evaluate the whole chain and what decisions remain afterward. Resilience, reserve stock and alternative routes can be meaningful; where they add only administration, a simpler dependable service may be preferable. Do not impose failure merely to keep the player busy.

<a id="logistics-l002"></a>

### Diagnose the blocked stage and preserve useful work

Distinguish missing input, unavailable power, unmet recipe/station conditions, route failure and full output. A single “not running” state can conceal the player's next action. Show enough local causality to repair the process without requiring implementation knowledge. Coordinated machines and a person's chosen commitment remain different systems; automation is not evidence that NPC labor should ignore motivation or consent.

## Current OpenLegend baseline and existing design owners

Use the [source and goal map](source-and-goal-map.md#topic-logistics) to locate relevant research, current contracts and existing designs. Record delivered scope, designed-but-unimplemented scope and genuinely new questions separately; linked documents are not a fresh runtime audit.

## Complete situations and cross-topic consequences

**Constructed comparison:** a workshop reliably receives raw materials, but finished-goods storage fills. The organizer identifies the blocked destination, chooses whether to expand storage, slow input or redirect output, and understands which prior work remains intact. Replacing a fuel-based process with another method may remove a useful by-product needed elsewhere. Contrast that organizational puzzle with a small household where automatic service is sufficient and explicit routing adds no valued choice.

## Possible OpenLegend applications and limits

Use causal stage distinctions to evaluate an existing supported production activity before adding a large automation system. Keep public-service benefits, private stock and individual residents' obligations separate. These findings do not approve a factory layer or a universal task-assignment mechanic.

## Open questions and missing evidence

Can a player locate the real blockage and restore the wanted output without repeated guessing? Does freed attention lead to better activity or simply more required scale? Rust's current filtering/error UI and representative network resilience were not executed in this pass.

## OpenLegend-specific research subtopics

### Delegated work without delegated personhood

How can people accept, refuse, prioritize or renegotiate work while still being dependably competent? Distinguish a machine's automation from a character's motivation, and delegated execution from the player's choice of purpose.

### Resilience and changing obligations

How do disrupted routes, weather, war, shared supplies and competing obligations create interesting organizational choices? Link ECON, NPC and SOCIETY; detailed hauling is not automatically valuable in every small-world activity.

### Additional boundaries from the broader source review

Separate the working machine or infrastructure in TECH from its coordination here; separate a person's chosen commitment in NPC from treating labor as interchangeable throughput. Compare resilient supply, social dependence and simple dependable routines with fully optimized industry.

## Design subtopics

None registered yet. These research questions are not implementation tasks. Use the [adaptable template](main-topic-template.md) and [Future work needing design](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) when adding a scoped proposal. Design status lives in that existing register under its ND identifiers; implementation modules are defined in the technical design and tracked in its linked maintainer owner.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |

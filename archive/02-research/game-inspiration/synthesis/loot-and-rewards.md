# Loot, rewards and discovery

**Status: Partial synthesis. Topic: LOOT.** Rust's scoped evidence is incorporated; broader game/world comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md)

## Scope and questions

Why does acquiring something feel exciting, deserved and worth using?

- Compare authored finds, random drops, rewards for skill, social rewards, access and cosmetic expression.
- How do anticipation, rarity, risk, bad-luck protection and duplicate handling interact with usefulness?
- When do drops create clutter, compulsory farming or power creep, and what alternatives preserve discovery?

## Ownership boundary

Owns acquisition and reward delivery. Item use/storage belongs to GEAR and long-term advancement to GROWTH. This is research, not an approved OpenLegend specification.

## Candidate reading routes — not assessed

[Diablo IV](../dossiers/diablo-iv.md) · [Terraria](../dossiers/terraria.md) · [Noita](../dossiers/noita.md). Candidates are not an exhaustive relevance decision or evidence of incorporation.

## Desired experiences and contrasting approaches

A reward can fulfill a goal, open a capability, recognize a contribution or express identity. Risky extraction, immediately secured quest rewards and freely shared gifts make different promises. Randomness is one source of anticipation, not a substitute for usefulness or the only way to make a discovery memorable.

## Cross-game evidence and counterexamples

[Rust's acquisition and transfer evidence](../dossiers/rust.md#rust-looting) connects found goods to carrying space, equipment use and returning safely. [Its crafting account](../dossiers/rust.md#rust-crafting) also shows why an object can matter before its production method is known. The contrasting reviews warn that repeated loss can overwhelm the reward. This is initial scoped evidence, not a cross-game finding that all rewards should remain stealable.

## Consolidated lessons and tradeoffs

<a id="loot-l001"></a>

### Distinguish finding, acquiring, securing and using

Seeing an object is not obtaining custody; taking it is not necessarily banking it; possession is not always the ability to use it. Decide which boundary completes the promised reward and communicate it. An extraction phase can create a satisfying return arc, but imposing it after a reward presented as already secure breaks expectations. Technical delivery failure is not fictional risk.

<a id="loot-l002"></a>

### Make the next possibility more legible than rarity alone

Explain why the object matters: a new method, a useful replacement, a gift, a trade opportunity or a piece of a chosen project. An exciting find may bypass a production bottleneck or renew an early decision. Without a meaningful use or recipient, rarity can become clutter or compulsory hoarding. Prefer a small understandable reward to an unreadable pile of nominal upgrades.

## Current OpenLegend baseline and existing design owners

Use the [source and goal map](source-and-goal-map.md#topic-loot) to locate relevant research, current contracts and existing designs. Record delivered scope, designed-but-unimplemented scope and genuinely new questions separately; linked documents are not a fresh runtime audit.

## Complete situations and cross-topic consequences

**Constructed comparison:** an explorer discovers a tool useful for reaching a previously inaccessible place. Carrying it home safely creates one possible adventure; using it immediately creates another. A companion might value it for a different purpose. The player needs to understand who receives it, what is being risked and when the acquisition is complete. A peaceful commission can deliver the same capability without an extraction threat. Link GEAR, CRAFT, GROWTH and TRUST; do not duplicate their ownership or use rules.

## Possible OpenLegend applications and limits

Evaluate whether the first useful find changes a real available action and whether its delivery state is unambiguous. Do not import random loot tables, universal theft or escalating item tiers as defaults for every authored world.

## Open questions and missing evidence

Does a player recognize the reward's use and choose a wanted next action? Compare satisfaction after finding, returning and using it. Selected Rust testimony does not establish drop-rate preferences, population-wide recovery tolerance or optimal reward frequency.

## OpenLegend-specific research subtopics

### Rewards beyond killing and numerical upgrades

How can discovery, care, negotiation, making, skill and dangerous victory grant useful possessions, access or knowledge? Examine rewards that change possibilities while preserving voluntary participation and meaningful stopping points.

### Provenance, ownership and memorable finds

When does where an object came from make acquiring it meaningful? Compare gifts, contested spoils, rare finds and historical artifacts, linking GEAR, ECON and LORE without fabricating an object's past.

### Additional boundaries from the broader source review

Distinguish discovering a place, seeing an object, learning a method, acquiring custody and using the reward. Compare fixed and random rewards, shared recognition, access, knowledge and expressive value. A gift or completed objective need not create a permanent escalation obligation.

## Design subtopics

None registered yet. These research questions are not implementation tasks. Use the [adaptable template](main-topic-template.md) and [Future work needing design](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) when adding a scoped proposal. Design status lives in that existing register under its ND identifiers; implementation modules are defined in the technical design and tracked in its linked maintainer owner.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |

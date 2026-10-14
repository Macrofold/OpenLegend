# Items, equipment and inventory

**Status: Partial synthesis. Topic: GEAR.** Rust's scoped evidence is incorporated; broader game/world comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md)

## Scope and questions

How do possessions create capabilities and attachment without overwhelming the player?

- Compare multi-use tools, equipment slots, loadouts, durability, consumables, containers and carrying limits.
- Which tradeoffs create distinct ways to play rather than obvious numerical upgrades?
- How do comparison, sorting, ownership, sharing and loss communicate value while avoiding inventory administration?

## Ownership boundary

Owns what items do and how they are carried. Acquisition belongs to LOOT, making to CRAFT, and learned builds to GROWTH. This is research, not an approved OpenLegend specification.

## Candidate reading routes — not assessed

[Caves of Qud](../dossiers/caves-of-qud.md) · [Project Zomboid](../dossiers/project-zomboid.md) · [Breath of the Wild](../dossiers/the-legend-of-zelda-breath-of-the-wild.md). Candidates are not an exhaustive relevance decision or evidence of incorporation.

## Desired experiences and contrasting approaches

Equipment should support recognizable purposes: gathering, protection, travel, care, performance or expression. Limited loadouts can make preparation meaningful; abundant carrying capacity can support experimentation or reduce routine administration. Neither maximum constraint nor unlimited collection is inherently superior. The useful distinction is between choosing a kit and fighting an inventory interface.

## Cross-game evidence and counterexamples

[Rust's inventory and looting study](../dossiers/rust.md#rust-looting) separates carried items, containers and account cosmetics, and documents transfer/armor-swap improvements. Its provenance example also separates a maker's identity from current custody. The visual audit specifically rejects an account-cosmetic screen as evidence of carried-item UX. Other candidate games remain unassessed; no comparative accessibility or sorting-speed claim is made.

## Consolidated lessons and tradeoffs

<a id="gear-l001"></a>

### Explain where an item is going and what it displaces

A transfer, equip action and exchange are different operations. Make destination, compatibility, capacity and displaced-item handling understandable, especially when a container is full. Convenience should not silently discard a valued item or require emergency cursor precision. A loadout can remain consequential even when repeat equipping and ordinary sorting are easy.

<a id="gear-l002"></a>

### Keep utility, custody, provenance and entitlement distinct

An item can be usable, borrowed, made by someone else and associated with an account-owned appearance at the same time. These facts answer different questions. Show history only where it contributes meaningful identity, and do not make a creator label look like current permission or invulnerability. Persistent cosmetic ownership does not establish the fate of a physical object on death; LOSS owns that promise.

## Current OpenLegend baseline and existing design owners

Use the [source and goal map](source-and-goal-map.md#topic-gear) to locate relevant research, current contracts and existing designs. Record delivered scope, designed-but-unimplemented scope and genuinely new questions separately; linked documents are not a fresh runtime audit.

## Complete situations and cross-topic consequences

**Constructed comparison:** a traveler finds useful protective clothing while their pack is full. They compare its relevant benefits, choose whether to wear or store it, and see where the old equipment will go before committing. A peaceful context allows deliberation; an exposed context may preserve world danger without making the transfer itself unreliable. Later, a remembered gift may be kept for sentimental rather than numerical value. GEAR owns these carrying/use decisions; LOOT owns acquisition and TRUST owns permission boundaries.

## Possible OpenLegend applications and limits

Evaluate an ordinary transfer and a full-capacity equipment replacement using the existing inventory contracts. Do not adopt a shooter hotbar, exact slot count or mandatory corpse looting merely because those fit Rust. Different bodies and roles require their own compatibility evidence.

## Open questions and missing evidence

Can a player predict the resulting inventories and recover from a mistaken choice? Current Rust carried-inventory/swap micro-UX was documented in release text but not captured end to end; keyboard and assistive-technology behavior remain unknown.

## OpenLegend-specific research subtopics

### Objects as capabilities in different lives

Compare weapons with instruments, care supplies, everyday tools and unusual bodily equipment. How do compatibility, condition, accessibility and multiple uses create understandable options for players and NPCs?

### Possessions with a continuing history

How can gifts, inheritance, repairs, loss and visible provenance create attachment without inventing a biography for every item? Link CRAFT, NPC, LORE and LOSS; historical meaning and mechanical usefulness need not coincide.

### Additional boundaries from the broader source review

Connect equipment to BODY for genuinely different anatomy and to ACTION for situated uses. Compare carrying convenience, meaningful loadout choices, ownership and sentimental identity without turning every object into required bookkeeping.

## Design subtopics

None registered yet. These research questions are not implementation tasks. Use the [adaptable template](main-topic-template.md) and [Future work needing design](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) when adding a scoped proposal. Design status lives in that existing register under its ND identifiers; implementation modules are defined in the technical design and tracked in its linked maintainer owner.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |

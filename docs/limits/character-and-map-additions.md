# Character and map additions: limits and constraints

[Feature contract](../projects/character-and-map-additions-feature-spec.md) · [Implementation work](../maintainers/character-and-map-additions.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Every entry is a **proposed target (2026-10-27)**; none is implemented. Ratings describe restrictiveness, not correctness or measured capacity.

## CMA-L01 — Map markers per character

**Proposed · 500 · Restrictiveness: Low.** Mike asked to drop "as many as you like". 500 keeps a character's saved knowledge and owner view bounded while staying far above ordinary play. At the cap a new marker is refused with a reason; deleting one frees space.

## CMA-L02 — Label lengths

**Proposed · marker label 40 characters, nickname 40 characters · Restrictiveness: Low.** Short labels fit map chips, pickers and names over the world. Place notes keep the existing knowledge-document limits; the known name keeps its 120-character limit.

## CMA-L03 — Stat range and step

**Proposed · whole numbers 1–20, ordinary human 10, 5% per point (2 points of hit chance for Dexterity, 1 for Perception at range), hit chance clamped to 5–95% · Restrictiveness: Medium.** A small scale reads at a glance; 5% steps keep a 6–14 spread meaningful without outweighing equipment and practice. Scars at −4 keep today's 20% effects.

## CMA-L04 — Carrying limit

**Proposed · 20 + 2 × Strength kg (40 kg at 10); slowdown to half speed above it; pickup refused above twice the limit · Restrictiveness: Medium.** Creates packing choices without trapping a character in place. Every portable item needs a mass.

## CMA-L05 — Spirit scale and Inspired

**Proposed · 0–100, resting at 60; grief −40, fear −30, anger −20, discomfort −15, joy +30, each scaled by the feeling's strength; Inspired after 60 in-game minutes at 80 or more, lasting 3 in-game hours at +10% · Restrictiveness: —.** Spirit has no direct effect, so these weights change only what the player reads and when Inspired begins.

## CMA-L06 — Armour floor

**Proposed · each armour point removes 1 injury from each hit, to a minimum of 1 · Restrictiveness: Low.** Every hit stays consequential.

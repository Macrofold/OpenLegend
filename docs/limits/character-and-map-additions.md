# Character and map additions: limits and constraints

[Feature contract](../projects/character-and-map-additions-feature-spec.md) · [Implementation work](../maintainers/character-and-map-additions.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

CMA-L01/L02 are current enforced limits; their running-interface qualification remains with [CMA01/CMA02](../maintainers/character-and-map-additions.md). CMA-L03–L06 remain proposed targets (2026-10-27). Ratings describe restrictiveness, not correctness or measured capacity.

## CMA-L01 — Map markers per character

**Current · 500 · Restrictiveness: Low.** Mike asked to drop "as many as you like". The bundled world's authored map definition limits markers per character to 500. Native admission refuses another marker at capacity; deleting one frees space. This bounds saved annotations and their owner projection, not measured long-running map/history performance. Full map and minimap share one owner-scoped prepared Known places read. Committed changes to that actor's place evidence or place notes refresh both views; unrelated memories, general notes and nicknames do not. An active page chain finishes before one trailing refresh adopts the latest committed token, avoiding repeated cancellation and duplicate reads. An unchanged failed read waits for the explicit Refresh action. World, actor, access, timeline and history epoch fence this private cache, which is released with its last reader; a new server process has a new token identity.

## CMA-L02 — Label lengths

**Current · marker label 40 Unicode code points, nickname 40 Unicode code points · Restrictiveness: Low.** Native admission and current-format validation enforce these bounds. Place notes keep the existing world-installed knowledge-document limits; the known name keeps its 120-character limit. Map labels, entity notes and place notes have separate identity namespaces. Retained-place notes require the exact permitted observation, without requiring that the live place still exists. Array-shaped marker collections are rejected before saving.

## CMA-L03 — Stat range and step

**Proposed · whole numbers 1–20, ordinary human 10, 5% per point (2 points of hit chance for Dexterity, 1 for Perception at range), hit chance clamped to 5–95% · Restrictiveness: Medium.** A small scale reads at a glance; 5% steps keep a 6–14 spread meaningful without outweighing equipment and practice. Scars at −4 keep today's 20% effects.

## CMA-L04 — Carrying limit

**Proposed · 20 + 2 × Strength kg (40 kg at 10); slowdown to half speed above it; pickup refused above twice the limit · Restrictiveness: Medium.** Creates packing choices without trapping a character in place. Every portable item needs a mass.

## CMA-L05 — Spirit scale and Inspired

**Proposed · 0–100, resting at 60; grief −40, fear −30, anger −20, discomfort −15, joy +30, each scaled by the feeling's strength; Inspired after 60 in-game minutes at 80 or more, lasting 3 in-game hours at +10% · Restrictiveness: —.** Spirit has no direct effect, so these weights change only what the player reads and when Inspired begins.

## CMA-L06 — Armour floor

**Proposed · each armour point removes 1 injury from each hit, to a minimum of 1 · Restrictiveness: Low.** Every hit stays consequential.

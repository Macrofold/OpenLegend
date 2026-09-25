# Spatial substrate

Keep geometry, validation and navigation renderer-free and independent of world-policy, browser, provider and storage dependencies. Use the existing [exports](src/index.ts); native geometry, not rendered appearance, determines mechanical queries.

Consult [spatial behavior](../../docs/spatial-world.md) and its focused tracker for the affected contract. Preserve XYZ/support identity, explicit units, deterministic tie/order rules and bounded search. Broadphase filters must be conservative; exact queries retain authority. A budget-limited search is not proof of unreachable geometry.

Indexes/caches are derived from their actual immutable inputs and revisions; replacement invalidates them. Do not share private observer results as geometric facts or save mutable search scratch. Use the [performance skill](../../.agents/skills/openlegend-performance/SKILL.md) for query/index/navigation changes; measure cold preparation as well as warm execution.

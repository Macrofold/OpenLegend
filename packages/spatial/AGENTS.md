# Spatial substrate

Keep geometry, validation and navigation renderer-free and independent of world-policy, browser, provider and storage dependencies. Use the existing [exports](src/index.ts); native geometry, not rendered appearance, determines mechanical queries.

Read [spatial behavior](../../docs/spatial-world.md), including [physical-interaction design checks](../../docs/spatial-world.md#physical-interaction-design-checks), and its focused tracker before planning or changing the affected contract. Preserve XYZ/support identity, explicit units, deterministic tie/order rules and bounded search. Broadphase filters must be conservative; exact queries retain authority. A budget-limited search is not proof of unreachable geometry.

Indexes/caches are derived from their actual immutable inputs and revisions; replacement invalidates them. Do not share private observer results as geometric facts or save mutable search scratch. Apply the [root performance read requirement](../../AGENTS.md#performance-guidance-before-code-work) before code work; measure cold preparation as well as warm execution for meaningful query/index/navigation changes.

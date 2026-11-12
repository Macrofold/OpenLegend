# Persistent MMORPG engine foundations

Research synthesis prepared November 11, 2026. This collection informs the existing native-core and product-scalability designs; it is not a second engine plan or demonstrated capacity.

## Decision context

Mike's research target is **1,000 concurrent players per persistent world, with 5,000 as a further ambition**, plus autonomous NPCs and other world activity. Establish the largest useful, affordable local encounter rather than assume a conservative population cap. These are investigation targets, not new release gates; the smaller native proof and first-player milestones remain independently completable.

Worlds may begin as copies of one authored seed and then evolve independently. They can share immutable beginnings, not interchangeable mutable histories. Vast stored geography need not all be resident or processed at full detail. Existing world/time/participation owners determine what genuinely continues during absence.

## Main conclusion

Protect the separation between **persistent existence, RAM residency, due simulation work and delivery to observers**. Preserve scoped access, explicit dependencies and wakeups, stable identities, bounded consumer products and coordinate precision during native conversion. Extend existing mechanisms rather than introduce a universal framework. The native proof still measures the complete smaller pipeline before broad adoption.

Physical exclusion can bound some local interaction work under explicit assumptions; it does not establish infinite capacity, a small connected physics problem or cheap audience delivery. Conversely, a connected encounter is not proof that useful multicore execution is impossible. Spatial indexes and transparent compute partitions can support one shared encounter; forcing players into separate encounters or limiting attendance is a different, last-resort product choice.

**The desired return is more worthwhile play, not a population counter:** recognizable residents in a busy place, consequential personal encounters within a larger gathering, useful contributions to one shared event, and changed places worth revisiting. The [crowd chapter](02-scale-model-and-crowds.md#player-value-and-the-first-crowd-candidate) develops concrete applications. The existing [capacity and quality contract](../../docs/product-scalability/capacity-and-economics.md) owns fairness, sustainable NPC quality and operating acceptance; this research adds no separate fun-scoring system.

## Reading and action map

- [Context and existing coverage](01-context-and-existing-coverage.md): the original pinned source, earlier work, inspected code and historical implementation-ref access limitation.
- [Scale model and crowds](02-scale-model-and-crowds.md): bounded local work, coupled interactions, recipient amplification and a proposed first movement comparison.
- [Engine foundations and sequencing](03-foundations-and-sequencing.md): expensive-to-retrofit seams and deferred machinery.
- [Persistent worlds and hosting](04-persistent-worlds-and-hosting.md): independent seed histories, residency, storage growth, provider boundaries and complete cost.
- [Qualification and capacity](05-qualification-and-capacity.md): useful-work, quality and operating evidence.
- [Primary sources](sources.md): mechanism evidence and its limits, not transferable OpenLegend benchmarks.

The [focused handoff](../../docs/maintainers/decisions/mmorpg-engine-foundations.md) records completed near-term design slices and remaining consumer-specific questions. The source-reconciled [native runtime foundation pair](../../docs/projects/native-runtime-foundations-feature-spec.md) and [NRF tracker](../../docs/maintainers/native-runtime-foundations.md) specify four isolated candidates, preserving current NSC repairs and gates rather than duplicating them. Its [evidence map](../../docs/projects/native-runtime-foundations-evidence-and-repertoire.md) inspects the now-accessible Rust implementation and all repertoire scopes. [NSC](../../docs/maintainers/native-simulation-core.md) retains proof/conversion adoption; the [capacity owner](../../docs/product-scalability/capacity-and-economics.md#maintained-records) retains later PS/PF/PT/PD qualification.

## Unchanged boundaries

Cells are ownership units, not CPU cores, mandatory rooms or fixed capacity limits. Same-host multicore precedes the full cell stage. The initial distributed experiment keeps one logical world clock and the current writer; separate authoritative clocks and storage distribution require their own decisions. Preserve personal evidence, unknown identities, privacy, current-format restoration and accepted-effect uniqueness.

No runtime, cloud service, model route or gameplay approximation is installed by this collection. Exact distant activity is not replaced by average outcomes. Broader cognition, perception or physical-law alternatives can be evaluated explicitly without pretending that research authorization has already adopted them.

# Persistent MMORPG engine foundations

Research synthesis prepared November 11, 2026. This collection identifies expensive-to-retrofit engine assumptions, not a production infrastructure blueprint or a new implementation authorization.

## Decision context

Mike's research target is **1,000 concurrent players per persistent world, with 5,000 as a further ambition**, plus autonomous NPCs and other world activity. There is no selected maximum local crowd: establish the largest useful, affordable encounter rather than assume a conservative population cap. These are investigation targets, not measured capacity or new release gates. The existing smaller native proof and first-player milestones remain independently completable.

Worlds may begin as many copies of one authored seed and then evolve independently. Shared source content does not make their mutable states interchangeable. A world may contain vast land and sea, and a stored world need not be fully resident or receive full-detail processing continuously. The exact behavior of unattended and lower-detail execution still belongs to the existing world/time/participation owners.

## Main conclusion

The resident-native design already addresses much of the foundational CPU problem. The next risks are less about choosing another cloud or language and more about **what the engine makes proportional to total world size, total population, total observers and accumulated history**.

Protect the following seams during the native conversion: scoped access to partially resident state; explicit dependencies and wakeups; stable identity independent of memory and routing; bounded consumer captures and queues; and coordinate precision across all representations. Develop the actual larger streaming, crowd and multi-world capabilities only as a consuming milestone needs them. Existing mechanisms and accepted designs should be extended, not replaced with an additional universal framework.

Physical exclusion can make local interaction work grow approximately with population rather than every possible pair, under explicit assumptions. It does **not** establish infinite capacity, a small connected physics problem, cheap distant visibility, or affordable cognition. A wide crowd, long-range effects and recipient fan-out remain separate problems. Conversely, one connected encounter is not proof that useful multicore execution is impossible.

## Reading map

- [Context and existing coverage](01-context-and-existing-coverage.md): provenance, prior discussions, inspected source, what already exists, and what could not be verified.
- [Scale model and crowds](02-scale-model-and-crowds.md): physical crowding, interaction graphs, useful dense-scene strategies and the limits of geographical division.
- [Engine foundations and sequencing](03-foundations-and-sequencing.md): the minimal NOW/SOON seams, their consequences and what to defer.
- [Persistent worlds and hosting](04-persistent-worlds-and-hosting.md): seed copies, independent histories, memory and storage growth, provider boundaries and economics.
- [Qualification and capacity](05-qualification-and-capacity.md): the experiments needed to turn ambitions into an honest operating envelope.
- [Primary sources](sources.md): source scope, evidence limitations and source identifiers used throughout the collection.

The actionable follow-through is owned by [the focused needs-design briefs](../../docs/maintainers/decisions/mmorpg-engine-foundations.md), extending D22/D61 and R06/R12/R13/R15. They identify existing owners rather than introducing a second implementation backlog. Research recommendations remain proposed until their corresponding design is adopted.

## Boundaries that remain unchanged

Cells are ownership units, not CPU cores, mandatory rooms or fixed capacity limits. The native multicore proof precedes the full same-machine cell stage. Keep one logical world clock and the current writer for the initial distributed experiment; independent regional advancement and storage distribution are separate decisions. Preserve personal evidence, unknown identities, privacy, current-format restoration and exactly-once accepted effects through existing owners.

No new database, cloud service, actor framework, ECS replacement, rollback networking, model loop, compatibility layer or gameplay approximation is selected here. The current exact-distant-activity decision is not replaced by simulated averages. This collection changes no runtime, launches no AWS resources, runs no load test and establishes no performance result.

# Native runtime foundations: evidence and repertoire reconciliation

[Feature](native-runtime-foundations-feature-spec.md) · [Technical design](native-runtime-foundations-tech-design.md) · [Work](../maintainers/native-runtime-foundations.md)

## Source and claim boundaries

Inspection baseline: `Macrofold/OpenLegend`, `codex/native-simulation-proof`, `d9544ae5d017e697bfcfe2a38c71bb8569ad14f6`, November 11, 2026. Its research integration does not change the preceding `d1211430d65390957baf5b0094d2cf2057950f8f` runtime. Design branch: `design/native-runtime-foundations`. No runtime, paid-model, load or cloud experiment was executed by this design task.

The original [foundation research](../../research/mmorpg-engine-foundations/01-context-and-existing-coverage.md) inspected an earlier integrated baseline because the named native implementation ref was unavailable then. That is historical provenance, not a current access blocker. This design reads the now-available implementation and retains the research's independent-world, density, recipient, memory and history distinctions.

This is a targeted producer/consumer and architecture review. Complete relevant small owners and bounded sections of large files were read; it is not a line-by-line audit of the entire repository or independent rerunning of the native tracker's experiments. Named functions below are actual inspected integration points. A source pattern establishes possible repeated work, not its cost ranking.

## Reconciliation with current implementation

### Present and to preserve

- `native/simulation/src/state.rs`: `Point` uses `f64`; `EntityStore` separates stable string identity, root order and slot/generation handles. Do not propose these as missing features or replace them with an ECS without evidence.
- `simulation.rs`, `execution.rs` and `host.rs`: separate physical/personal/temporal owners, one candidate journal, exact nested rollback, finite acceptance fence and synchronous disclosure lease. Candidate release and accepted allocation release have real owners; a generic transaction system is unnecessary.
- `movement.rs` and `movement/residency.rs`: one maintained body index, conservative extents, semantic result ordering, cached counts and pre-funded changed-node updates. Ordinary movement does not recount every body for accounting. Spatial bins are not machine ownership or CPU assignments.
- `status.rs`, `status/rates.rs` and `time/prediction.rs`: pure earned-value reads, explicit charge callback, ordered rate selections, preserved installed policy and selected forecast reuse. This supplies R's narrow read-only parallel candidate; it does not prove that rate preparation is the dominant cost.
- `time/participants.rs` and `time/sensing.rs`: actual component groups, shared prepared lists, distinct root/ICU order and absolute sensory deadlines. Construction/selection scans are possible attribution sites, not justification for a second always-maintained scheduler.
- `apps/server/src/native-read-cut.ts`: actual accepted prefix, exact durable/unsaved joining, selected actor temporal overlay and independent source custody. Dropping this preparation because SQL is expensive would change correctness.
- `apps/server/src/native-player-http.ts`: patch/reset/no-output selection precedes encoding; blocked-stream cleanup, independent previous views and current disclosure already exist. Do not restore eager full-view encoding.
- `native-player-view.ts`, `native-player-capture.ts`, `native-view.ts` and `authority.ts`: core captures, derived presentation, optional operational inputs, actual account/session/grant/connection scopes and final publication are distinct. The complete view cannot safely be treated as one actor-wide cached object.
- `native-consumer.ts`, `runtime/consumer.rs`, `node-bridge/src/world/consumer.rs` and `host/budget.rs`: explicit source pins, derived-product custody, delayed real release, header/body separation, resize/split/merge reservations and independent pending-save accounting. Logical release is not proof that all physical memory has settled.
- `node-bridge/src/pool.rs` and `native/Cargo.toml`: a bounded per-host Rayon pool already exists. The workspace pins Rayon 1.12.0. R consumes it rather than creating another worker pool.

### Owner-reported continuation beyond this inspection

Mike reports that outgoing-only encoding, definitions-once and narrow movement reads are implemented/checked; moved attention before-images have receiving, rollback, elapsed and PostgreSQL continuation evidence, with AWS measurement pending. The 19.9% outgoing-encoding observation comes from two completed Native pairs, not a complete campaign qualification. The tracker's recorded failures and source-specific conditions remain controlling.

The existing profiling workload already includes history rebuilding, read preparation, attention candidates, shared-value export, accounting/encoding, wrappers, SQL and duplicate connections. Ranking is pending. Recurrent 128 MiB exhaustion still needs simultaneous-owner and refused-size attribution. The active implementer is addressing reconnect/busy failures before those measurements. These are supplied work-status facts; uncommitted changes and unprovided measurements were not independently inspected.

Nothing in that list needs a second implementation prompt. A newly committed satisfying repair supersedes the corresponding NRF candidate. Capture that disposition once, preserving actual evidence instead of reapplying an older recipe.

### What the source does and does not justify

J has a specific duplicate traversal to compare. S has a specific sequential temporary-owner lifetime to compare. P has a specific reusable core-capture boundary but unproved sharing benefit. R has a specific pure read phase and an existing pool, but allocation, work charging and complete-path gain require qualification.

The source does not justify another whole-state rewrite, cold-check branches on every field, a global view cache, general allocation arenas, arbitrary computation shedding or an immediate distributed database. Nor does it establish that the four candidates will make a 1,000–5,000-player world affordable. Their value is an explicit, measurable next step rather than an unbounded new programme.

## Repertoire review: all 28 catalogue scopes

Review depth: the shared library/ownership map and gameplay priorities, all 28 catalogues' scope/coverage and representative opening material, plus the opening combined situations. This is a cross-catalogue foundation review, not a fresh priority audit or individual validation of all thousands of entries. Rows remain proposals; no new capability is inferred from a catalogue label.

Each group below identifies the useful experience and the engine boundary that supports it. These are coverage obligations for selected consumers, not 28 implementation tasks.

- **Actions, mechanics and combat/rescue:** responsive intentions, ongoing work, readable interruptions and real consequences. Preserve admission, order, contact and cancellation while preparation becomes cheaper. Sources: [actions](../repertoires/actions.md), [mechanics](../repertoires/mechanics.md), [combat](../repertoires/combat-rescue.md). Existing action/CTR/ASE owners retain mechanics; NRF adds none.
- **Objects, materials and work/crafting:** possessions can be useful, expressive or worth repurposing, and a successful invention should retain a later use. Preserve stable custody and actual effects without requiring a unique rich biography for fungible stock or model calls for routine execution. Sources: [objects](../repertoires/objects.md), [materials](../repertoires/materials-resources.md), [work](../repertoires/work-crafting.md). Existing inventory, invention and production owners remain authoritative.
- **Adventure/discovery and abilities/progression:** desirable destinations, mastery and earned alternatives must remain usable rather than become CPU-heavy administration. Sources: [adventure](../repertoires/adventure-discovery.md), [abilities](../repertoires/abilities-progression.md). Preserve knowledge, action outcomes and current continuation; do not grant a learned method because a shared scene buffer contains it.
- **Needs, bodies/species and ecology/weather:** selected bodily/environmental laws can have independent rates, deadlines and sensing. Not every inhabitant needs every meter, and not every world needs a full planetary model. Sources: [needs](../repertoires/needs.md), [bodies](../repertoires/bodies-species.md), [ecology](../repertoires/ecology-weather.md). R's interface must accept world-installed definitions rather than hardcode hunger, humanoid dimensions or a new global tick.
- **Characters/backstories, traits, psychology and relationships:** recognizable people can continue a chosen purpose, interpret the same event differently and refuse an invitation. Sources: [characters](../repertoires/characters-backstories.md), [traits](../repertoires/traits.md), [psychology](../repertoires/psychology-behavior.md), [relationships](../repertoires/relationships.md). Shared preparation must not share private minds or turn optional deliberation into forced behavior. Existing cognition/CE/EP/SC designs own quality and choice.
- **Settlements/architecture and economy/logistics:** useful homes, passages, possessions and recurring routes connect local decisions to later returns. Sources: [settlements](../repertoires/settlements-architecture.md), [economy](../repertoires/economy-logistics.md). Geometry/support, custody and obligations survive source retirement and save/reload. NRF does not require simulating every distant transaction or building physical-region streaming before a camp works.
- **Diplomacy/conflict and institutions/politics:** a useful ally, contested crossing or shared undertaking can matter without a full political simulation. Sources: [diplomacy](../repertoires/diplomacy-conflict.md), [institutions](../repertoires/institutions-politics.md). Nonlocal commitments remain named dependencies; fictional rank is not operational authority. Cross-cell proximity cannot be the only dependency declaration.
- **History/myth and languages/knowledge:** testimony, recognition, correction and remembered consequences make a persistent world distinct. Sources: [history](../repertoires/history-myth.md), [knowledge](../repertoires/languages-knowledge.md). Keep truth, received evidence and interpretation separate; an unavailable record is not false, and an optimization cannot manufacture an exact memory from aggregate data.
- **Arts/leisure and faith/ritual:** beauty, pleasure, performances and chosen meaning can justify a gathering without a combat reward. Sources: [arts](../repertoires/arts-leisure.md), [faith](../repertoires/faith-ritual.md). Reuse compatible objective preparation while preserving audience permissions and individual responses. Do not make admission queues or empty distance the claimed experience.
- **Magic and technology:** supported rules can combine across activities, including foreign targets and long-range dependencies. Sources: [magic](../repertoires/magic.md), [technology](../repertoires/technology.md). R deliberately keeps shared-target effect accumulation serial. A description of a power grants neither arbitrary code nor an unbounded work budget.
- **Automation/creators, unusual realities and simulation experiments:** known work can continue while creators choose different supported laws. Sources: [automation](../repertoires/automation-creators.md), [unusual realities](../repertoires/unusual-realities.md), [experiments](../repertoires/simulation-experiments.md). Preserve explicit supported-family closure, exact installation and source-scoped evidence. No universal actor framework, alternative clock or laboratory result is promoted into the current game by this task.

## Positive applications and restraint

The [combined situations](../repertoires/combinations.md) already give the foundation a compelling purpose. At the toll tower, real routes, independent motives and received warning should support different viable approaches. At the quarry, remembered encounters and actual sensory channels can make a new method useful. After victory, the changed possessions, people and relationships should matter without forcing another emergency. The festival shows why a crowd can be worth supporting even when its purpose is creative rather than combat.

NRF does not commission those complete scenarios. Its immediate qualification uses the supported opening and real ordinary consumers, while preserving the mechanisms those later selected scenarios depend on. More efficient preparation should leave capacity for individual differences and responsive control; it must not replace people with interchangeable background output or erase a consequence to save memory.

No missing catalogue entry or priority change was established by this foundation review. Existing catalogues already contain useful crowded places, consequential returns, invention, cooperation, rivalry and unusual worlds. Adding more examples would not resolve the measured engine problem. Keep the repertoire content and rankings unchanged, and use the paired design/tracker to improve the selected capabilities.

## Research and current-source references

The [MMORPG source register](../../research/mmorpg-engine-foundations/sources.md) retains the broader evidence and its limits. Its lessons about work removal, memory bandwidth, recipient fan-out and independent worlds inform this design without transferring another game's capacity figures.

For R, pinned primary documentation establishes how existing Rayon mechanisms work: [ThreadPool](https://docs.rs/rayon/1.12.0/rayon/struct.ThreadPool.html), [join](https://docs.rs/rayon/1.12.0/rayon/fn.join.html), [scope](https://docs.rs/rayon/1.12.0/rayon/fn.scope.html). Bounded CPU-only join on the current pool is the selected candidate. These references establish no OpenLegend speedup; the real work, synchronization and memory costs remain measured outputs.

Implementation must reconcile newer code and evidence only where it affects these owners. Do not reread or rewrite the entire research corpus every time the active branch advances. No inaccessible implementation branch is asserted as the present blocker.

# Scaling implications of invention and extensible mechanics

[Scaling index](README.md) · [Code evidence SCA41–SCA45](current-code-audit.md#sca41)

**Status:** audit-derived implementation guidance for the existing INV/EWF contracts. This does not introduce a second construct schema, select arbitrary content caps, authorize generated code, or assert that broad composition is already implemented. [World-module runtime](../../archive/07-technical-architecture/world-module-runtime.md) owns dependency/work semantics; [declarations](../../archive/07-technical-architecture/declarations-and-evolution.md) owns invention admission. Detailed new child work is [SC12–SC14](../maintainers/scaling.md#sc12).

## Two different growth problems

**Library growth** means more learned techniques, admitted definitions, provenance and historical versions. It should mostly affect indexed storage and the particular query being asked. It must not require all definitions in every prompt, one fresh embedding of the entire library at first search, or a scan of every recipe before admitting one result.

**Active simulation growth** means more running instances, relevant targets, recurring effects, modified geometry and required evidence. It consumes native CPU, working memory, persistence and fanout even when the library has only one definition. Ten thousand copies of one effect can be more expensive than a million inactive definitions. An arbitrary recipe-count limit addresses neither access pattern correctly.

The current code exposes both early seams: `searchInventions` materializes the learned library and fills missing vectors on demand; `admitDeclaration` scans for canonical matches; attribute admission scans entities/plans for dependencies. Existing finite recipe validation is useful, but is not a guarantee for future selectors, invocations, machines or environmental rules.

## Admission must understand the expanded work

Use the existing family/construct metadata to identify the work actually consumed by a supported invocation. Keep the data with its semantic owner and exact immutable definition/version. The following are review dimensions, **not a new mandatory serialized format**:

| Dimension | Why it changes scale | Concrete example |
|---|---|---|
| Read/write ownership | Determines what can remain local and atomic | A gift transfers one owned item; a global ritual tries to mutate actors in several regions. |
| Query membership | A new matching entity can matter even if no prior returned entity changed | A newly spawned creature enters a maintained healing field. |
| Spatial/graph extent | A single large object or nonlocal link can widen every query | A giant body inflates point-grid contact candidates; a telepathic link crosses regions. |
| Trigger and clock | Per-step, on-change and due-time work have different demand | A status rule tested every simulated second costs 60 evaluations per real second at the current 1× ratio. |
| Expansion and recurrence | Nested selectors and descendants multiply work | Each target emits an event that starts another area effect. |
| Required output | Genuine affected targets/evidence cannot be optimized away | Every legitimate listener must acquire their allowed speech detail. |
| Mutable topology | Rebuild/invalidation can dominate steady-state execution | A moving wall changes navigation, sight, sound and support membership. |
| Persistence and lineage | One effect can touch many records and dependent summaries | A shared event has actor-specific acquisition records and later corrections. |
| External work | Native effects and paid inference have different authority/cost | An ordinary fire cannot autonomously grant a model unlimited spending. |
| Lifecycle | Disabling/upgrading cannot resurrect or duplicate resources | A running machine retains consumed fuel and its pinned process definition. |

A per-node operation count or maximum nesting depth is insufficient. A shallow selector can have enormous fanout; a small recurring effect can accumulate an unbounded queue. Validate the combined active work and scheduling behavior, using supported technical limits and measured host/region admission. Preserve content growth through storage/query architecture rather than a lifetime count ceiling.

## Separate the cost classes

Measure native candidate discovery, exact geometry/rule evaluation, required effects, acquisition recipients, dirty records/bytes, projection recipients, index work and paid calls separately. A useful accounting decomposition is:

```text
work for admitted activity
 = discovery + exact native effects + required evidence
 + durable changes + recipient projection
 + separately admitted optional cognition/indexing/presentation
```

This is a way to attribute work, not a calibrated formula or proof of runtime cost. The coefficients and workload distributions must come from PF measurements. A native effect cannot be made safe by merely assigning it a small estimated cost label.

The scheduler may coalesce redundant wake signals and defer optional maintenance; it may not silently drop physical effects or memories the owning specification requires. Technical unavailability must remain technical. A user should not be told that a plausible action violates world physics merely because its unimplemented solver exceeds current host support.

## Locality is a capability, not a restriction on imagination

A supported local rule uses owner-scoped inputs and existing effects. A rule whose influence crosses an authority boundary needs a supported protocol with explicit timing, permission and resource semantics. A selector that returns references is not permission to mutate arbitrary remote state.

The accepted shared-world goal makes this boundary relevant now, even while the implementation remains single-writer. Start with region-compatible query/mutation interfaces; do not implement a speculative distributed solver. Preserve unusual nonlocal ideas as unsupported capability requests or staged prototypes until the relevant interface exists. Do not silently turn them into local effects with a different meaning.

Graph locality can differ from geography. A connected structure, container hierarchy, conversation or institutional resource can span cells. Co-locate tightly coupled state when possible; otherwise name the invariant and coordination owner. The map tile is not automatically the unit of atomicity.

## Mutable rules require a dependency-aware activation boundary

Track active and retained dependencies under the existing INV-5/EWF07 owner: instances, resources, native processes, goal/plan references, queued proposals, installed constructs, derived indexes and retained save/content pins where required. A rule can be unused in the current visible scene while still required by an offstage process or retained checkpoint.

Validation can be staged against immutable inputs outside the writer's critical section, but activation must recheck the relevant dependency/version boundary. Do not make a stale compile approve a wider selector or a different body/effect domain. Once activated, all affected consumers need old/new extent and query-membership invalidation, including stationary observers and newly matching entities.

Changing an implementation or parameter can change cost without changing the outer schema. Re-evaluate work assumptions on compatible-looking updates, port substitutions and topology changes. A library version pin is necessary but not enough: the host implementation/version and active state conversion matter too.

## Worked growth cases

### A learned recipe library

**Current pressure:** full learned-array preparation, missing-vector batches and canonical-match scanning. **Target:** exact content/revision lookup and background derived indexing; an actor's search first selects eligible definitions, then ranks bounded results. Public immutable definition vectors can be reused only under a deliberate scope model. An inaccessible technique must not appear in search results, logs or a global cache side channel.

**Proof:** grow learned recipes while holding the requested result fixed; separately grow inaccessible recipes. Measure all preparation and provider work, not just SQL top-five latency. Show missing-index coverage explicitly. [SC12](../maintainers/scaling.md#sc12)

### A spreading fire

**Current/future distinction:** current campfire fuel and finite native rules do not implement a general environmental solver. A future spread family must own fuel, affected material sections, local neighbor queries, event-time exposure and recurring deadlines.

**Pressure:** fire creates more burning targets, geometry changes invalidate paths/support, witnesses create memory work, and reactions may request inference. An initially small event can grow across several layers.

**Proof:** preserve material/fuel accounting, terminate zero-time cycles, handle dense legitimate effects and test boundary propagation. Do not cure overload by skipping arbitrary burned targets or witnesses. New solver work remains a distinct supported-family extension. [SC13](../maintainers/scaling.md#sc13)

### An automatically activating status effect

**Current pressure:** the native step visits every entity. **Incorrect shortcut:** iterate only entities already carrying an active effect; that misses the first activation.

**Target:** a maintained applicability/dependency/due index that includes qualifying inactive entities, updated by every relevant writer and definition change. **Proof:** a threshold crossing on a previously unaffected actor activates once after creation, edit and restore, without scanning distant unrelated scenery. [SC15](../maintainers/scaling.md#sc15)

### A large moving creature or structure

**Current pressure:** contact broad-phase radii use population-wide maximum body dimensions; geometry changes have several consumers. **Target:** conservative extent-aware discovery and localized old/new-bound invalidation, plus a defined ownership policy for connected structures.

**Proof:** one large body should not force every small-body query to enumerate a world-sized cube; exact legitimate contacts remain complete. Moving support/destruction still needs native lifecycle behavior before admission, not just a new model asset. SW/EPR plus [SC13–SC14](../maintainers/scaling.md#sc13)

### An effect that provokes other effects

**Pressure:** every entity entering an area emits an event; that event invokes another selector which re-emits the first event. None of the individual functions needs to be slow for the composition to be unbounded.

**Target:** explicit causal identity, scheduling phase and convergent/bounded recurrence under the existing module contract. Optional reasoning cannot reauthorize the triggering external work indefinitely. **Proof:** cyclic and high-fanout fixtures either execute within a supported finite contract or are rejected/deferred before partial authority is committed. [SC13](../maintainers/scaling.md#sc13)

## Delivery without premature infrastructure

NOW: annotate supported family ownership/dependencies, retain immutable definitions and separate per-instance state, and route query/mutation access through existing owners. Keep source/operation identities, native/provider separation and deterministic ordering.

SOON: implement library lookup/index work, reverse dependencies and incremental active queries as their current workloads require. Add the worked cases to INV/EWF/PF acceptance and preserve previously implemented reuse/modify/new functionality.

LATER: activate cross-region effects, structural solvers, richer physics or isolated executable extensions only with a consuming mechanic, a tested protocol and an explicit support boundary. A generic registry, a WASM sandbox or a distributed database is not proof of semantic correctness or bounded aggregate work.

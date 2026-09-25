# Environmental simulation, construction and evolving physical laws

[Research index](../README.md) · Proposed analysis, not an accepted thermal/fluid/structural solver. The existing [simulation-scope direction](../../../03-design-proposals/simulation-scope-and-complexity.md), [spatial specification](../../../../docs/spatial-world.md) and world-module/declaration contracts retain ownership.

## Why this matters beyond ordinary MMO entities

A creator can introduce a structure or process that couples many systems: a wall changes travel, sight, sound and shelter; a fire changes fuel, local hazards and perception; a machine converts resources and may create recurring work. Even when every individual operation is cheap, their dependency graph can grow expensive.

Keep descriptive plausibility separate from implemented mechanics. A material named “copper” does not automatically introduce electrical circuits, heat conduction, corrosion and structural stress. Each supported relation needs an admitted owner, inputs, units, outputs and lifecycle. This preserves coherent invention without obliging the engine to simulate every physical property in existence.

## 1. Choose a representation per supported phenomenon

| Phenomenon | Plausible initial representation | Later representation when justified | What must remain explicit |
|---|---|---|---|
| Fuel-burning source | Finite fuel and bounded local effects | Multiple connected combustible sections | One resource owner; actual consumption and extinguishing |
| Moisture or temperature-like state | Bounded per-object/cell quantity with defined rates | Coupled spatial fields | Units, stability, boundary conditions and rate changes |
| Shelter | Geometry-derived coverage under a supported weather model | More detailed openings/material transmission | Geometry revision and what is actually simulated |
| Structural support | Authored supports and admitted removal/recovery rules | Connectivity/load analysis for a supported family | No floating occupants; no invented engineering guarantees |
| Ecology | Explicit finite populations/resources and native processes | Approved cohort/spatial aggregate model | Reproduction/death/resource accounting and identity policy |
| Production machinery | Versioned process consuming specified inputs | Networks of coupled processes | Reservations, conservation, shutdown and cyclic dependencies |

These are design options, not an instruction to add all rows. Start with the smallest model that supports the intended player choice. Avoid two independently writable representations of the same energy, fuel, support or population.

## 2. Use local influence and declared dependencies

A process should query a conservative relevant neighborhood, not scan the world. Spatial extents matter: a long wall or large fire cannot be indexed solely by its center if effects extend farther. The broad-phase principles in [S47](../sources.md#s47) are useful here, but each physical family defines its own exact effect rule.

Represent dependencies such as geometry → shelter or heat exposure → drying explicitly enough to invalidate affected results. Do not globally rebuild navigation and every actor's context for an unrelated local edit. Conversely, an edit affecting support, acoustics and sight cannot notify only the renderer.

A proposed transaction boundary for a wall edit is: validate admission and supported occupant consequences; commit physical geometry and required state effects under the authority; advance the relevant geometry revision; invalidate dependent accelerators; publish only permitted consequences. Derived preparation can happen asynchronously where safe, but unavailable navigation is not proof that a route is impossible.

## 3. Exact integration must honor discontinuities

For a supported constant-rate process, `new amount = old amount + rate × elapsed time` may eliminate repeated evaluations. But it is valid only over intervals where the rate and applicable rules remain unchanged. Split at fuel exhaustion, rain changes, capacity limits, damage events, input changes and other relevant discontinuities.

A lazy update at time T must not use a newly installed roof to retroactively shelter an object for the entire preceding interval. A fire that exhausted fuel halfway through an interval must not continue heating afterward. A threshold that causes an observable event must be processed at the appropriate causal boundary.

Where a numerical solver is necessary, timestep, resolution and coupling determine the chosen model's stability and accuracy. Increasing simulated speed must not silently increase numerical step size beyond that contract. The fixed-step reference remains valuable for validating a proposed optimization. [S15](../sources.md#s15)

## 4. Conservation and cycles are compositional constraints

For a conserved quantity, every transfer has a source debit and destination credit under a defined owner/transaction. Generation, dissipation or destruction is explicit authored behavior, not an unexplained discrepancy. Quantities with different units cannot be added merely because they are both numbers.

A network of machines can contain feedback. Bound processing per causal wave and define how recurrent processes advance in simulation time. A zero-time cycle that continually emits new work is a scheduler hazard even if each component respects its local quota.

Changing a definition must preserve or explicitly migrate active resources. Replacing a furnace's schema cannot refill its fuel from defaults. Loading an old save cannot restart an already exported batch of goods as independently transferable inventory.

## 5. Structures create locality exceptions

A large connected structure can span candidate sectors. Its support graph, contacts or internal transfers may require one authority even when its geometry occupies several cells. A spatial tile is therefore an acceleration/placement choice, not a universal mechanical boundary.

Initially, reject unsupported structural edits rather than letting a platform vanish under actors without a recovery rule. Later, a supported family may compute a bounded collapse and falling outcome. Rendering debris is separate from authoritative bodies: cosmetic fragments need not each become a permanently simulated entity.

**Proposed experiment:** remove a support near several differently sized occupants while adjacent regions remain active. Verify legal outcomes, identity, carried items, evidence and geometry invalidation. Count the connected affected set and the work required to stabilize it.

## 6. World age and environmental persistence

An unattended process may remain causally relevant without a nearby human. If empty worlds continue, a fire, crop, appointment or machine still needs its accepted progression. If they pause, that is a clear hosted-world policy. Merely evicting the region from RAM cannot decide the outcome.

Cold-region records should preserve current process state, clocks, input versions and future deadlines needed for correct continuation. Waking should not require replaying every historical render frame. Any analytic catch-up needs the correct history of relevant rate changes, not just a final snapshot.

A statistical offstage ecology can be much cheaper, but it changes the representation. Define which named individuals and observed facts remain protected, and how aggregate state becomes detailed again. See [architectural options](../architectural-options.md) and [decision questions](../decision-questions.md).

## 7. Measure expansion, not only one callback

For each physical family, record active instances, queried cells/objects, exact interactions, connected-component size, downstream invalidations, emitted evidence, state bytes and due work. Include worst-case creator compositions, not only the bundled wilderness.

Useful fixtures include a forest-wide spread front, many tiny fires, one enormous structure, repeated door edits, competing input consumers, a cyclic production network, and an old cold region waking under a changed rule version. Each is a proposed test shape, not proof that these mechanics currently exist.

A successful design bounds required work or explicitly limits admission while preserving chosen laws. It does not hide missing simulation behind plausible generated narration. A model may describe a supported consequence; it cannot fabricate a physical outcome merely because computing it was expensive.

# Sleep and waking

Sleep is authored default-world content in [status-effects.yaml](../packages/domain/config/status-effects.yaml), executed by the generic [status-effect runtime](status-effects.md). It is not an engine state, flag, scheduler or renderer special case. This document owns the default mechanic; the runtime document owns configuration, operations, targets and admission.

## Configuration

Edit the YAML source and run `pnpm config:generate`; normal dev/start/build commands also generate it. The generated JSON is runtime input, not a second authored definition. `pnpm config:check` detects drift. Existing saved registries retain creator edits; apply configuration changes to those worlds through the status-effect policy admission endpoint.

The `wilderness:restorative-rest` definition explicitly reads/writes the registered `wilderness:energy` attribute. It applies to living, conscious, grounded actors with that attribute, including native animals. There is no daily rest quota, accumulated debt or delayed onset.

- Players never activate it automatically. They can choose **Sleep** explicitly when energy is below full.
- Other eligible actors activate at energy **less than or equal to zero** at any time, or below 70 during the daily 22:00–06:00 game-time window. The default local clock starts at 08:00.
- Energy increases by `100 / 28800` percentage points per game second while active. Empty-to-full takes eight game hours; smaller deficits take less time. Energy reaching 100 ends the effect.
- The separate energy-expenditure definition drains 0.0015 points per game second during work/flight/fleeing, or 0.0005 otherwise, only while restorative rest is inactive.
- Ending the effect suppresses automatic reactivation for 300 game seconds. Explicit activation remains available during this grace period.

The definition restricts actions, locomotion, speech and perception, occupies the actor's current action, and requests a horizontal pose with drifting `zzz`. An airborne actor must first land. Injury, urgent native food intake, recovery and explicit interruption can end the effect without refunding consumed materials or marking interrupted work successful.

## State and observable transitions

The definition emits exactly **“{subject.name} fell asleep.”** and **“{subject.name} woke up.”** through the normal witnessed-event boundary. Body death/incapacity clears the instance without misleading wake narration. Generic status-effect episodes own elapsed duration, completion and save/load behavior; there is no duplicate `actor.rest` state.

## Interaction and pending replies

**Wake Up** ends one's own effect. The same action may target another perceived entity within physical reach; approaching remains separate. The default permits waking others but not forcing them to sleep. Ordinary speech does not automatically wake a recipient. Sleep interrupts current work; speech restriction cancels pending replies and rejects late speech at admission. An already-committed response remains legitimate. See the [generic capability and narration contract](status-effects.md#capabilities-and-presentation).

## Persistence and presentation

The generic registry and entity instances are saved with the world, following the [active development policy](save-and-load.md#active-development-policy). Public projections carry generic labels/pose/particle data. Dreams are optional cognition work: [memory architecture](memory-architecture.md#9-sleep-dreams-forgetting-and-consolidation) owns their configured effect-episode requirement. Native recovery never waits for provider credentials, paid work or dream completion.

# Sleep and waking

Sleep is authored default-world content in [status-effects.yaml](../../../packages/domain/src/worlds/base/config/status-effects.yaml), executed by the generic [status-effect runtime](../../status-effects.md). It is not an engine state, flag, scheduler or renderer special case. This document owns the default mechanic; the runtime document owns configuration, operations, targets and admission.

## Configuration

Edit the YAML source and run `pnpm config:generate`; normal dev/start/build commands also generate it. The generated JSON is runtime input, not a second authored definition. `pnpm config:check` detects drift. Existing saved registries retain creator edits; apply configuration changes to those worlds through the status-effect policy admission endpoint.

The `wilderness:restorative-rest` definition explicitly reads/writes the registered `wilderness:energy` attribute. It applies to living, conscious, grounded actors with that attribute, including native animals. There is no daily rest quota, accumulated debt or delayed onset.

- Players never activate it automatically. They can choose **Sleep** explicitly when energy is below full.
- Other eligible actors activate at energy **less than or equal to zero** at any time, or below 70 during the daily 22:00–06:00 game-time window. The default local clock starts at 08:00.
- Energy increases by `100 / 28800` percentage points per game second while active. Empty-to-full takes eight game hours; smaller deficits take less time. Energy reaching 100 ends the effect.
- The separate energy-expenditure definition drains 0.0015 points per game second during work/flight/fleeing, or 0.0005 otherwise, only while restorative rest is inactive.
- Ending the effect suppresses automatic reactivation for 300 game seconds. Explicit activation remains available during this grace period.

The definition restricts actions, locomotion, speech and perception, occupies the actor's current action, and requests a horizontal pose with drifting `zzz`. An airborne actor must first land. Injury, recovery and explicit interruption can end the effect without refunding consumed materials or marking interrupted work successful.

### Selected native alarm rest rule

**Designed, runtime pending — October 17, 2026.** [CTR03–CTR04](../../maintainers/combat-and-threat-responses.md) and the [animal response contract](animal-responses.md#ordinary-rest-and-exhausted-rest) select a narrow change to the current defaults above. The ordinary night-rest branch additionally requires `nativeResponseActive == false`; the independent energy-at-or-below-zero branch retains its current authority. The new field is a readonly fact from the installed native response owner, not another energy/feeling meter or an engine animal-name rule. For a resolved entity with no installed response episode it is false.

The bundled rest definition also admits an authored `perceived-danger` interruption. A newly permitted alarm observation may dispatch it once for a living, non-incapacitated native body with applicable positive energy, through the existing status end owner. Retained alarm or regeneration alone cannot replay waking; a continuous `alarm && energy > 0` automatic end would incorrectly wake exhausted rest on its first tiny gain. The current full-energy completion, recovery rate, 300-game-second reactivation delay, injury interruption and explicit wake admission stay with their existing owners.

Ordinary night rest cannot therefore begin during an active escape/settling/blocked episode. Actual exhausted rest and other capability loss remain possible and clear the animal's continuous safety interval. Stationary settling/blocked alarm does not count as moving work merely because the episode remains active. Current sleep still restricts perception, so nearby hidden danger cannot fabricate a wake observation. This selected native policy changes no ordinary person's rest choice and requires no model call. The canonical animal contract owns exact predicates, ordering and continuation; implementation and actual qualification remain open in the tracker.

## State and observable transitions

The authored templates are **“{subject.subject:definite} fell asleep.”** and **“{subject.subject:definite} woke up.”**, rendered through the shared [name-template grammar](../../entity-names.md#authored-narration-templates) and normal witnessed-event boundary. Body death/incapacity clears the instance without misleading wake narration. Generic status-effect episodes own elapsed duration, completion and save/load behavior; there is no duplicate `actor.rest` state.

## Interaction and pending replies

**Wake Up** ends one's own effect. The same action may target another perceived entity within physical reach; approaching remains separate. The default permits waking others but not forcing them to sleep. Ordinary speech does not automatically wake a recipient. Sleep interrupts current work; speech restriction cancels pending replies and rejects late speech at admission. An already-committed response remains legitimate. See the [generic capability and narration contract](../../status-effects.md#capabilities-and-presentation).

## Persistence and presentation

The generic registry and entity instances are saved with the world, following the [active development policy](../../save-and-load.md#active-development-policy). Public projections carry generic labels/pose/particle data. Dreams are optional cognition work: [memory architecture](../../memory-architecture.md#9-sleep-dreams-forgetting-and-consolidation) owns their configured effect-episode requirement. Native recovery never waits for provider credentials, paid work or dream completion. A world can explicitly set its dream policy to null; that omits dreaming without adding a default rest rule. Quiet configured starvation does not wake this world's sleeper.

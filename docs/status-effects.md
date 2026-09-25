# Declarative status effects

This document owns the finite status-effect runtime. Worlds author named mechanics as data; the runtime evaluates conditions, applies registered operations, and commits observable transitions. [Sleep and waking](worlds/base/sleep.md) owns the default world's restorative-rest content, not engine behavior.

## Configuration

`world.statusEffectPolicy` contains `revision`, `clockOffsetHours` and an ordered `definitions` array. A definition has `type: "statusEffect"`, a unique `id`, `target: "$subject"`, `label`, `enabled`, `requires`, `reactivationDelaySeconds`, `occupiesAction`, `interruptOn`, and `whileActive`. Optional fields are `activationCondition`, `automaticActivation`, `automaticDeactivation`, `actions`, `presentation`, `onActivate`, and `onDeactivate`. The TypeScript schema is in [status-effects.ts](../packages/domain/src/status-effects.ts); authored defaults live in [status-effects.yaml](../packages/domain/src/worlds/base/config/status-effects.yaml). `pnpm config:generate` parses YAML and validates it against the default world registry before producing the checked-in `status-effects.generated.json`. Dev/start/build regenerate it; `pnpm config:check` rejects drift. The domain imports only generated data, with no YAML parser or file I/O. Edit the YAML rather than generated JSON. Existing saved policies remain authoritative and are updated through policy admission, never overwritten at startup.

Conditions compose nonempty `all`/`any` groups. A `compare` names a target, registered numeric attribute, operator (`equal`, `notEqual`, `lessThan`, `lessThanOrEqual`, `greaterThanOrEqual`) and value in that attribute's units. A `field` comparison names a target and one supported host property: controller, alive, incapacitated, grounded, activeWork, or kind. `activeWork` means an action, airborne movement or native fleeing. `dailyWindow` names `$world`, `localTime`, and start/end hours in game time, including windows across midnight. `statusActive` names another definition and an entity target. There is no expression-string evaluator, JavaScript or cron parser.

`requires` determines applicability; loss of applicability ends an active instance. `activationCondition` applies to both explicit and automatic activation. `automaticActivation` is an additional condition for simulation-driven activation; omission means explicit activation only. `automaticDeactivation` ends an instance on a matching condition. Explicit activation ignores the automatic reactivation delay.

`whileActive` supports:

- `changeRate`: explicit entity `target`, registered `attribute`, signed `amount`, and `per: "gameSecond"`. An optional `when` condition gates this operation. Values clamp to the registered numeric range, and writes use the attribute's authoritative owner.
- `restrictCapabilities`: explicit `$subject` target and any of `actions`, `locomotion`, `speech`, and `perception`. This v1 operation restricts the receiving entity; effects on another entity's capabilities require a separately admitted instance on that entity.

Awake resource expenditure can be a separate definition with conditional negative rates; it is not implicit behavior of the runtime. Dream eligibility belongs to cognition policy, which names an effect definition and an elapsed-time minimum. It is not a status-effect operation.

## Targets and attributes

An instance belongs to an **entity**, not an actor component. `$subject` is that entity; `$source` and `$actionTarget` are explicit entity IDs bound when the instance is admitted. Automatic activation binds all three to the receiving entity. Manual command admission binds the source to the acting entity and the action target to the selected subject. Trusted domain compositions may bind a different action target, allowing an effect attached to one object to change another object's value. Those bindings are saved, not dynamically selected every tick. There is no global entity query or arbitrary object-path writer.

Attribute IDs resolve through the existing world-module registry. Actors retain their existing attribute/native-value owners. Non-actors may carry sparse registered reservoir/category state on `entity.attributes`; native body attributes cannot be installed on objects. Missing attributes or unresolved targets are inapplicable, including for inequality; missing is never zero. Rate targets must be available at activation and while active. Current writable rate adapters support energy, fullness and generic reservoirs. Health changes remain with the body-effect owner; this runtime does not bypass injury, death or body revision semantics.

This is a finite v1 family, not an arbitrary effect language. Extend the operation owner when a concrete mechanic needs another trusted operation; do not add parallel values or interpret new fields implicitly. Broad authoring of object attributes, arbitrary target selection, persistent area effects, stacking, priorities and generalized resource transfers are not implemented.

## Transitions

`activateStatusEffect`, `deactivateStatusEffect` and `interruptStatusEffects` are the shared mutation boundary. A saved instance contains an active flag, episode ID, elapsed seconds, automatic reactivation deadline and source/target IDs. An occupying actor effect interrupts previous work without refunding consumed inputs, creates one ongoing action tied to its episode, and completes or interrupts the associated plan through the existing owner. Non-occupying effects also work on objects. An occupying effect requires an actor because native plans/actions are currently actor-owned.

Each fixed step processes entities and definitions in saved order. It resolves activation/deactivation before applying rates for that entity, then checks completion after rates. A completed restoring effect cannot also start an opposing expenditure effect for the same interval. There is no unbounded condition fixed-point loop. Multiple active rates compose in definition order and clamp individually; conserved transfers need their own future operation rather than two independent rates.

Host interruption reasons, such as injury, hunger, voluntary cancellation or a new action, are matched against the authored `interruptOn` list. Body unavailability always clears active instances: a dead/incapacitated actor cannot retain an occupied native action. This cleanup suppresses deactivation narration because the lifecycle owner emits the truthful event. Invalidated rate targets end the instance rather than redirecting effects to another entity.

`onActivate` and `onDeactivate` optionally emit a `stateChanged` event with an explicit target and narration template. Only `{subject.name}`, `{source.name}` and `{actionTarget.name}` substitutions are supported. Committed events use the existing observation audience, experience and conversation boundaries. They are narration, never speech or accepted model responses. Temporary perception restriction does not itself declare a participant physically out of conversation range; ordinary distance/inactivity rules still apply.

## Capabilities and presentation

Command admission checks the relevant restrictions. A subject may explicitly deactivate its own active effect or cancel even while general actions are restricted. Physical interaction with another entity must be authorized by the definition and pass the existing visibility/reach check. The shared server action builder supplies authored labels to player menus and NPC candidates; `actions` declares activation/deactivation labels plus `allowOther` and `activateOther`. An effect can therefore permit waking another actor without permitting forcing that actor into the state.

Movement/ambient locomotion, speech admission and sensory queries consume generic capability restrictions. A pending conversational/decision run is canceled when speech becomes unavailable; final response admission independently rechecks it. An already-committed response remains accepted even if its own action activates a restriction. Cancellation does not invent a narration event.

Public projections contain only permitted active labels and presentation data. Internal bindings and object attributes are stripped from general observations. `presentation.pose: "horizontal"` changes the billboard pose, not the physical body. The supported particle configuration names text, `anchor: "head"`, and `motion: "floatAway"`; reusable DOM markers animate without an accumulating particle queue. Markers disappear with the effect or observation, respect floor visibility, freeze on pause and remain static under reduced motion. The renderer knows no named mechanic.

## Admission and persistence

The creator-only `POST /api/god/status-effects` accepts `{}` to inspect the registry, or `{policy, expectedRevision}` to replace it. Admission validates every operator, field, attribute and definition reference before committing. It rejects stale revisions and unknown fields. Changed/removed definitions deactivate their existing instances under the old definition before replacement; unchanged definitions retain their episodes. The world agent/settings editor are future consumers of this same boundary.

Validation rejects more than 128 definitions, 32 operations per definition, or a condition with more than 128 nodes/depth 12. These are explicit execution-complexity safeguards on authored programs, not truncation of entity lists. Runtime work is proportional to entities, admitted definitions and active operations; spatial indexing or compiled applicability plans require measured need.

Policy, instances, elapsed time and bindings serialize with the world. Current-state validation checks definition/instance/action integrity and attribute ownership. Startup and manual-save loading convert a missing registry to the authored default in place under the [active development policy](save-and-load.md#active-development-policy). Existing rest actions retain their IDs and dream elapsed time as current effect instances; obsolete rest/debt and sleep-policy fields are removed. Saved energy, world identity, gameplay history and accounting are retained. Existing registries are not overwritten. The runtime uses only the current model, with no per-feature save version. Pauses and ordinary save/load do not replay wall-clock time.

## Scaling follow-through

[Audit SCA23](scaling/current-code-audit.md#sca23) identifies the current full-entity visit in every native step. The separate actor/ambient roster does not remove that status pass. Before extending this family to much larger populations, [SC15](maintainers/scaling.md#sc15) supplies focused applicability/active-work indexing under PF03/PF09 and EWF08.

An index of active instances alone is insufficient: automatic activation can begin on an entity with no current effect. Track relevant applicability, referenced attributes/fields, due windows, cross-effect conditions and source/target lifecycle. Creation, death, capability changes, owner edits, definition replacement and restore must update the index through the existing semantic owners. Preserve saved entity/definition order, threshold crossings, rate/clamp order, occupying-action semantics and event-time audiences. Analytic skipping or a larger timestep requires separate equivalence evidence.

The existing finite condition/operation validation does not establish the aggregate cost of many active instances, shared target bindings or future area selectors. [SC13](maintainers/scaling.md#sc13) and [mechanic-growth guidance](scaling/mechanic-growth.md) cover transitive work, query membership, recurrence and locality; [SC14](maintainers/scaling.md#sc14) covers reverse dependencies and coherent definition edits. Do not add arbitrary entity-count caps or silently omit applicable effects to pass a performance test.

Qualify fixed active effects with increasing unrelated scenery, newly applicable inactive entities, same-step activation/deactivation, changed referenced targets, rule replacement and save restoration. Record candidate/condition counts, longest native transition, generated audience/evidence work and achieved simulation speed. This section tracks required expansion/optimization work; it implements no index, new effect family or capacity guarantee.

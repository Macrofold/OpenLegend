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

This is a finite v1 family, not an arbitrary effect language. Extend the operation owner when a concrete mechanic needs another trusted operation; do not add parallel values or interpret new fields implicitly. Broad authoring of object attributes, arbitrary target selection, persistent area effects, arbitrary stacking priorities and generalized resource conversion are not implemented.

### Independent capability contributions

A non-occupying definition containing only capability restrictions may opt into
`contribution: { disclosure, lifetime }`. Disclosure is `owner` or `public`; lifetime
is `explicit-removal`, `source-sustained`, or `fixed` with positive `seconds`.
Automatic activation is unsupported for this branch. Existing native statuses retain
their singleton and ordered-rate behavior.

Each contribution uses its episode as its saved instance key and retains its source,
target, exact definition digest, revision and lifetime. Ordinary status commands bind
the source to their admitted actor. Their deactivate action removes that source's
contribution, leaving other sources active. Explicit domain attach/refresh/end ports
retain request receipts; refresh cannot resurrect an ended episode or change its
lifetime family. Ending a contribution never restores an old body snapshot.

Capability queries read all active contributions plus the native status. Owner
projections show repeated sources as a count; public projections omit owner-only
definitions and never include source bindings. Fixed deadlines use simulation time.
Source-sustained instances stop applying immediately when their source disappears, dies,
retires or belongs to an inactive containment root; the native phase finalizes the state.
Whole-object movement preserves source identity; live incoming source references prevent
split/merge from silently changing it. Existing native
requirements and interruption rules also apply. Definition replacement/removal is
rejected while retained contributions need the old exact definition; unsupported
live migration is not silently performed.

After commit, terminal independent instances leave the hot world but remain in
`sim_status_effects`. Native singleton cooldown records remain resident. Active reload,
full save capture and explicit policy maintenance use the same canonical records, with
durable ordering across partial maps. Caller-supplied new identities require complete
history; an exact retained command receipt still replays without resurrection. Native
commands allocate fresh monotonic episode IDs. Policy maintenance materializes history
before validating exact pins, including ended contributions.

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

The creator-only `POST /api/god/status-effects` accepts `{}` to inspect the registry, or `{policy, expectedRevision}` to replace it. Admission validates every operator, field, attribute and definition reference before committing. It rejects stale revisions and unknown fields. Changed/removed native singleton definitions deactivate their existing instances under the old definition before replacement; unchanged definitions retain their episodes. Retained independent contributions instead require their exact old definition and reject unsupported replacement/removal. The world agent/settings editor are future consumers of this same boundary.

Validation bounds each definition to 32 operations and each condition to 128 nodes/depth 12.
Combined installation and invocation admission use versioned work vectors and current
actor/module/world/host limits, rather than an arbitrary definition-count cap. Required
native query/effect work is charged without truncating audiences or silently skipping
effects. Runtime work follows physical roots and active operations; terminal independent
history is queried only through explicit maintenance/capture paths.

Policy, instances, elapsed time and bindings serialize with the world. Current-state validation checks definition/instance/action integrity and attribute ownership. Startup and manual-save loading convert a missing registry to the authored default in place under the [active development policy](save-and-load.md#active-development-policy). Existing rest actions retain their IDs and dream elapsed time as current effect instances; obsolete rest/debt and sleep-policy fields are removed. Saved energy, world identity, gameplay history and accounting are retained. Existing registries are not overwritten. The runtime uses only the current model, with no per-feature save version. Pauses and ordinary save/load do not replay wall-clock time.

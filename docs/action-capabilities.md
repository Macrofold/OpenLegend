# Action capabilities: grounding intent into simulation activity

**Status: target specification, not implemented behavior.** The [action repertoire](repertoires/actions.md) supplies examples; [delivery and acceptance](maintainers/action-capabilities.md) belong to the focused AC subtracker. This design is grounded in that repertoire rather than a list of survival-game verbs. Current implementation and evidence remain in [Architecture](architecture.md) and [Verification](verification.md).

## Ownership and scope

This document owns the detailed **intent-grounding contract, capability invocation binding, and reusable activity-composition semantics** beneath [agency open-action resolution](../archive/07-technical-architecture/agent-agency-runtime.md#5-open-action-resolution). It refines, rather than replaces, the [action-family integration contract](../archive/07-technical-architecture/world-module-runtime.md#7-action-families-and-agency-integration).

| Existing owner | Retained responsibility | This specification adds |
| --- | --- | --- |
| AG | Decision operations, goals, plan ownership, native continuation, actor choices | Parameterized calls, structured grounding and bounded activity steps in that same plan |
| INV / common module runtime | Capability-family registration, definitions, admission, activation, world policy | The invocation view of those same descriptors; no second registry or invention lifecycle |
| SW | Geometry, topology, movement, route admission, spatial knowledge | Destination/relative-intent binding and maintenance requests to existing movement services |
| EPR / perception | Evidence production, scope, stimuli, reaction intake | Dependencies and observations used by guards, monitors and action-result consumers |
| NC | Communication, expressions, conversations and narration | Typed adapters; speech and request attempts do not become target-state setters |
| CR | Memory, attention, reflection and recall | Grounding references and retrieval remain within those boundaries |
| SL / application storage | Same-version recovery, load fencing, real external accounting | Accepted activity state and subscriptions join existing persistence |

No new ECS, distributed broker, general programming language, independent planner database, parallel action catalogue, perpetual LLM loop, or host scripting permission is required. Existing task IDs and acceptance states remain valid. Authoring, owner administration and in-world action use remain separate authority surfaces.

## 1. Architectural conclusion

**Translate meanings into permitted invocations, not English verbs into effects.** The unit of ordinary agency is an actor-authorized invocation or bounded composition of already available capabilities. That unit can last one instant or continue for hours. The engine evaluates its actual consequences.

A large repertoire requires five distinctions:

1. **An action attempt** asks for something executable now: move, offer an item, operate a device.
2. **A goal** describes a desired outcome whose means may be unresolved: earn trust, protect the village, find a home.
3. **An activity** maintains an already selected method: follow, patrol, keep watch, tend a fire.
4. **A process** has its own world owner after initiation: combustion, crop growth, an installed pump, a sustained admitted enchantment.
5. **An invention/authoring request** proposes a new reusable definition or change to the world's available behavior.

These distinctions are not five independent execution engines. Existing AG plans hold actor work. Capability families implement their own outcomes and ongoing state. Installed modules own passive/automatic processes. INV owns definitions. A completed `start_pump` action can leave a pump process running; a character manually carrying water remains occupied by an activity. Neither can masquerade as the other to acquire free labor.

### No invention is not the same as universal or currently implemented

Three independent questions must always be answerable:

- Does the host have an implementation or admitted interpreter capable of the behavior?
- Is the capability installed, enabled and available to this actor in this world?
- Is this request using that capability, or changing/creating a reusable definition?

A known spell is ordinary use in a magical world. Cooking is unavailable in a world without the relevant transformation/heat rules. Following does not need a new definition once the follow activity exists, but it still requires implementing a correct activity controller. Calling a behavior G0 does not implement it.

Likewise, persistence does not make something invention. Saving a route, plan or standing personal routine preserves an instance of chosen behavior. Publishing a new rule or machine-owned process definition is a separate decision.

## 2. Resolution ladder and invention boundary

Resolve using the least powerful faithful route, not the closest convenient action.

| Request situation | Resolution | Meaning |
| --- | --- | --- |
| A supplied grounded handle already matches | Bind that call | Zero semantic inference |
| A known capability needs new legal arguments | Parameterized invocation | New parameters are not a new mechanic |
| Several known calls express the chosen method | Bounded composition | Separate steps, costs, outcomes and dependencies |
| A known method must persist or react | Native activity template | Observe/act/hold/repeat without per-tick generation |
| Means are genuinely undecided | Actor planning or a retained goal | Do not disguise planning as interpretation |
| A target, quantity or consequential method is ambiguous | Clarification or unresolved intent | No arbitrary target or silent weakening |
| Necessary evidence is unavailable | Scoped inspection, recall, inquiry or deferral | Unknown is not false or impossible |
| A supported method is currently blocked | Concrete blocked result | No definition invention to evade the obstacle |
| A missing reusable definition is expressible through installed authoring families | INV request | Preserve actor method and existing locks |
| A required implementation/interface is absent | Unsupported capability | Later G2 only if its qualified interface already suffices; otherwise G3 engineering |
| The relevant policy forbids the operation | Named policy refusal | Rephrasing cannot change authority |

This uses [the existing generation levels](../archive/07-technical-architecture/declarations-and-evolution.md#generation-levels-and-executable-references). One-off plans are generally G0. Declarative definitions/compositions can be G1. A new bounded algorithm is G2 only through a qualified isolated runtime and permitted interfaces. A new host primitive or privilege is G3. The subject matter—fire, tracking, magic, society—does not determine the level.

### Composition is not an answer oracle

A compiler may bind an actor's selected method or fill mechanical details within explicit defaults. It cannot replace “follow the deer” with “hunt the deer,” “offer a berry” with “feed the berry,” or “cross without cutting trees” with a tree-cutting plan. A goal with unspecified means can receive an actor-authored proposed plan, but that is an actual planning decision under AG, with its own evidence and budget, not hidden semantic substitution.

Using existing causal rules creatively can produce new results without installing new laws. A placed plank may support a crossing; striking a pot may emit sound; covering a flame may reduce combustion. The respective mechanics must actually model those effects. If they do not, the compiler must not infer physical consequences from ordinary language or appearance.

## 3. The selected native foundation

“Native foundation” means a supplied reusable runtime/template library, not unconditional abilities for every possible organism. Physical templates are exposed only by compatible world services. A virtual graph world need not implement ground walking; a fungus need not implement speech, hands, inventory or autobiographical goals.

### 3.1 Protected execution substrate

These are engine/application responsibilities, never inventions:

| Substrate service | Contract |
| --- | --- |
| Intent admission and reference binding | Bind the real principal/controller, actor and request; resolve only permitted references |
| Descriptor lookup and typed argument validation | One INV/module registry; family-specific schemas and exact definition pins |
| Native dispatch and outcome identity | Start/advance/complete through owning mutations; truthful idempotent receipts |
| Bounded sequence, choice, wait and iteration | Native control flow over supported calls and predicates; no arbitrary evaluation |
| Activity lifecycle and resource arbitration | One current physical lane initially; interruption, cancellation, resumption and ownership |
| Scoped observation and dependency delivery | Consume permitted evidence, not raw hidden world state |
| Simulation clocks and deterministic budgets | Native time for work; external time/money for providers; bounded computation |
| Persistence and load fencing | Preserve accepted work and reject abandoned-timeline callbacks |
| Safe projections and diagnostics | Distinguish intent, admission, progress, outcome, evidence and presentation |

The substrate does not expose generic `set_property`, `change_health`, `spawn_anything`, `grant_knowledge`, `control_other_actor`, or `run_code` to ordinary actors.

### 3.2 Supplied reusable intent and activity templates

The following are selected for the foundational design. Their availability is still conditional; delivery is staged in the tracker.

| Template / operation | Parameter space | Repertoire witnesses | Required limitations |
| --- | --- | --- | --- |
| Navigate to a location | Point/support, known place, actor-relative displacement, topology-owned location reference | NAV-01–04, NAV-07–08 | No invented coordinates for an unresolved place; no wrong-floor projection |
| Approach once | Target, allowed proximity/stance, observation policy | NAV-05, REL-03 | Choose a reachable stance, not necessarily the target center |
| Depart / retreat | Threat/region, desired separation, route constraints | REL-05, CBT-08 | No guarantee of safety; no hidden target updates |
| Maintain a spatial relation | Near, behind, beside, between, facing where supported; tolerances; termination | REL-01–04, CBT-07 | Relation-specific geometry and knowledge; not merely one distance scalar |
| Visit a known route / patrol | Ordered scoped waypoints, repeat/termination policy | NAV-07, REL-07 | Persist cursor; changing geometry can interrupt |
| Orient | Known target, relative direction or supported frame | BOD-01 | Compatible body/pose provider; no implicit locomotion |
| Inspect / sample available evidence | Target/part/region, installed sense or query, desired detail | OBS-01–04 | No new sensing power or universal property inspection |
| Scan / search a bounded accessible scope | Scope, known predicate, coverage policy, budget | OBS-04, OBS-06 | Negative coverage is not proof of global absence |
| Monitor a permitted condition | Scope, predicate/event, edge/level policy, review/stop policy | OBS-05, AUT-04 | No omniscient event subscription or private-state alarm |
| Wait | Simulation duration/deadline, observed event or supported predicate | AUT-01–02 | Unknown and unavailable conditions are explicit |
| Sequence | Ordered calls with terminal outcome dependencies | AUT-03, MAK-12 | No immediate loop over timed commands |
| Conditional branch | Typed observable predicate, true/false/unknown dispositions | AUT-05 | Unknown never silently becomes false |
| Bounded iteration | Count, finite set, until condition or persistent qualified activity | RES-11, AUT-06–07 | Per-step budget, finite output and explicit continuation authority |
| Lifecycle control | Cancel, replace, pause where supported, resume after revalidation | AUT-11–12, MND-03–04 | Future authority changes, not rollback or refunds |
| Standard agency mutations | Own goals, review cues, attempts, private thought and existing recall/reflection operations | MND-01–12 | Available only to compatible controllers; use existing AG/CR owners |
| Interaction request / handoff pattern | Recipient, proposed role or task, expiry and actual acceptance | COM-05, COOP-04, CARE-12 | Communication and participation remain world capabilities; no forced second actor |

The foundation supports **calling any registered compatible family**, not only these templates. These templates reduce repeated implementation of common control semantics. They do not subsume all object mechanics.

### 3.3 Default-world capability families, not universal kernel verbs

The normal OpenLegend world should expose ordinary actions in these families when their mechanics are implemented. They require no invention merely to use them. Some already have narrow native implementations; others need new engineering. Refer to Architecture for that distinction rather than inferring implementation from this target list.

| Family cluster | Ordinary invocations to expose | What remains family/world-specific |
| --- | --- | --- |
| Existing survival and work | Gather, prepare, craft a known method, equip, hunt, harvest, cook, eat, replenish, rest, recover, cancel | Current material/body/recipe rules; native batch quantities and output types |
| Communication and expression | Say, ask, reply, join/leave, gesture; whisper/shout only when supported | Channel reach, intelligibility, anatomy, expressive versus mechanical effects |
| Possessions and containment | Pick up, put down, transfer, offer/accept, insert/remove, split/combine, carry | Capacity, load, access, custody, ownership, participation and stack semantics |
| Manipulation and devices | Open/close, turn, press, attach/detach, hold, move with supported force | State domains, geometry, resource channels and downstream mechanics |
| Care and social interaction | Help request, permitted treatment, rescue, teach a known technique, practice | Consent/emergency rules, anatomy, learning, skill and independent social response |
| Environmental use | Ignite with a source, extinguish by a method, pour, fill, heat, cool, plant, harvest | Combustion, fluids, growth, material compatibility and passive consequences |
| Worksites and transport | Build a known design, repair, disassemble, board, operate, unload | Structural/vehicle mechanics, shared work, production recipes and lifecycle |
| World-defined special abilities | Cast a known spell, use a configured machine, invoke an admitted body transformation | Applicable constitution, resources, target contracts and privileged effect owners |

Do not implement every row as a new switch branch. Expose the actual family invocation and target/quantity schema; let synonyms and compositions share it. “Pick up,” “give,” “offer,” and “eat” may all involve an item but have different semantics and cannot collapse into an unqualified transfer.

## 4. One capability registry, several views

Use INV-3 and the common manifest as the registry of record. A **host descriptor** identifies a reviewed implementation interface. An **installed definition** selects/configures supported behavior with pinned dependencies. A **known technique** is actor knowledge. An **invocation** binds arguments for one attempt. An **activity instance** stores ongoing execution. A **discovered affordance** is a scoped projection. These are related records, not interchangeable permissions.

The descriptor supplies the following invocation-facing fields. Names are illustrative contracts, not existing API fields.

| Descriptor field | Owner and semantics |
| --- | --- |
| Stable family/interface ID and version | Common runtime/INV; not an authorization token |
| Invocation codec | Family-owned strict argument schema, units, defaults, target and output ports |
| Applicability and discoverability | Pure family logic consuming permitted actor context; distinguish available, blocked, unknown and not disclosed |
| Semantic hints | Bounded labels, aliases, examples and contrast cases; never executable instructions |
| Knowledge requirements | Intrinsic body use, known technique, observable operation or explicit trial policy |
| Binding rules | Allowed reference kinds, early/late binding, exact quantities, instrument and participant requirements |
| Native admission and executor | Trusted code or qualified admitted implementation; never a model-supplied function path |
| Work and effect contract | Inputs, resource claims, start/progress/commit points, outputs, side effects and effect bounds |
| Lifecycle | Instant, durative, activity or process initiation; termination, interruption, pause/resume support |
| Dependencies and freshness | Mandatory family reads, relevant definition/configuration versions, authoritative versus evidence dependencies |
| Outcome projection | Actor-visible result, public sensory effects, private/system diagnostics, safe text/icon defaults |

A descriptor's mandatory validation, dependencies and cost limits cannot be overwritten by an invocation or generated definition. The invocation does not declare its own trusted effect summary. The implementation supplies it, conservatively covering its actual behavior.

Player menus, text actions, NPC suggestions, Jev candidate selection, full LLM decisions and native plans use **the same invocation constructors and native admission**. Presentation wrappers can remain convenient typed functions. They cannot acquire separate physics or permissions.

### Capability availability is not the shortlist

The immediate action shortlist is a cheap decision aid, not a complete permission or vocabulary boundary. Grounding can query scoped family metadata even if no concrete candidate was selected or offered. Do not enumerate every possible coordinate, quantity, orientation, item pairing or combination.

Retrieve metadata from an actor-scoped capability view using installed family/interface tags, typed target affordances, known methods and bounded semantic retrieval if needed. Apply scope before ranking. Do not feed the 384-row idea catalogue into every decision; it contains hypothetical mechanics and is a design/evaluation resource, not the runtime's capability registry.

## 5. Intent envelope and semantic fidelity

Retain AG's optional operation list. Add parameterized invocation and referenced attempt variants to the same action path, not a new independent response system. Existing specialized speech, thought and goal operations continue to use their owners.

Illustrative logical shape:

```ts
type ActionIntent =
  | { kind: 'offered'; actionRef: RequestScopedActionRef }
  | {
      kind: 'invoke';
      capabilityRef: RequestScopedCapabilityRef;
      arguments: unknown; // parsed by the selected family's strict codec
    }
  | {
      kind: 'attempt';
      text: string;
      references: { role: string; ref: RequestScopedRef }[];
      constraints: IntentConstraint[];
    };

interface IntentContext { // constructed by the server, never supplied by a model
  requestId: string;
  worldId: string;
  loadEpoch: string;
  principalId: string;
  controllerGrant: ControllerGrant;
  actorId: string;
  source: 'player' | 'actor' | 'authorized-delegate';
  operationId: string;
  intentRevision: number;
}
```

Provider encodings can use strict nullable fields rather than this union. Their encoding must preserve meaning and aggregate limits. An actor/model cannot supply `actorId`, a principal, a capability grant, world truth, a cost override, or arbitrary effects through its invocation arguments.

**Only explicit action operations execute.** Dialogue, quoted text, memories, descriptions and private thoughts remain data. “Ada said ‘open the door’,” “I might open it,” “pretend to attack,” and “do not open it” cannot be mined for imperative substrings and executed.

### Preserve the consequential slots

Grounding records a compact intent contract alongside the candidate: initiator; action versus goal versus hypothetical; target; affected object/part; instrument; recipient/participants; destination/frame; quantity and units; method; hard constraints; optional preferences; temporal extent; termination; replacement/queue mode; and authorized result dependencies. Only applicable slots are needed.

| Phrase | Required interpretation |
| --- | --- |
| “Follow that deer” | Specific scoped target; ongoing pursuit; no attack; explicit loss behavior |
| “Give her one berry” | Recipient and exact amount; transfer, not consume or spawn |
| “Use the stone, not the axe” | Preserve exact instrument or report incompatibility |
| “Only take fallen branches” | Source restriction, not merely a preferred label |
| “Quietly” | Use supported low-noise behavior or clarify; never promise undetectability |
| “Without harming it” | Preserve hard constraint; if a method cannot guarantee the stated bound, do not silently claim compliance |
| “Until sunset” | Simulation-time termination, not a wall-clock provider timeout |
| “Ask Ada to help” | Communication, not direct mutation of Ada's work |
| “Make Ada trust me” | Goal/social attempt; no direct relationship-state setter |
| “Build a shelter” | Known method plus work, actor planning, or invention depending on actual knowledge/capabilities |

A schema validates structure, not fidelity to arbitrary natural language. Even a second model cannot prove that translation always preserves intent. Use deterministic handle/parameter binding where possible, contrastive tests, original-text retention, scoped references and player-visible normalized previews for consequential ambiguity. Native validation proves only the invariants actually encoded by its trusted family, not arbitrary physical plausibility or all emergent side effects.

Never advertise a preference as a guarantee. “Avoid known danger” can be an enforceable route constraint; “nothing bad will happen” is not. Unknown risk cannot be certified away by a successful JSON parse.

## 6. References, targets, quantities and evidence

### 6.1 Typed scoped references

Support references to actors, items/stacks, object instances, parts, supported surfaces, locations, regions, known definitions/techniques, evidence/contact episodes, active processes, and offered social records where the consuming family admits those types. Use registered reference codecs rather than one global string lookup or an unbounded universal object selector.

A request-local reference maps server-side to a typed identity and its permitted projection. Names are display text; identical names are not identical entities. An unidentified contact remains a contact even if the server knows its source. Preserve distinctions between current observation, remembered evidence, testimony and inference.

When work persists beyond the request, store a typed bound target with its identity/provenance and **binding policy**, not a forever-valid perception grant. Revalidate evidence as required. A remembered target ID does not authorize current coordinates or private attributes.

### 6.2 Binding time is part of meaning

| Binding | Example | Required behavior |
| --- | --- | --- |
| Snapshot location | Go where the deer was last seen | Persist that observed location/region; never chase the hidden current entity |
| Identity with live observation | Follow this visible deer | Same target identity; refresh position only through permitted evidence |
| Late finite selection | Take the next ripe fruit from this observed patch | Persist selector and scope; bind actual item at start with a deterministic tie policy |
| Earlier result | Equip the tool produced by step A | Bind a typed output port from the actual successful receipt |
| Shared agreement | Accept offer O, revision R | Validate exact current terms and participants |
| Definition pin | Invoke known method D, version V | No silent replacement with a changed installed definition |

“Nearest” needs a declared metric and scope. “All” needs a bounded set/region and a snapshot-versus-future-arrivals policy. “The other one” needs resolved discourse context. “Mine” may be actor belief or authoritative ownership depending on the method; do not erase that distinction.

### 6.3 Quantities and parts

Quantities are typed amounts, not prose numbers pasted into arbitrary commands. Distinguish exact units, native batches, at-most, at-least-with-approved-overshoot, proportions, capacities and continuous measures. Conversions come from registered unit/stack rules. A fixed two-item gather cannot silently satisfy “pick exactly one”; either a supported invocation expresses that amount, the actor accepts a changed method, or the result explains the limitation.

Parts are typed structural references. Repairing a handle, opening one valve, treating one wound and dispelling one effect cannot mutate the entire parent object indiscriminately. Item stack split/merge and multi-output actions need typed receipt ports; never use arbitrary JSON paths or string interpolation over hidden state.

### 6.4 Observations and predicates

A guard consumes an authorized observation or registered actor-query result. Its result is at least `true`, `false`, or `unknown`; technical unavailability and unsupported predicates are distinct failures, not false. Evidence can be stale or cover only part of a region.

“Nothing found in the checked drawers” is valid bounded evidence. “The ring does not exist anywhere” is not. “Wait until Ada is sad” is unsupported unless the actor can perceive relevant evidence or an explicitly admitted mental-disclosure mechanic supplies it. Do not substitute another actor's raw private component.

## 7. Translation pipeline

```text
Explicit player/actor operation
  -> attach authority, request identity and permitted context
  -> exact offered-handle or structured-family binding when available
  -> scoped capability/reference retrieval for unresolved language
  -> one bounded semantic grounding stage only when needed
  -> typed invocation or bounded method proposal
  -> deterministic binding, fidelity checks and family validation
  -> persist admission/plan/activity in the existing writer
  -> native execution, actual receipts and permitted observations
  -> continue the authorized method or admit meaningful reconsideration
```

### 7.1 Cheap paths and model use

A UI click already supplying a valid intention, a native survival action, a structured model call, and a selected Jev concrete handle do not need a second LLM translator. The original generative decision can emit the invocation directly from supplied capability schemas. Pure parsing/binding handles exact supported coordinate and numeric forms where unambiguous.

Jev can select among grounded alternatives; a finite classifier is not required to invent arbitrary continuous parameters. Concrete candidates may include proposed destinations chosen by native scoped construction. Unlisted freeform intent still has a path when the candidate list is empty.

Only genuine semantic ambiguity/composition needs a bounded interpreter. It receives permitted evidence, small relevant capability schemas, the actor's method and original intent. It returns untrusted structure, not executable source or effects. There is no mandatory category-classification call before every decision, nor an always-running separate interpreter agent.

A later tool-using planning harness can use the same scoped discovery/preview ports. It is not necessary for the first point-move slice and owns no authoritative continuation outside the saved plan.

### 7.2 Result categories

Return a coded result with original operation identity and actor-safe explanation:

- `bound`: a native invocation or bounded executable method; this is not execution success.
- `needs_clarification`: unresolved target/amount/meaning.
- `needs_planning`: a goal has no selected supported means.
- `needs_information`: known query/inspection/inquiry could help.
- `blocked`: a supported method currently fails a concrete prerequisite.
- `needs_definition`: the actor's proposed method can enter the existing INV service.
- `unsupported_capability`: no admitted implementation can express the required computation/effect.
- `forbidden`: named control/authoring/world policy rejects it.
- `stale`, `cancelled`, `unavailable`, or `uncertain_external`: technical/lifecycle outcomes remain separate.

Keep internal and projected reasons separate. A blocked route need not reveal an unseen locked door. A forbidden hidden capability need not disclose that it exists. Original intent and unresolved status survive optional interpretation failure; valid speech/thought components are not discarded merely because the action remains unresolved.

### 7.3 Semantic retries are not native continuation

A schema error or provider failure does not authorize an automatic paid repair loop. Preserve the existing paid-work policy. A deterministic unpaid recheck after an actual dependency change can reuse the accepted intent under its existing authority. An explicitly needed new semantic decision uses the normal scheduler and budget, not an unbounded resolver recursion.

## 8. Native activity composition

Use a small closed control vocabulary over registered calls. Do not introduce a universal effects language or arbitrary expressions.

```ts
type ActivityNode =
  | { kind: 'invoke'; call: BoundInvocation }
  | { kind: 'sequence'; children: ActivityNode[] }
  | {
      kind: 'branch'; predicate: BoundPredicate;
      whenTrue: ActivityNode; whenFalse?: ActivityNode;
      whenUnknown: 'wait' | 'stop' | 'request_reconsideration';
    }
  | { kind: 'wait'; condition: BoundWait; deadline?: SimulationDeadline }
  | {
      kind: 'repeat'; body: ActivityNode;
      policy: CountOrScopedUntilPolicy;
    };
```

This is a logical representation. Start by extending the current flat AG frontier with invocation leaves and typed result bindings. Add wait/branch/repeat only with their acceptance slice. A maintain/follow controller is an `invoke` whose native family produces an ongoing activity; it does not require a second controller invocation registry.

### Completion and dependencies

Sequential steps depend on terminal outcomes, not admission. “After gathering, craft” starts crafting after a successful gather receipt. “After requesting help, cross together” additionally requires actual participation/readiness; request acceptance alone is insufficient.

Each family distinguishes admission, start, progress, effects committed so far, terminal completion, block and interruption. A standing follow activity has no natural “arrived forever” success. It terminates on its declared condition, explicit cancellation, inability to continue, or controller revocation. A following plan step cannot execute until that condition ends the activity.

A repeat iteration gets a stable child identity derived from the accepted root, node and iteration index. Replaying a callback cannot produce another item or step. Freeze branch choices and bound outputs once accepted/committed; do not silently re-evaluate a past branch after restoring a save.

### Checks are not authority to do extra work

An `until` predicate authorizes repetition of its specific body, not arbitrary attempts to make the predicate true. “Until the chest is full, put these stones in it” cannot buy stones, steal a cart or invent a bigger chest. A failed prerequisite blocks the chosen method unless the actor already authorized a specific supported alternative.

Allowed failure policies are finite and explicit: stop, wait for a named dependency, skip an explicitly optional element, or reconsider. Do not create a generic repeat-until-success loop around every failure.

### Persistence and boundedness

An ongoing activity may legitimately last indefinitely in simulated time while performing bounded work per native step. Persistent does not mean unbounded CPU, subscriptions, outputs, inference or authority. Bind a finite scope, cancellation policy, per-step budget and maximum active work. A “forever” standing routine is not an always-running provider session.

Unbounded fan-out, recursive plans, dynamically spawned unlimited watchers, unknown executable nodes, user-authored evaluator code and arbitrary SQL/JSON-path predicates are rejected. Full parallel graph execution is not part of the initial foundation; it becomes available only when the relevant family/resource-channel interface is implemented.

## 9. Integration with the existing action and plan owners

There must remain **one authoritative source of actor goals, one accepted plan owner and one physical action owner**. Do not add an independently mutable `actor.behavior`, `actor.activity`, `actor.plan` and provider scratch plan that can disagree.

An activity's durable cursor/controller state belongs to the current AG step/action, alongside the invocation and pinned definitions. A native action delegates movement and effects through their existing owners. The activity does not write actor position while another movement executor also writes it.

The initial one-physical-lane model remains the default. Speech/private operations retain their established concurrency where supported. A new template does not mint extra hands, mouths or attention channels. Future richer bodies expose resource claims through the same family descriptor and arbitration boundary.

`enqueue` preserves current work. `replace` intentionally interrupts according to the current family's cancellation rules. `pause` exists only for families with a defined pause state. `resume` revalidates the exact plan, target, resources and definition. Cancelled work does not gain fictional refunds. A new goal need not automatically cancel or create an action; explicit AG semantics govern the relationship.

## 10. Navigation as the first complete vertical slice

Movement demonstrates parameter binding, continuous targets, evidence updates, temporal behavior and native receipts without waiting for invention.

### 10.1 Point and place destinations

The public intention describes a world-owned location: a permitted point/support, known place, remembered observation location, or actor-relative displacement. For the present spatial provider, horizontal coordinates are X/Z and Y is elevation. Do not make the user-facing phrase “X,Y” silently bind vertical height or pretend that every possible world uses that convention. Context/preview must state the frame.

Trusted spatial binding resolves the intended support and height. A planar pair is sufficient only when its support is unambiguous under the world/location context. Multiple overlapping floors require an explicit support reference or clarification. Snap/project only within the selected support and a declared tolerance. Never choose a hidden upper floor or the globally nearest convenient polygon.

A point can be an intended destination even when not currently occupied by a visible object. Public terrain or remembered geometry may support it under the world's disclosure policy. Physical collision authority and actor route knowledge remain separate, as specified by SW. No need to enumerate every point as an offered handle.

After binding, use the existing native move/route admission, movement timing and terminal receipt. Route preparation, path following and native collision handling require no paid model call. A failed path search can mean no known route, unsupported traversal, stale geometry, search budget exhaustion or technical unavailability—not a proof of physical impossibility.

### 10.2 Entity-relative navigation

Use a typed relation, not just `target + distance`:

```text
Navigation activity
  target: permitted identity or location/evidence reference
  relation: reach stance | near band | behind | beside | between | face
  metric/frame: supplied by the relevant spatial/body profile
  extent: reach once | maintain until declared termination
  observation policy: current observation | remembered snapshot | admitted tracking
  loss policy: stop | go to last observed location | separately authorized bounded search
  route/method constraints: known regions, traversal modes, exclusions
  tolerances: start/stop bands and repath thresholds
```

Behind/beside need an observed reference frame or heading, not a raw hidden transform. “Follow the exact trail” needs observed trajectory evidence; following the current target does not supply that automatically. Interception needs an admitted estimator or actor hypothesis, not future state access. Some relations are impossible for a particular body/topology; the descriptor must say so.

### 10.3 Follow state machine

Use family-local state within the AG activity:

| State | Native behavior | Transition |
| --- | --- | --- |
| Acquire | Validate target reference and permitted current evidence | Move/hold, or unresolved/lost |
| Moving | Request a route/stance; advance through the movement owner | Hold when the relation is satisfied; replan only when necessary |
| Holding | Remain active without declaring terminal success | Move when the relation crosses the outer tolerance |
| Target lost | Stop receiving live target updates | Apply the accepted loss policy |
| Last-observation approach | Move only to the saved observed location | Reacquire through real perception, or stop/reconsider there |
| Blocked | Retain intent and a scoped dependency reason | Native recheck or actor reconsideration under policy |
| Terminal | Emit the appropriate completion/cancellation/failure receipt | Release owned resources/subscriptions |

Use hysteresis to prevent oscillation at the band boundary and threshold/cadence-based native replanning. Check current physical segments as SW requires. Do not run a full entity scan or path search every tick simply because the target still exists.

The controller consumes scoped target observations; it must not reuse an unchecked `world.entities[targetId].position` lookup as its information source after sight is lost. The authoritative spatial service may use truth to prevent impossible physical movement, but must not disclose hidden topology or a precise unseen obstacle in actor feedback.

Default visible-follow stops when target evidence is lost. Going to the last observed location is an explicit disclosed policy option, not automatic hidden pursuit. Footprint/scent tracking is a separate world capability that can later feed the same relation controller. An unidentified sound cannot be silently upgraded to a named target.

## 11. Inspection, search and monitoring

Inspection is an action/query over an existing evidence channel. Its descriptor says whether it is immediate, requires time, changes stance, touches/disturbs the target, consumes energy, or occupies attention. Looking at an interface and physically testing a bridge are different methods.

Search composes movement, accessible-scope enumeration and inspection. Persist visited/checked scope, permitted observations, remaining frontier and stopping conditions. Use bounded paging rather than one giant global query. A closed drawer, darkness, an unknown material and an unreachable room produce different limitations. Repeated search need not rediscover the same unchanged negative evidence.

Monitoring registers a bounded dependency through the existing EPR/perception scheduler, using the actor's actual sensing/access policy. Watches specify event versus level condition, debounce/hysteresis where relevant, current evidence cursor and termination. A watcher cannot reveal private states or perceive through a disabled sense. Turning away, sleeping, leaving the location or losing equipment can suspend its coverage.

A reactive native controller can respond to a permitted condition without a new semantic decision when its accepted method already specifies that response. Novel goal changes or unresolved methods return through the usual cognition opportunity. The scheduler coalesces compatible causes; it does not generate a fresh expensive decision for every footstep or predicate sample.

## 12. Manipulation, transfer and process use

Parameterized families must cover **roles and relations**, not merely `verb(target)`:

- Give binds giver, recipient, item, amount and participation/transfer mode.
- Put binds object, destination container/surface, placement and quantity.
- Cut binds tool, target part, method and finite permitted work/effects.
- Heat binds heat source, target, exposure method, duration/condition and applicable material model.
- Activate binds a device/process interface and legal configuration, not arbitrary state fields.

These are examples of family contracts, not a universal cross-product of every verb with every noun. Objects participate through explicit compatible interfaces. A pot can be an acoustic object and a container; its name alone supplies neither property. Generated content must satisfy the same consumer contracts as built-in content.

An ordinary transfer conserves the relevant quantity according to its family, but the engine is not committed to universal terrestrial conservation. A world may admit a source operation such as magical creation; it must still be explicit, authorized, bounded and attributed. The generic actor cannot invent a source by renaming `transfer`.

Starting or configuring an existing automatic process is ordinary use if its accepted parameter envelope permits it. Defining new triggering/effect semantics belongs to INV. Process updates remain native/module-owned even when the initiating actor leaves, rests or dies, according to the process's lifetime policy. The action service cannot secretly disable passive combustion or growth when no actor is looking.

## 13. Social actions, consent and joint work

### Communication versus consequences

An actor may try to persuade, apologize, threaten, comfort, entertain, deceive or negotiate through an existing communication capability. The immediate trustworthy result is a communicated act under the channel's perception rules. Belief, emotional appraisal, agreement and later behavior belong to the recipient's controller or an explicitly admitted social mechanic. Do not expose `make_trust`, `make_forgive`, or `force_agree` as general action setters.

A supported fictional compulsion or telepathy family is a separate world mechanic routed through its designated target-owner operation. It cannot reach platform secrets, human account permissions, or private information outside its authorized fictional disclosure domain.

### Three different permission questions

1. Does the real principal/controller have authority to submit this actor's operation?
2. Does the world admit this effect and the required target-owner operation?
3. What do the world's consent, property, social and institutional rules say about the attempt and its consequences?

An in-world theft or hostile action need not be rejected merely because its target would dislike it; that depends on the world's mechanics. Conversely, fiction permitting theft never authorizes access to another user's account or raw private server data. Cooperation checks are not universal platform moral judgments.

### Joint activity protocol

Joint work is not two independent commands hoping to align. A supporting family declares typed roles, capacity/load rules, rendezvous/stance requirements, contribution channels, withdrawal and interruption behavior. Reuse AG operations and native receipts for each participant.

```text
propose roles/method -> communicate invitation under NC
  -> each participant independently accepts or declines through authorized input
  -> bind role grants and exact shared activity revision
  -> rendezvous and validate real readiness
  -> atomically admit the joint start in the single writer
  -> advance actual contributions under the joint family
  -> complete, hand off, pause or safely interrupt under its rules
```

The initiator cannot submit another actor's acceptance, prescribe their private goals, or treat “message sent” as “helper holding the beam.” An accepted participant can withdraw; consequences follow the physical/contract rules. A mid-lift departure cannot be covered by fabricated continuing support. Emergency behavior must be a native family rule, not an LLM promise to hold the object safely.

Reservations cover only the needed resources and have bounded lifetimes. Acquire shared start resources in stable order, release abandoned readiness, and use deterministic conflict handling. Do not hold a participant's body lane indefinitely while waiting for an absent helper. A joint start can be atomic; minutes of completed shared work cannot be rolled back as a database transaction.

The first implementation slice need not implement cooperative lifting. Its invocation roles, output ports and activity lifecycle must leave that extension possible without changing every generic API or inventing a second agency system.

## 14. Admission, effects and failure

Native admission validates the actual actor lifecycle/controller, family/definition pin, targets, evidence policy, work mode, constraints, quantities, resources, world locks, cancellation state and relevant revisions. It runs again before each step starts and at family-defined consequential boundaries.

Plan admission does not reserve every future resource. Reservations or consumption occur only when native rules require them. Two actors trying to take the final item cannot both receive it. Recheck a guard and its dependent mutation within the authoritative transition where they must be atomic; avoid a check-then-act race between semantic preview and actual execution.

Typed result references resolve only after successful producing receipts. A partial result or multi-output choice must be explicitly represented; do not invent a single-item success when the action failed or produced several things. A parent plan can distinguish partial physical effects from successful objective completion.

Unsupported modifiers, unknown predicates, unimplemented resumability, technical search exhaustion and uncertain provider completion produce honest outcomes. No expression fallback may claim a consequential action happened. An action label or animation is never evidence that a tool was crafted, an item transferred, a bridge built, or a target harmed.

## 15. Resource claims, interruption and timing

Keep the current single primary physical lane until a concrete family qualifies richer concurrency. The descriptor can identify future movement/manipulator/voice/attention/worksite claims, but the initial runtime must reject unsupported simultaneous use rather than pretending the schema grants it.

A native controller evaluates readiness and emits bounded requests to owning systems. It does not directly seize arbitrary resources. Standing watches, active spell maintenance and manual tending must declare whether they occupy an actor resource. A configured machine consumes its own admitted fuel/power/process capacity instead.

Simulation time governs movement, work, periodic routines, durations and accepted review deadlines. Wall time governs provider deadlines, real spending and application admission rates. Route-cache preparation and technical unavailability obey SW's policy; CPU speed must not silently become starvation time or a fictional work cost. Never infer character effort from tokens.

Interruption rules include safe boundary, committed costs/effects, retainable progress, released resources, pending dependent work and follow-up evidence. Pausing a cancellable action cannot refund inputs. Cancelling a maintained relation releases its watchers and future movement authority. An empty decision leaves both action and goal state unchanged.

## 16. Dependency-aware staleness and duplicate suppression

The family supplies mandatory authoritative dependencies; the activity adds evidence, plan and binding dependencies. A model may identify useful concerns but cannot omit reads from the trusted invalidation contract.

| Result/state | Relevant invalidation examples | Not a sufficient retry cause |
| --- | --- | --- |
| Missing item | Inventory/containment change for the scoped requirement | Rewording the same request |
| Unknown target location | New permitted observation/testimony/recall result | Target moving unseen in truth |
| Lost visible target | Actual reacquisition under permitted sensing | Continued existence of its entity ID |
| No known route | Known topology/body/traversal change | Unrelated world tick |
| Unsupported implementation | Relevant host/interface/manifest change | Repeated semantic paraphrase |
| Forbidden operation | Relevant authorization/policy revision | Using an NPC or alternate synonym |
| Unknown technique | Authorized learning/independent accepted method | Similarity search finding another actor's private design |
| Blocked joint work | Participant/readiness/resource change | Repeatedly asking the same absent helper |
| Provider failure | Explicit allowed retry/new decision | Automatic error-repair recursion |

Cache structured normalized intent with actor scope, target binding, method/constraints and the relevant version/dependency signature. Text normalization alone is insufficient for semantic equivalence. Do not globally publish private failed inventions or reuse another actor's private explanation. Conservative cache misses may cost another legitimate decision; overly broad cache hits must not suppress meaningfully different requests.

Maintain accepted intent revision separately from physical work generation where required. Unrelated awareness or simulation ticks do not stale an entire response. Changed target identity, revoked control, replaced plans or obsolete definitions invalidate only affected authority/components according to AG.

## 17. Persistence, epochs and replay

Persist accepted invocation pins, plan/activity node identity and cursor, chosen branches, iteration counters, actual outputs, current controller state, last permitted target evidence, durable waits, subscription descriptors and terminal outcomes through existing storage. Rebuild derived indexes, not fictional results.

Each callback/result carries world/load epoch, actor/controller authority, root/operation identity, relevant intent revision and definition pins. A restore fences old route preparations, interpretations, observations and asset deliveries. Rebuilding subscriptions does not redeliver the same event or authorize another model call. Recover uncertain real provider work using existing identities/accounting policy; do not replay it because a plan appears in a saved world.

The same-version save must distinguish running, waiting, blocked, suspended where supported, completed and cancelled work. An unsupported definition change either blocks activation for active work or follows the canonical INV version policy; do not silently retarget old invocations.

Follow the active no-legacy-development-save policy: incompatible saves fail explicitly. This feature adds no migration or compatibility reader. Fictional time travel, cloning and memory effects remain below real accounting, permission revocation and privacy guarantees.

## 18. Interface and presentation

Players can submit ordinary text, choose a contextual affordance, or inspect a normalized planned action. The same backend path validates each. The UI distinguishes **understood**, **queued**, **running**, **waiting**, **blocked**, **completed** and **cancelled**, with the relevant actor-safe reason.

Simple unambiguous allowed actions need not require confirmation every time. Ask for consequential target/method ambiguity or a proposed weakening of a hard constraint. Existing product permission policies govern destructive/authoring operations. NPC ambiguity returns through scoped internal clarification/reconsideration; it does not automatically open an owner dialog.

Preserve unresolved text as editable intent and show available next choices without advertising nonexistent capabilities. “I can move to the last place you saw the deer, but cannot track it by scent here” is better than a fake successful follow or a generic impossible message.

Map supported activities to trusted generic presentation states first. New art can arrive asynchronously using the existing versioned presentation system. Generating an icon or a walking animation cannot change collision, locomotion, anatomy, reach or outcome. Presentation failure does not erase a valid admitted activity. Public narration uses actual receipts and sensory events, not the model's intended ending.

## 19. Performance and model economics

The architecture's purpose is to remove semantic inference from already chosen execution, not to hide it in a controller callback.

- Ground an unlisted method once when needed; continue valid native work without per-tick, per-waypoint or per-iteration paid calls.
- Discover relevant families and references within scope; avoid all-actions-by-all-entities enumeration and whole-world scans.
- Use dependency delivery and bounded active-work scheduling; hysteresis prevents movement and need-band chatter.
- Keep immutable family metadata/codecs cached by exact version. Cache only scoped derived groundings with explicit dependencies.
- Preserve the single authoritative writer. Slow model calls and heavy route preparation remain outside its transaction.

Retain existing operation, prompt, frontier and pending-intent caps at the first slice. New nested-plan/selector/watch limits are explicit versioned configuration with conservative initial bounds qualified in AC acceptance, not a claim of unbounded expressiveness. A suggested implementation starting point is at most four nesting levels, 32 stored control nodes, 64 selector results per page, and 16 dependency subscriptions per active actor plan, with bounded native work per scheduling turn. Those are proposed guardrails to measure, not throughput claims or permission to increase existing paid limits.

A long-lived routine may continue across bounded frontiers without storing its entire future. Preserve aggregate iteration/output accounting and stable child IDs across frontiers. Budget exhaustion yields a technical/native scheduling disposition; it does not invent success or automatically escalate to a model.

## 20. Worked translations

The examples below are proposed logical encodings, not currently implemented JSON endpoints. All reference mappings are server-scoped; native admission still owns actual execution.

### A. Go to a point

```text
Input: Go to x=8, z=14 on this ground surface.
Reference: s1 is a permitted surface; actor and frame are server-bound.
Grounding: navigate_to(point={x:8,z:14}, support=s1)
Binding: spatial owner resolves y and validates the selected support.
Execution: one native move step, existing route and movement time.
Result: destination reached, blocked, unknown route or technical failure.
Invention: none. Model calls while walking: none.
```

A bare coordinate pair with overlapping possible floors returns a support clarification. It never chooses the bridge merely because its geometry is closer.

### B. Follow a visible deer

```text
Input: Follow that deer, staying a few world units behind. Stop if I lose it.
Reference: e2 identifies the perceived deer; observed heading is available.
Grounding: maintain_relation(target=e2, relation=behind,
  separation=world_default_follow_band, loss=stop, until=cancelled)
Execution: acquire -> move -> hold -> move; refresh only permitted observations.
Result on occlusion: target_lost; no pursuit of hidden current coordinates.
Invention: none. New engineering: the qualified native activity/controller.
```

If heading is not available, offer an explicitly different near-target interpretation or defer; do not claim behind. If “a few” lacks a disclosed world default, clarify or obtain an actor-selected parameter.

### C. Get food without unnecessary authoring

```text
Input: Gather berries here, then eat one of those berries.
Grounding: sequence(gather(source=e3), eat(item=output(step1, item), amount=1))
Execution: gathering commits its actual item/stack receipt; eating binds that output.
Failure: depleted source blocks eating; a future item ID is never fabricated.
Invention: none. Exact gather quantity still follows the source family's contract.
```

### D. Light tinder, then keep the fire alive

```text
Input: Light this tinder with the torch, then tend it until dawn.
Prerequisites: installed ignition/combustion/refueling families and known targets.
Grounding: sequence(ignite(target=e4, source=i2),
  admitted_actor_tending_activity(fire=output(step1, process), until=dawn))
Execution: actual ignition conditions; finite fuel; explicit actor work;
  process existence and later combustion belong to the fire owner.
If fire mechanics are absent: unsupported capability, not pretend success.
If a new material profile is required: INV may evaluate that proposed definition.
```

### E. Offer versus feed

```text
Input: Offer Ada a berry.
Grounding: social_offer(recipient=e1, item=i3, amount=1).
Immediate result: offer communicated/presented under its real channel.
Transfer: only after the appropriate acceptance or permitted placement rule.
Eating: a separate recipient action or separately authorized care mechanic.
```

The binder cannot choose `eat(i3)` because it is the closest available berry action.

### F. Help hold a beam

```text
Input: Ask Ada to hold this end while I attach the other end.
Grounding: propose joint method with holder and fastener roles.
Continuation: invite -> actual acceptance -> rendezvous/readiness -> native joint work.
Constraints: compatible grips, load support, tools and finite materials.
Failure: refusal/withdrawal blocks or interrupts; no fictional helper state.
```

### G. Ordinary magic without repeated invention

```text
Input: Use my known freezing spell on the stream so we can cross.
Grounding: invoke the known spell; observe the actual ice; validate/test support;
  cross only through an admitted supported method.
Definition change: none merely because the goal is novel.
Guarantee: spell use does not guarantee a load-bearing crossing.
```

### H. A non-human and a non-spatial world

```text
Touch-only construct: bind known tactile route, recharge from a finite reservoir,
  and transfer a package without reading its contents.
Digital graph citizen: invoke the installed graph-traversal and message families;
  no XYZ coordinates, legs, public Internet access, or biological hunger required.
```

The common invocation/lifecycle contract is reusable. The physical/sensory family semantics remain different.

## 21. Alternatives considered

| Alternative | Why it is insufficient | What to retain |
| --- | --- | --- |
| One native enum entry per verb | Synonyms proliferate; no arbitrary parameters or compositions; every extension changes central switches | Convenient typed wrappers delegating to shared families |
| Only select pre-generated action handles | Good for cheap decisions, but cannot cover continuous destinations, quantities, roles and unlisted combinations | Fast exact/finite selection path |
| Generic `set_state` or desired-effect JSON | Bypasses embodiment, costs, physics, privacy and causal truth | Nothing in ordinary actor authority |
| Ask an LLM what happens after every action | Loses native determinism and makes ongoing work expensive/unreliable | Models propose meanings and decisions, not authoritative effects |
| Generate unrestricted code for every new intent | Requires a new security/runtime/verification system and can bypass supported semantics | Later INV G2 only through qualified isolated interfaces |
| A full global GOAP/HTN solver before movement works | Large planning ontology and optimization scope are unnecessary for parameterized native actions | Small explicit methods/frontiers; add a planner only for a demonstrated need |
| Behavior trees as a complete answer | Useful control flow does not itself solve scope, binding, knowledge, effects or persistence | Small bounded reactive/sequence semantics under existing owners |
| Treat every useful arrangement as an invention | Prevents emergent play and clutters the definition registry | Separate runtime instance composition from reusable rule authoring |
| Make all game families kernel-native | Imposes one reality and body model on every world | Stable interfaces around replaceable world implementations |

## 22. Research connections and limits

[SayCan](https://say-can.github.io/) separates language-level task reasoning from grounding in available robotic skills. The useful lesson here is that fluent intent alone does not establish executable capability. OpenLegend should use its authoritative family admission rather than treating a language score or a learned feasibility estimate as proof of a simulated effect.

[Voyager](https://voyager.minedojo.org/) demonstrates a reusable skill library and feedback-guided behavior in Minecraft. The applicable idea is reuse and composition instead of repeatedly rediscovering each low-level sequence. Its code-generation execution approach is not authorization to run generated JavaScript in OpenLegend: this design uses registered invocations and bounded native activity state; later custom algorithms remain INV G2 work.

The [repertoire's primary game sources](repertoires/actions.md#inspiration-and-source-discipline) motivated breadth: care and coordination, domestic life, devices and automation, knowledge, recreation, social practice and unusual constitutions. The contracts above are our design synthesis, not claims that those games use this architecture.

## 23. Boundaries this foundation intentionally does not solve by itself

The layer does not implement new fluid physics, smell, deformable bodies, structural collapse, vehicles, social institutions, telepathy, time travel or cooperative load bearing merely because their names appear in a schema. It makes those future families invokable without redesigning every prompt and transport.

It also cannot guarantee semantic correctness for all natural language, physically plausible arbitrary inventions, globally optimal plans, perfect knowledge, guaranteed persuasion, unlimited population scale or zero-cost indefinite work. Exact domain implementations and acceptance evidence remain necessary.

The stable design commitment is narrower and stronger: **one scoped, typed route from an actor's chosen meaning to existing authoritative capabilities; composable ongoing activity; truthful consequences; and an explicit boundary when a new world definition or host ability is actually needed.**

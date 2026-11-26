# Perception and attention — technical design

| Status      | Current progress                                                                           | Last updated |
| ----------- | ------------------------------------------------------------------------------------------ | ------------ |
| In progress | The target design is specified; implementation and operating qualification remain pending. | 2026-11-26   |

The [feature collection](../features/perception-and-attention/README.md) owns desired behavior. The [base-world profile](../worlds/base/perception-and-attention.md) owns numerical tuning and world-specific meanings. The [limits inventory](../limits/perception-and-attention.md) owns restrictions and their reasons. This document owns proposed mechanisms, integration boundaries and evidence. It does not claim runtime delivery or authorize implementation.

## 1. Outcome and ownership

A character can notice a change, briefly examine it, maintain detailed observation, reconsider a task, and remember an experience as separate outcomes. All consume the same personally acquired evidence. A high attention priority is not a command to abandon a goal, turn the body, stop moving, attack, help, or purchase a model call.

The processing path is:

1. An existing authoritative mechanic changes the world or emits an occurrence.
2. Existing sensory owners select potentially affected receivers and acquire the facts each receiver can actually perceive.
3. Personally acquired changes update current evidence and select applicable interests and reusable predicates.
4. Supported reasons nominate brief examination, maintained detail, or an unresolved choice. Existing native continuation and protection owners handle their applicable work.
5. Attention selects eligible detail demands within the installed capacity. Existing decision admission combines unresolved reasons for one actor; existing action admission owns any resulting action.
6. Existing experience and memory owners retain the required or selected personal record under their independent rules.

Source preparation may be shared. Acquisition, recognition, attention, interpretation, decisions and recollection remain personal. No new event bus, world scene authority, AI pipeline, action lane, ECS, service, or complete world replay is introduced.

| Meaning                                                  | Semantic owner                                                     | Required integration                                                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Physical state, occurrence and action result             | Existing action, body, spatial and event owners                    | Produce one actual change with its original identity and order; do not use a desired reaction as evidence that the change happened. |
| Detection, localization, recognition and intelligibility | Existing perception and hearing owners                             | Supply personally acquired facets, uncertainty, modality and original measurement/acquisition times.                                |
| Current versus historical support                        | Existing reception, experience and memory owners                   | Distinguish current supported facts, last-seen information, testimony and interpretation.                                           |
| Active purpose, watched subject, protectee or workpiece  | Existing agency, plan, obligation and activity-control owners      | Bind supported interests to real active work and invalidate them when that work changes.                                            |
| Attention reasons and detailed selection                 | Existing attention owner                                           | Maintain reason lifecycle and select eligible observations without writing goals or physical actions.                               |
| Prepared response and immediate physical protection      | Existing native reaction and action owners                         | Apply their declared evidence, compatibility and admission requirements independently of optional interpretation.                   |
| Deliberation and external execution                      | Existing actor-local intake and decision admission                 | Preserve funding, fairness, cancellation, captured evidence and exactly-once application.                                           |
| Surprise, startle and emotional appraisal                | Existing preparedness, surprise and emotional-physiology contracts | Consume supported causes; do not interpret selection stability or provider latency as a bodily reaction timer.                      |

The [events and reactions contract](../events-perception-and-reactions.md), [agency](../agent-agency.md), [memory](../memory-architecture.md), [attention and investigation design](attention-and-investigation-tech-design.md), [shared stealth design](stealth-awareness-tech-design.md), and [attention and scenes design](attention-and-scenes-tech-design.md) retain their unaffected responsibilities.

## 2. Inputs and derived state

### Personally received changes

A matching input identifies the observer and life, original occurrence or measurement, the changed received facet, available local subjects or uncertain regions, modality, time, uncertainty, and the revision of the evidence that supports it. It may include a receiver role already established by the reception owner, such as being addressed or physically affected. It does not inherit an occurrence's hidden actor, intention, destination, inventory, membership or exact position.

Detection, identification and understanding remain independent. Hearing a lid can support a container-related sound while leaving the opener unknown. Hearing an explosion may establish only a direction and intensity. Recognizing a familiar voice does not supply unheard words. A rule can use only the facets that this receiver actually acquired or legitimately knew.

Physical candidate selection can use private geometry to determine which receivers need a sensory check. That internal selection grants no knowledge. The reason matcher consumes the resulting personal evidence, not the private geometry used to find candidates.

### Active concerns

A concern is a binding on existing chosen work or another installed source of personal relevance. Its inputs identify the owner, purpose, relevant role bindings, supported conditions, response or reporting policy, lifetime, and revision. Examples bind the same template to a guard's pursuit target, a merchant's watched container, an escort's protectee, or a craftsperson's workpiece.

Templates are installed once. The runtime instantiates bindings for actual interests and capabilities; it does not subscribe every actor to every installed template or search their complete biography after each observation. Unstructured goals remain useful cognition context without automatically becoming continuous semantic monitors.

### Reasons and demands

The existing attention state retains a compact derived reason containing its observer, local candidate, reason family, supporting occurrence or condition generation, relevant concern revision, current priority, permitted interruption behavior, demand kind, and expiry or termination condition. References point to the existing evidence owner; they do not copy an unrestricted event or establish a second knowledge store.

Each active reason supplies one priority through its installed policy. A candidate's priority is the maximum of its currently supported reasons. Repeated position samples, several facets of one opening, or duplicate paths through the predicate graph do not add priority. Independent evidence may support a more consequential interpretation, which supplies its own reason with explicit provenance. The same evidence is not numerically counted again merely because it appears in that interpretation.

Demand kinds are distinct:

- **Brief examination:** finite attention to acquire or inspect relevant available detail. It expires or completes; selecting it does not continuously renew it.
- **Maintained detail:** justified by continuing work, a supported condition, or another installed continuing reason. It ends when that justification ends or its present observation is unavailable.
- **Choice opportunity:** an unresolved consequence for the actor's conduct. It enters ordinary decision intake, whether or not the subject currently occupies a detailed slot.

A reason can request more than one applicable outcome. Those outcomes retain separate lifecycle and admission. Attention capacity applies to simultaneous detail demands, not to the number of visible entities, required observations, obligations, or minds permitted to make decisions.

## 3. Selection, interruption and pursuit

Only eligible demands enter detailed selection. Empty capacity is valid. Ordinary movement cannot force someone to be tracked simply by being the highest-ranked visible subject. The installed profile defines supported reason priorities, brief-examination limits, capacity, ordinary replacement margin and stability behavior.

Recompute a changed candidate from its live reasons. A reason expiry, concern change, correction, support loss or meaningful escalation can change that result without a new physical occurrence. Maintain only the affected ordering entries, using indexed candidate priority/update/removal and finite selected allocations; do not re-sort all live candidates after every received sample. Capability/compatibility changes invalidate affected eligibility entries. Selection must not repeatedly walk an unbounded prefix of incompatible candidates: meter that work and retain a continuation cursor when appropriate, reporting incomplete selection honestly. Do not reconstruct every candidate's appearance or reconsider every active intention after a position update.

Ordinary selection stability prevents small fluctuations from rotating detail. The selected profile uses a replacement margin and no minimum hold; urgency bypass and deadline tie-breaking follow that profile. Simultaneous urgent demands remain subject to the finite detail capacity, while their independently required physical effects and evidence do not disappear. A stable subject is not immune to serious danger, and an urgent observation is not automatically a new goal.

The action owner decides whether current work can continue while the actor looks, listens or considers. A prepared response can settle the situation without deliberation. Otherwise the decision receives the new reason and the existing purpose, including any consequences of interrupting it. Compatible continuation, a deliberate pause, temporary suspension and replacement are distinct results. No compulsory two-second chase continuation or universal stop-to-think action is derived from attention stability.

### Fast pursuit

An accepted pursuit can consume a compact current target observation containing only the supported local association, measurement time, location or region, uncertainty, and acquisition/support revision needed by steering. It need not hydrate descriptions, rebuild the full scene, rerank all subjects, or ask a model to choose the same pursuit again.

This packet is a projection of acquired evidence, not a second target-position authority. A dedicated timely acquisition opportunity may serve active pursuit when the sensory owner supports it; rendering interpolation and private body motion cannot supply extra measurements. The acquisition cadence must be qualified in actual chase gameplay rather than inferred from ordinary broad awareness.

Register the timely demand for the active observer–target relationship and its viewpoint, source, occluder and sense dependencies. Target refresh does not request broad-scene acquisition, full appearance construction or complete attention reranking. Observer or occluder changes can invalidate support while the target is stationary. If acquisition opportunities are missed, coalesce to the next valid opportunity and preserve the actual gap; never replay historical catch-up samples or interpolate an unseen route. Measure acquisition-to-steering delivery as well as due spacing. Re-reading an unchanged old sample is not a fresh acquisition.

When sight is lost, the pursuit receives loss of current support and retains the permitted last-seen information under its existing owner. A hidden turn supplies no new target destination. Search, prediction and route choice must remain distinguishable from observation. Another sense can independently support a new cue without silently repairing visual identity.

## 4. Reusable predicates and authoring

The supported primitive families describe acquired facts and their relationships, not occupations or every possible story:

| Family                             | Example binding                                                          | Work and evidence boundary                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Received state transition          | A watched container changes from closed to open                          | Match the personally received occurrence; an already-open restored state is not a new opening.             |
| Interaction with a bound subject   | A person touches a watched object or affects a workpiece                 | Require received participation; hidden ownership or identity cannot fill missing evidence.                 |
| Spatial relationship               | An observed body approaches self, a protectee, or a watched area         | Declare dependencies on both bodies and applicable coverage; uncertainty may make the result unknown.      |
| Received danger or striking change | Nearby flames, a collapse or a sudden loud impact                        | Use supported physical cues and the installed world's meaning; do not require an occupation-specific rule. |
| Received communication             | Understood address, request, warning or learned signal                   | Preserve hearing, recognition and intelligibility as separate prerequisites.                               |
| Work outcome or obstruction        | An active step completes, fails, becomes blocked or loses a prerequisite | Resolve through the work owner and its actual result.                                                      |
| Finite cue pattern                 | A help call with compatible battle noise                                 | Use bounded personally received support and preserve the conclusion as interpretation.                     |
| Expected condition or absence      | A watched passage remains empty through a due interval                   | Require the specified coverage; an unobserved interval establishes no absence.                             |

World definitions select meanings, thresholds, roles and consequences. The trusted runtime supplies supported measurements, matching and effects. Adding a cashbox rule can be data when a witnessed container transition already exists. If the mechanic does not expose a perceptible lid transition or actor participation, that observation capability must first be added to its owner. A free-text rule cannot manufacture it. This is the concrete boundary behind authoring without a Rust change.

Each continuously active definition must declare its input family, selective entry, dependency set, bounded live-state policy, outputs, and applicable onset/continuation/escalation/clearance/termination behavior. The compiler validates these against registered capabilities. Richer unsupported prose may remain a goal or interpretation guide, but is explicitly not monitored between decisions.

Installation returns an inspectable supported result or a refusal explaining the unsupported monitor. It never silently falls back to scanning all definitions, consulting a model for every cue, or executing arbitrary generated code. A failed installation leaves the previous definition and active behavior intact. Activating a definition specifies baseline versus report-current behavior; it cannot create historical occurrences retroactively.

## 5. Indexed matching and honest cost bounds

### Dispatch before evaluation

Compile definitions once into shared, factored predicate structure. Entry selection uses a bounded set of received facet/family keys, actually received classification or tag keys where supported, exact bound subjects, and applicable active concerns. Shared nodes reuse only identical computations over compatible inputs. A shared graph does not itself prove bounded evaluation: thousands of same-family conditions still require another selective index.

Use exact maps for equality and bound identity, inverted indexes for supported sets, and appropriate range indexes for thresholds. Do not expand nested tags or OR expressions into a Cartesian product. Resolve static inheritance at installation and preserve factored expressions. Additional installed rules must not enlarge every occurrence into a per-rule list of tags.

Unanchored wildcard matching belongs only to a deliberately bounded generic policy or explicitly admitted concern. If a definition cannot fit a supported indexed form and its residual work envelope, reject its continuous installation or require a more selective scope. The [limits inventory](../limits/perception-and-attention.md) owns these admission restrictions; a generous result limit is not permission for unlimited work before producing it.

Each primitive declares input dependencies, permitted indexed access, candidate-visit cost, materialization/byte limits and continuation behavior. One expression leaf cannot hide an unlimited neighbor/geometry/history scan. Installation validates the complete work shape; activation reserves applicable query, materialization and live-state allowance, checking exhaustion before expensive preparation. Area/group bindings retain these costs even when they consume one binding slot. Factored compilation has its own finite work allowance; large membership sets use supported lookup structures rather than per-observation iteration. If compilation cannot establish the required indexed program and residual bound, refuse activation.

### Complexity contract

For one personal received change, let `b` be its routing keys, `a` the affected active bindings, `p` the distinct residual predicate nodes evaluated, `j` the prior cue candidates inspected, and `k` the changed matches or independent outcomes. Matching work is:

`O(b + a + p + j + k)`, plus the explicitly accounted range/spatial index work and deadline updates.

Exact-key entry is expected O(1). A supported range query can require O(log r + k) for an applicable range index of size `r`. Spatial discovery has its own index and candidate costs. Processing `k` genuinely applicable observers, obligations or matches is not O(1). Detail-order maintenance is separate: an indexed ordering can cost O(u log C) for `u` changed entries among `C` live candidates, plus explicitly charged selection work. The engine does not require the world's numerical range to be fixed in order to use that contract.

The enforceable guarantee is that no ordinary matching path loops over the complete installed catalogue. Definitions excluded by dispatch receive zero predicate evaluations. Same-family rules must still be narrowed before residual evaluation. Work and live state are bounded by affected active interests and supported matching envelopes, not by an actor-by-definition cross product.

Compilation, installation, definition editing and index memory may scale with catalogue size. Real cache and memory behavior can also change with a larger catalogue. Qualification measures complete runtime cost as well as predicate counts; this design does not promise catalogue-independent wall time for arbitrary expressions.

### Reverse dependencies

Register dependencies with the existing owning mutation and invalidation paths. Relative motion depends on both bodies. A watched area depends on its extent and relevant nearby changes. Sensory support depends on observer motion, source motion, occluders, light and the installed sense. Personally meaningful matching can also depend on actual recognition, knowledge correction, concern state and definition revision.

An update selects affected bindings through reverse entity/region dependencies. A stationary person or watched object can become relevant when the observer moves or a door opens. A moving region queries its affected old/new extent; it does not scan all installed regions or all world entities. Swept-path checks are used only where the sensory mechanic actually supports that temporal coverage; teleportation or a missed sample does not invent an observed traversal.

Maintain derived indexes incrementally and rebuild them after restore under the existing generation boundary. Index rebuilding grants no observations and fires no new onsets. Cold construction and genuinely large affected areas have explicit costs and partial-work handling.

## 6. Continuing conditions and cue combinations

### True, false and unknown

A continuing predicate has true, false or unknown evidence status. A supported entry creates one episode/generation. Continued truth updates its newest support without renewing onset or brief attention indefinitely. Supported escalation can justify another choice without pretending the original condition began again.

Clearance and rearming require the declared supported clear condition and interval. Missing evidence, unfinished candidate work, failed interpretation, deselection, a dropped model packet, elapsed wall time or save/load cannot prove clearance. A due deadline requests the necessary check; it is not evidence that clearance occurred.

Unknown current support may end a demand for present visual tracking while preserving a pending concern, last-seen knowledge or a previously accepted response under its own contract. These are not interchangeable state changes. Retain bounded live latch state for relevant episodes rather than allocating a negative record for every possible rule and subject.

### Bounded personal cue joins

A pattern declares compatible cue families, its temporal window, supported subject or perceived-region keys, required relationships and expiry. A new cue queries only the relevant retained candidates. Do not search a person's full history or compare every pair of sounds in a town.

A help call and battle sounds can support a tentative nearby-fight interpretation when their personally received timing, direction, location or recognized source supports the connection. A private encounter identifier cannot join them for the observer. The conclusion cannot invent the attackers, exact location, number of combatants, or the speaker's sincerity.

Repeated representations of one scream are one supporting occurrence. Distinct compatible cues may strengthen or change the supported interpretation. Equivalent partial pattern states can share work only when their meaning and dependencies agree; independent obligations and witnesses remain independent. Expiry releases obsolete partial state.

Interpretations retain their supporting evidence and uncertainty through existing knowledge/appraisal owners. They do not become sensory facts. A derived conclusion cannot create fresh evidence of itself, endlessly raise its own priority, or buy another model call merely because it was recomputed. Reject unbounded instantaneous inference cycles. Actual resulting speech or physical action can create a new occurrence through its ordinary owner.

## 7. Persistence, privacy and failure

Save or deterministically reconstruct state whose loss would change behavior: active concerns, entered condition generations, supported clear intervals, meaningful partial cue patterns, demand expiry, and accepted decision dispositions. Rebuild lookup tables and runtime scheduling structures. Preserve original evidence identity, timing and correction dependencies; do not save another full scene or duplicate source text for every reason.

Current-format restoration neither replays satisfied watches nor grants new discovery or model attempts. Observer/subject life replacement, concern cancellation, actual evidence withdrawal and permission loss invalidate their exact dependents. Policy replacement follows its declared activation/retirement terms: retained pinned work stays on its original supported terms, while explicit cancellation or removed required capabilities invalidates affected work. A change for future bindings neither silently retunes nor necessarily cancels an existing watch. Loss of sight alone does not erase a legitimate historical observation. Correction or forgetting follows the relevant memory/privacy owner's stronger rules.

Shared caches may contain common source preparation and equal immutable geometry. Personal match, recognition and priority results are scoped by observer/life, permitted evidence and correction generation, concern revision and selected definition revision. A canonical identity or private tag cannot leak through a supposedly shared match result. Stale captured work is revalidated before disclosure and separately before action application.

Optional capacity exhaustion yields explicit incomplete analysis or deferred optional work. It establishes no absence, safety, fictional decision to ignore, or completed thought. Newly requested voluntary monitoring is refused when its required supported work cannot be admitted. If an accepted exact monitor cannot maintain admitted coverage, its existing work owner records coverage-incomplete or failed status at the first affected boundary, preserving prior matches, latches and results. It cannot report a negative match, successful completion or uninterrupted exact coverage. Its accepted continuation determines suspension, termination or separately admitted restart. Recovery cannot treat the gap as clear or renew onset, deadline or response opportunity.

Actual required observations and native effects retain their owning integrity and backpressure contracts. An optional pattern limit cannot erase damage, heard speech, a required action result or another witness's evidence. Coalesce compatible decision opportunities per actor, retaining their distinct causes; do not create one provider job per rule match or an unbounded catch-up queue.

Use existing simulation deadlines for demand expiry and condition checks, and existing host deadlines for provider work. Do not convert provider delays into fictional surprise or decision duration. Stationary scenes still complete genuinely pending deadlines; clean, completed, unknown conditions are not polled forever without a relevant change.

## 8. Source evidence and proposed integration seams

The documentation base is `Macrofold/OpenLegend` `main` at `c962980424b2eacf9d58078139aab0e7ea02ed20`. That snapshot contains the TypeScript perception owners and existing feature designs. It does not contain the Rust implementation referenced in the earlier proposal.

The following source evidence was separately inspected on `codex/native-simulation-proof` at `cd76e6f3ac34bb8af2fb8d39188bfc651c364a52`. It is evidence from that branch, not a claim that its code is integrated into the documentation base. Implementation must select its actual runtime base before editing executable owners.

| Inspected evidence                                                                                                                                                                                                                                                                                                                                             | Finding and implication                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Attention candidate calculation](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/native/simulation/src/reception/attention_control/candidates.rs)                                                                                                                                                                       | Current optional ranking takes the maximum of urgency, qualitative novelty and displacement, then adds familiarity. It does not implement the earlier 60/30/10 proposal or a generic seeing-clearly bonus. Replace the relevant ranking contract through this owner rather than add a second attention system. |
| [Attention selection](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/native/simulation/src/reception/attention_control/selection.rs)                                                                                                                                                                                    | Urgent cues, direct involvement, explicit focus and work already have distinct selection treatment. The ordinary stability deadline is a detail-selection rule, not a deliberation timer or goal switch.                                                                                                       |
| [Relation lifecycle](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/native/simulation/src/reception/attention_control/relations.rs) and [measurement](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/native/simulation/src/reception/attention_control/relations/measurement.rs) | Closing-body and closing-drop checks already use personal received intervals, conservative bounds, generations and supported clearance. Generalize justified predicates and binding through this lifecycle, preserving unknown coverage.                                                                       |
| [Native watch](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/native/simulation/src/plans/watch.rs)                                                                                                                                                                                                                     | The implemented gate supports sighting/presence of a bound subject at a known place and consumes the actor's active plan directly. Container-opening and arbitrary guarded-object interactions require new supported predicates and possibly observation producers.                                            |
| [Personal intake](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/native/simulation/src/experience/intake.rs)                                                                                                                                                                                                            | Received roles and consequences already distinguish a spectator from a person with a choice. Matching reasons before prompt selection must preserve this boundary; importance alone is insufficient. Retained-collection scans remain a cost to inspect rather than a demonstrated O(1) path.                  |
| [Appearance sensitivity](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/native/simulation/src/appraisals/sensitivity.rs)                                                                                                                                                                                                | Exact cue/subject maps and per-subject onset tracking provide a narrow existing example of personal relevance without a biography scan. This does not establish arbitrary semantic monitoring.                                                                                                                 |
| [Preparedness tracker](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/docs/maintainers/preparedness-and-surprise.md)                                                                                                                                                                                                    | The full shared surprise-contact/preparedness design is still marked unimplemented. Existing native creature responses and appearance appraisals must not be mistaken for delivery of that complete feature.                                                                                                   |
| [Witness feature collection](https://github.com/Macrofold/OpenLegend/tree/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/docs/features/noticing-and-remembering)                                                                                                                                                                                                     | Quiet witnesses can receive and later recount evidence without an immediate decision. Preserve this behavior when reconciling the implementation branch and this target.                                                                                                                                       |

The [recorded crowd measurement](https://github.com/Macrofold/OpenLegend/blob/cd76e6f3ac34bb8af2fb8d39188bfc651c364a52/scripts/performance/witness-sustained-metrics.md) reports 700.22 ms as the union of perception wall-clock spans in one instrumented warmup writer turn, whose world-access hold lasted 1,201.35 ms. Attention spans can be nested inside perception. The recorder filled before the measured workload and dropped records. This does not attribute 700 ms to scoring or establish the saving from this proposal. Clean crowd cases establish an integrated throughput problem; scoring, acquisition, retention and publication still require separate attribution.

## 9. Delivery stages and qualification

Implementation remains under [EPR06](../maintainers/events-perception-and-reactions.md#epr06--persistent-stimuli-and-bounded-actor-local-relevance). EPR08 retains save/load, generation fencing and overload; EPR09 retains differential and performance acceptance. [ATI04/ATI08](../maintainers/attention-and-investigation.md) retain initiative and playable integration, and [PS04](../maintainers/product-scalability.md) retains coherent scenes and limited attention. The stages below are integration boundaries, not a parallel task tracker or implementation authorization.

| Stage                                       | Complete connected result                                                                                                                                                             | Required evidence                                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence and reason lifecycle               | An ordinary approach, actual guarded-object change and serious received danger acquire personal facts, create the appropriate brief/maintained demand, and preserve required history. | A nearby uninvolved witness can notice without a model request; unknown opener/identity remains unknown; repeated samples create no increasing score.                                      |
| Changed-input selection and continuation    | Active pursuit steers from supported compact observations while meaningful distractions reach attention and existing choice admission.                                                | Visible pursuit, occlusion, last-seen search, simultaneous danger and compatible continuation work through ordinary gameplay. No hidden target updates or mandatory stability-delay pause. |
| Indexed reusable monitoring                 | Bound watches, both-body spatial conditions, supported state transitions and one contrasting crafting/production concern use common matching and lifecycle.                           | Unrelated definitions receive no evaluations; supported clearance, stale bindings, cancellation, deadlines and restore preserve outcomes.                                                  |
| Cue combinations and action reconsideration | A help call and compatible combat sounds can support a tentative interpretation and one personal choice while the old task remains explicit.                                          | Ambiguous direction, mistaken association, repeated cues, separate incidents, insufficient evidence and evidence correction remain honest.                                                 |
| Complete workload qualification             | A crowded market combines chase, merchant watch, serious distraction, ordinary movement and later witness recall.                                                                     | Compare complete game speed, response latency, CPU and retained-state growth; report workload and failed results without claiming unmeasured capacity.                                     |

Proposed checks separately vary unrelated catalogue size, same-family rules for other subjects, active bindings for the changed subject, actually relevant matches, witnesses, cue density, retained history and moving-region size. Required semantic cases include finite examination expiry, urgency bypass, meaningful escalation, supported false/unknown distinction, correction, privacy, save/load, stale provider results, pressure, and direct-player control. Add a nonhuman or nonvisual installed case to challenge assumptions about human occupations and sight.

Count dispatch probes, bindings reached, predicate nodes evaluated, joined candidates, outcomes, sensory checks, source/body preparation, retained changes, native-resolved choices, admitted model turns, and publication delay. A lower model-call count is not proof of cheaper perception. A smaller result set is not proof of bounded work. One actor's failed optional interpretation cannot suppress another actor's required observation or decision opportunity.

These are proposed implementation checks. No runtime experiments, benchmarks, automated suites or gameplay qualification were run for this design. Existing verification policy controls execution; source inspection establishes the design baseline, not operating acceptance.

## Maintained records

- Behavior: [Perception and attention](../features/perception-and-attention/README.md).
- World meaning and tuning: [Base-world profile](../worlds/base/perception-and-attention.md).
- Constraints and matching envelope: [Perception and attention limits](../limits/perception-and-attention.md).
- Implementation and qualification: [Events, perception and reactions](../maintainers/events-perception-and-reactions.md), [attention and investigation](../maintainers/attention-and-investigation.md), [product scalability](../maintainers/product-scalability.md).
- Related contracts: [Engine/world boundary](../engine-and-world-boundaries.md), [simulation time](../simulation-time.md), [save/load](../save-and-load.md), [sensory performance](../performance/spatial.md), [preparation and reuse](../performance/preparation.md).

# Action capability grounding and activities: delivery tracker

**Status: design and acceptance work; all new tasks below are unimplemented/unqualified.** This is the focused subtracker for the detailed parameterized invocation and activity contract beneath AG05, with AG03 continuation and INV-3 family integration. It does not replace their IDs, reset their checkboxes, or duplicate their complete acceptance programs.

The [capability specification](../action-capabilities.md) owns behavior/contracts. The [action repertoire](../repertoires/actions.md) owns example intents. [Architecture](../architecture.md) owns current facts; [Verification](../verification.md) owns actual evidence. The [maintainer index](README.md) remains navigation only.

## Ownership and dependencies

| Parent owner | Dependency used here | Work that remains there |
| --- | --- | --- |
| [AG01–AG05](agent-agency.md) | Existing operation lists, private attempts, goals, frontier and receipts | Overall agency lifecycle and acceptance; AC supplies detailed parameter binding/activity work |
| [AG06–AG09](agent-agency.md) | Scoped context, meaningful reconsideration, actor invention return, persistence | No new goal store, cognitive opportunity service or invention loop |
| [INV-3 and INV-7](inventions-and-world-evolution.md) | Common family metadata, discovery/execution and missing-capability classification | Definition authoring, policy locks, admission, version activation and later G2/G3 |
| [EWF](extensible-world-foundation.md) | Shared module/manifest and typed service contracts | Common registry/state owner rather than an AC-specific plugin platform |
| [SW](spatial-world.md) | Destination/support binding, native routes, spatial knowledge and movement | Geometry/pathfinding algorithms, modes, collision, body support and flight |
| [EPR](events-perception-and-reactions.md) | Perception/evidence, event identity and reaction delivery | Sensory production, audience scope and global reaction scheduling |
| [NC](narration-and-conversations.md) | Conversation, expressions, communication effects | Speech/gesture implementation, private/public narration and social projections |
| [SL](save-and-load.md), [PF](performance.md) | Same-version state, epochs, native scheduling and measurement | Global persistence and performance architecture |

## Delivery slices

The first playable slice is **parameterized movement through the existing native executor**, not a generic scripting runtime. Subsequent slices add genuinely reusable semantics demonstrated by repertoire cases. Do not wait for fire, vehicles, cooperative lifting or arbitrary world invention to make point movement work.

| Slice | Tasks | Playable/evaluable result | Explicitly not a prerequisite |
| --- | --- | --- | --- |
| A — Ground and move | AC01–AC04 plus applicable AC10–AC12 checks | An unlisted “go to this coordinate/support” becomes real timed movement through either player or NPC text input | New physics, full INV registry rewrite, general plan graphs |
| B — Persist relations | AC05 plus AC08/AC10 checks | Follow a visible target, hold a relation, lose it honestly, cancel and restore | Scent, footprints, perfect stealth, general crowd simulation |
| C — Compose methods | AC06–AC08 | Short sequences, real result bindings, waits, conditions and bounded repetition | Global optimal planner, arbitrary expressions, parallel execution |
| D — Broaden ordinary use | AC09 plus domain-owner family work | Shared menus/NPC/text invocation for compatible inventory, devices, care and other families | Hard-coding every catalogue example |
| E — Qualify across constitutions | AC10–AC12 | Same outer invocation/lifecycle tested against different bodies, senses and topology contracts | Implementing every fantasy/sci-fi world example |

## AC01 — Reference-bearing intent contract

**Owner:** AG server response schema and domain admission. **Depends on:** existing AG01/AG04. **Touchpoints:** `apps/server/src/cognition-contracts.ts`, `packages/domain/src/response.ts`, request-bound reference construction in `response-context.ts` and `decision-context.ts`.

- [ ] AC01.1 Add logical offered/invoke/attempt variants to the existing optional operation path, retaining server-bound authority and bounded structured role references. Provider-specific nullable encoding must preserve the same logical semantics.
- [ ] AC01.2 Preserve original text and consequential slots: target, part, instrument, recipient, amount/unit, frame, method constraints, time/termination and queue/replace mode. Distinguish goals, hypotheticals, quotes and performance from effectful requests.
- [ ] AC01.3 Validate reference type/scope, exact keys, aggregate limits and local identities before mutation or paid dispatch. Names and inherited dictionary keys cannot stand in for authorized references.
- [ ] AC01.4 Preserve valid independent speech/thought/goal components when an attempt cannot bind. Empty output continues work. Do not create a second response or pending-intent store.

**Exit:** AX01–AX10 and AX64 pass as no-network fixtures. A proposal can carry its target instead of reconstructing identity from prose; it still cannot carry authoritative effects or another actor's authority.

## AC02 — Consume the common capability descriptor

**Owner:** INV-3/EWF interface owner with AG invocation consumers. **Depends on:** the smallest existing-family contract extraction needed by INV-3, not completion of all invention features. **Touchpoints:** common domain module metadata, native command adapters, `action-catalogue.ts`, `context.ts`, `cognition.ts` and `world-service.ts`.

- [ ] AC02.1 Implement the invocation projection specified in the capability document using the existing common family/manifest owner. Register the initial movement and selected existing-family adapters there; do not add a parallel AC registry.
- [ ] AC02.2 Reuse one strict family codec and authoritative admission/execution path from player menus, NPC candidates, structured decisions and text grounding. Retain small typed wrappers where useful.
- [ ] AC02.3 Project scoped discoverability, parameter types, knowledge requirements, blocked/unknown status and contrast examples independently of a short concrete candidate list.
- [ ] AC02.4 Reject caller-supplied validators, function paths, effect summaries, dependency omissions, raw state mutation and unknown executable fields. Pin required family/definition versions through common metadata.
- [ ] AC02.5 Expose this same invocation contract through the World Agent tool service under INV-20.2. Keep out-of-world inspection separate from actor action authority; no shortlist-only vocabulary or second native dispatcher.

**Exit:** a new parameterized native family is visible through the shared consumers without editing unrelated transport/render switches. AX06, AX21, AX55, AX57 and AX68 establish the authority boundary. Full family growth remains INV-3-owned.

## AC03 — Bounded action grounding

**Owner:** server interpretation and actor decision preparation. **Depends on:** AC01–AC02. **Touchpoints:** `attempt-interpretation.ts`, `decision-context.ts`, `cognition-contracts.ts`, `ai-director.ts`; generic provider adapters remain policy-free.

- [ ] AC03.1 Keep the exact handle/direct structured invocation fast path; add safe unambiguous parameter binding. A valid Jev-selected concrete action still reaches native admission without a generative call.
- [ ] AC03.2 Supply bounded relevant family schemas and scoped references for freeform interpretation, even with an empty/omitted suggestion shortlist. Do not enumerate every coordinate/quantity or load the idea catalogue into prompts.
- [ ] AC03.3 Return structured resolution categories and original operation identity; distinguish unresolved planning from faithful method interpretation. Do not substitute a feasible but different objective.
- [ ] AC03.4 Integrate `needs_definition` with the INV-owned request/classification interface under existing actor-origin policy. Unsupported host capability and provider unavailability remain distinct. Do not auto-invent to bypass a missing runtime implementation or lock.
- [ ] AC03.5 Persist bounded unresolved attempts and reason-specific dependency signatures using existing ownership. Suppress unchanged failures without suppressing different targets, methods or quantities. No automatic paid repair loop.

**Exit:** AX01–AX10, AX19–AX26, AX53–AX58, AX62, AX64 and AX69 pass. Diagnostics distinguish direct, interpreted, planned, blocked and authoring-routed outcomes; no claim of universal semantic fidelity.

## AC04 — Point movement and first native vertical slice

**Owner:** AG grounding/dispatch with SW destination/movement owner. **Depends on:** AC01–AC03 and currently supported spatial execution. **Touchpoints:** `cognition.ts`, `context.ts`, `response.ts`, `agency.ts`, `kernel.ts`, spatial destination adapters and public intention projection.

- [ ] AC04.1 Bind explicit surface points, actor-relative displacement and permitted remembered locations to the existing native move command. Make the coordinate frame and support choice explicit.
- [ ] AC04.2 Clarify ambiguous stacked surfaces and refuse unsupported traversal without rewriting the destination. Preserve public-terrain versus actor-known geometry policy and coarse-contact restrictions.
- [ ] AC04.3 Route queued movement through the existing physical lane and plan receipts. Do not execute several timed moves immediately or directly set position from the model response.
- [ ] AC04.4 Expose movement independently of manual-work/human-hands capability where the installed body supports it. Native survival and explicit replace/cancel remain coherent.
- [ ] AC04.5 Exercise player text, actor text, direct structured output and a selected grounded candidate against the same destination/execution path, including no-AI runtime continuation.

**Exit:** NAV-01–04 and AX11–AX14, AX27–AX28, AX31–AX36, AX47, AX59–AX61 and AX69 pass. Invention remains locked during the movement fixture. Physical progress, actual arrival and blocked outcomes are visible and survive same-version restore.

## AC05 — Target-relative ongoing navigation

**Owner:** native AG activity and SW movement adapter. **Depends on:** AC04 plus existing perception. **Touchpoints:** `Action`/plan state, native movement helpers, actor-observation projection and scheduler dependencies.

- [ ] AC05.1 Implement a supplied follow/maintain invocation with typed relation, tolerances, extent, observed target binding, termination and loss policy. Start with near/follow; qualify heading-dependent behind/beside only with actual supported pose evidence.
- [ ] AC05.2 Keep one authoritative physical owner. Store controller/cursor state inside the current AG action/step; reuse native route/motion services without an independent position writer.
- [ ] AC05.3 Implement acquire/move/hold/lost/blocked/terminal transitions, hysteresis and bounded replanning. Holding a relation is not terminal success for a maintain activity.
- [ ] AC05.4 Read live target positions only through permitted observation; default to stopping on lost evidence. Implement last-observed-location continuation only as an explicit disclosed option, with no automatic hidden tracking or search.
- [ ] AC05.5 Cancel, replace, disable, restore and revalidate activity state without lost subscriptions, duplicated movement, forgotten goals or repeated paid decisions. Keep SW's route/preparation failure semantics.

**Exit:** REL-01–07 and AX15–AX18, AX31–AX36, AX45–AX48, AX51 and AX59–AX63 pass. Following an occluded deer cannot exploit its authoritative position, even though the simulation knows it.

## AC06 — Typed method composition and result ports

**Owner:** AG03 continuation and family-output adapters. **Depends on:** AC02–AC04. **Touchpoints:** `agency.ts`, `response.ts`, native completion receipts, request schemas and plan projection.

- [ ] AC06.1 Extend the existing frontier to bound family invocations with typed successful-result ports; preserve actual item outputs before adding additional result kinds with concrete consumers.
- [ ] AC06.2 Add bounded sequence semantics without a second plan store. Dependent steps wait for terminal outcomes; partial effects, multiple outputs and optional skips require explicit supported representation.
- [ ] AC06.3 Add registered three-valued predicates, branch dispositions and native waits through existing scheduling. Unknown, false, stale and technical failure must not collapse together.
- [ ] AC06.4 Add counted/finite-set iteration with stable per-iteration identities and bounded state/work. Add open-ended qualified activities only with explicit scope, termination, cancellation and budget policy.
- [ ] AC06.5 Recheck guard plus mutation atomically where required. Pin branch decisions and consumed outputs after commit; restore cannot choose a different past branch.
- [ ] AC06.6 Supply shared constraint/result references for invention-method preparation and runtime maintained checks under INV-20.7. Cover causal ordering, preserved exact instances, sealed content and changing evidence without a separate workshop expression language.

**Exit:** AUT-01–06, INV-12 and AX24–AX30, AX33–AX36, AX37, AX49, AX59–AX63 and AX70 pass. No generic evaluator, SQL, arbitrary JSON paths, hidden-state predicate or unbounded recursive graph is accepted.

## AC07 — Scoped inspection, search and monitoring

**Owner:** actor-query/grounding integration; EPR/CR retain sensing and recall. **Depends on:** AC02–AC03, AC06 for composed search; existing sense owners. **Touchpoints:** scoped observation/query projections, `interests.ts`, `actor-work.ts`, recall and EPR intake.

- [ ] AC07.1 Expose permitted inspection/measurement capabilities with their true detail, cost, disturbance and attention requirements. Do not use god inspection or private component dumps.
- [ ] AC07.2 Implement bounded search scopes, result paging, visited/checked coverage and honest negative results for one actual search consumer. Unavailable interiors, unknown materials and inaccessible locations remain distinct.
- [ ] AC07.3 Register activity watches through existing dependency/reaction intake with evidence cursors and meaningful edge/level policies. Losing sensory/access capacity changes coverage; no hidden private-state watch.
- [ ] AC07.4 Allow native prescribed reactions and coalesced reconsideration for unresolved changes. No new scheduler or automatic per-observation model call.

**Exit:** OBS-01–06, AUT-02/04 and AX19–AX26, AX46, AX49, AX51, AX60–AX62 and AX70 pass. Searching does not become an omniscient query, and subscriptions do not outlive cancelled authority.

## AC08 — Lifecycle, channels and participation integration

**Owner:** AG03/AG07 with NC and relevant family owners. **Depends on:** AC02, AC05/AC06 as used. **Touchpoints:** action lifecycle, goal/plan revision handling, family cancellation, conversation/request adapters.

- [ ] AC08.1 Apply native cancel/replace/pause/resume semantics to new invocation/activity states using existing AG mutation entrypoints. Unsupported pause/resume produces an honest result, not fake progress retention.
- [ ] AC08.2 Keep the single physical lane initially; reject unsupported simultaneous body work. Preserve already supported speech/private-operation concurrency without inventing extra limbs or attention.
- [ ] AC08.3 Implement request/offer/handoff bindings that do not submit another actor's acceptance or command. Participation results become actual typed continuation evidence.
- [ ] AC08.4 Before shipping a genuinely joint physical family, implement its role/readiness/start/withdrawal protocol and resource arbitration under its owner. Do not mark cooperative lifting supported merely because invitations work.
- [ ] AC08.5 Integrate the first INV-20.6 worksite's readiness, role acceptance, participant channel claims and withdrawal into existing action ownership. Keep passive/machine work distinct from actor labor; richer concurrency requires the actual body/family consumer.

**Exit:** COM-05, INV-03–05, COOP-01–04 and AX31–AX44, AX50–AX51 and AX58 pass for the delivered subfamilies. Undelivered joint physics remains explicitly unsupported.

## AC09 — Expand ordinary use through domain-owned families

**Owner:** each actual mechanical family under INV/EWF; AC owns consumer integration only. **Depends on:** AC02 plus the specific domain mechanics.

- [ ] AC09.1 Adapt existing narrow actions to the shared invocation projection without changing their material, duration, knowledge or outcome semantics.
- [ ] AC09.2 Prove one new non-navigation parameterized ordinary-use family through all text/menu/NPC/plan surfaces. Prefer possession transfer or compatible device operation with actual resource/target semantics.
- [ ] AC09.3 Use the repertoire's related-mechanic keys to identify gaps. Route fire, fluids, body care, construction, vehicles and special abilities to their actual owners rather than enlarging an action enum or creating placebo effect labels.
- [ ] AC09.4 Demonstrate compatible repurposing/composition when real interfaces allow it; a pot-as-bell or plank-as-support example remains blocked until its actual acoustic/support mechanics exist.
- [ ] AC09.5 Keep ordinary invocation available under the appropriate invention lock: a known mechanic's use is not authoring. Definition changes continue through INV.

**Exit:** at least one additional family passes the same relevant AX contract tests without special cases in every generic layer. Wider catalogue coverage is not inferred from that one example.

## AC10 — Persistence, security and version integrity

**Owner:** AG09/SL and the existing serialized application writer. **Depends on:** each stateful slice as it lands, not only at the end.

- [ ] AC10.1 Capture accepted invocation/definition pins, bound references, activity/controller state, waits/cursors, branch/iteration identity and actual outputs in same-version saves.
- [ ] AC10.2 Fence old native preparation, perception, interpretation and asset callbacks by world/load epoch and relevant revisions. Rebuild derived watches without replaying paid calls or old events.
- [ ] AC10.3 Reuse durable admission/idempotency beyond hot receipt windows; preserve uncertain real accounting and native RNG. Reject identity reuse with altered content.
- [ ] AC10.4 Enforce private actor evidence versus authoritative adjudication versus projected feedback. Reject raw world queries, new host privileges and generated code through ordinary invocations.
- [ ] AC10.5 Reject incompatible development saves explicitly. Do not add old-format migrations. Apply canonical active-definition policies rather than silently upgrading running calls.

**Exit:** AX19–AX26, AX53–AX68 and AX71 pass. Same-version replay continues the same accepted work with no extra effect, knowledge, charge or native random draw.

## AC11 — Usability and measured efficiency

**Owner:** existing UI/protocol, god diagnostics, PF and provider integration. **Depends on:** each implemented slice.

- [ ] AC11.1 Project understood/queued/running/waiting/blocked/completed/cancelled states and actor-safe reasons. Preserve original editable intent and support targeted clarification without mandatory confirmation for every ordinary action.
- [ ] AC11.2 Trace source intent -> reference binding -> capability/definition -> admitted work -> actual receipt through existing diagnostics. Do not expose private context, hidden targets or model reasoning.
- [ ] AC11.3 Measure direct versus interpreted resolution count, native steps per semantic decision, action-fidelity errors, scoped-query work, path replans, watchers, receipt size and cancellation latency.
- [ ] AC11.4 Qualify conservative selector/node/depth/watch limits and per-turn work under the current scheduler. Report measured workload and hardware, not an unsupported population capacity claim.
- [ ] AC11.5 Verify visuals and delayed generated assets cannot change mechanics, block valid work indefinitely or leak hidden targets. Use existing fallback presentation.

**Exit:** AX06, AX45, AX49, AX69–AX72 and relevant privacy fixtures pass. Native continuation has zero paid calls; no all-actions-by-all-entities expansion or active-activity full-world polling appears in profiles.

## AC12 — Cross-constitution and end-to-end acceptance

**Owner:** integration/verification maintainers; existing AG12 owns broader live agency quality.

- [ ] AC12.1 Run the matrix below with isolated deterministic fixtures and injected providers, including current wilderness bodies, a touch-limited actor and a finite-charge actor.
- [ ] AC12.2 Add a deliberately different contract fixture, such as graph-location traversal, to prove the outer invocation/lifecycle does not require XYZ coordinates, human hands or hunger. A fixture is not evidence of a shipped playable graph world.
- [ ] AC12.3 Run actual repository format/typecheck/test/browser commands appropriate to runtime changes, inspect the complete diff, and update only the relevant Architecture/Verification facts with real evidence.
- [ ] AC12.4 Separately qualify a small live text-action set only under explicitly authorized provider/budget policy. Record cost, latency, exact cases, fidelity failures and uncertainty. Do not infer broad model quality from fixtures or a few live successes.
- [ ] AC12.5 Maintain repertoire IDs and links as coverage grows; evidence links point to canonical verification rather than turning the idea catalogue into a second release tracker.

**Exit:** implemented slices have their own real evidence, all remaining work stays unchecked, and the introductory docs clearly distinguish target expressiveness from actual support.

## Acceptance matrix

Each row is a required test scenario for its applicable slice, not evidence that the test currently exists or passes. Tests must use independent outcome invariants rather than mirror implementation switches. Native fixtures make no external provider calls.

| ID | Scenario | Required oracle |
| --- | --- | --- |
| AX01 | A thought says “I should open the door.” | No door command or physical effect. |
| AX02 | Quoted speech contains an imperative. | The quote remains data; no nested command execution. |
| AX03 | “Do not pick up the stone.” | Negation cannot become pickup. |
| AX04 | “I might follow the deer tomorrow.” | Hypothetical prose does not start a follow activity. |
| AX05 | “Pretend to duel.” | No real combat or damage event. |
| AX06 | Unlisted move with empty action suggestions. | Capability grounding still runs; no permission/vocabulary dead end. |
| AX07 | Two visible actors share a name. | Use a supplied unambiguous reference or clarify; never pick hidden identity. |
| AX08 | Exact instrument and recipient specified. | Both remain unchanged through binding, queuing and execution. |
| AX09 | Whisper/stealth/non-disturbance unavailable. | No silent downgrade to loud or disturbing behavior. |
| AX10 | Exactly one unit requested from a fixed larger batch. | No silent overcollection; supported exact binding, clarification or limitation. |
| AX11 | Explicit point on an upper support. | Correct floor, actual timed route and true arrival. |
| AX12 | Coordinate pair overlaps two floors. | Clarify support rather than choose by arbitrary nearest projection. |
| AX13 | Actor-relative movement while camera rotates. | Destination uses actor frame, not camera orientation. |
| AX14 | Travel to a remembered observation location. | Destination stays that recorded location after target moves unseen. |
| AX15 | Followed target leaves perception. | No hidden current-position updates. |
| AX16 | Behind relation without heading evidence. | Unknown/clarification or explicitly accepted alternative; no fabricated heading. |
| AX17 | Scent tracking without a scent family. | Unsupported capability, not visible-follow with hidden coordinates. |
| AX18 | Target changes surface or requires unsupported flight. | Honest route/mode outcome; no planar shortcut or teleport. |
| AX19 | “Nearest” target with a closer hidden candidate. | Hidden candidate cannot influence actor selection. |
| AX20 | Coarse unidentified contact. | No exact identity/location gained through grounding. |
| AX21 | Another actor knows a private recipe. | Registry/discovery cannot reveal or teach it. |
| AX22 | Inspect an object with unknown material properties. | Unknown retained; no default immunity or perfect material report. |
| AX23 | Carry a sealed container. | Movement can proceed without disclosing its contents. |
| AX24 | Branch predicate is unknown. | Explicit unknown disposition; no false-branch shortcut. |
| AX25 | Wait for a signal outside active hearing. | Undelivered signal cannot complete wait. |
| AX26 | Physical check knows a hidden obstruction. | Actor feedback does not reveal exact unseen geometry/cause. |
| AX27 | Several timed actions in one response. | Sequential starts follow actual terminal outcomes, not immediate command loops. |
| AX28 | Gather then eat/equip a produced item. | Consumer binds actual successful typed output. |
| AX29 | Save after selecting a branch. | Restore cannot retrospectively choose another branch. |
| AX30 | Duplicate an iteration completion. | No duplicate material effect or next iteration. |
| AX31 | Empty response during work. | Existing activity, goal and subscriptions remain unchanged. |
| AX32 | Late replace arrives after plan changes. | Relevant stale intent rejected; unrelated valid components survive. |
| AX33 | Cancel after materials are consumed. | Committed costs remain spent; future work stops. |
| AX34 | Pause/resume requested for a non-resumable family. | Honest unsupported lifecycle result; no invented retained progress. |
| AX35 | Sequence contains an indefinite follow then craft. | Craft does not start until actual declared termination. |
| AX36 | Simulation speed/pause and route preparation vary. | Work uses simulation time; technical cache delay follows SW, not provider latency. |
| AX37 | Two actors take the last available item. | At most one successful transfer; loser gets a real outcome. |
| AX38 | Custody differs from ownership. | Item movement does not silently rewrite ownership. |
| AX39 | Barter offer changes before acceptance. | Exact offer revision revalidated; no accidental unilateral settlement. |
| AX40 | Offer food versus give food versus feed. | Distinct communicated, transferred and consumed results. |
| AX41 | Ask an NPC to help. | No direct target-plan mutation or forged acceptance. |
| AX42 | Helper accepted but has not arrived. | Joint physical work cannot start as though ready. |
| AX43 | Participant withdraws during joint load bearing. | Actual family interruption/support consequences; no ghost participant. |
| AX44 | Simultaneous body actions exceed supported lanes. | Reject/arbitrate; speech/private exceptions do not create extra manipulators. |
| AX45 | Target jitters near follow-distance threshold. | Hysteresis and bounded replanning; no paid or native storm. |
| AX46 | Last-known-location loss policy. | Stop/reconsider at that location unless a separate search was authorized. |
| AX47 | Route becomes blocked mid-activity. | Stay at valid position, preserve goal, emit correct scoped failure. |
| AX48 | Termination condition arrives before the next motion step. | No unauthorized additional pursuit after termination admission. |
| AX49 | Repetition or selector exceeds per-turn budget. | Bounded scheduling disposition; no unbounded loop or invented completion. |
| AX50 | Actor leaves a running automatic device. | Device follows its own process lifetime; manual work does not become autonomous. |
| AX51 | Watching actor sleeps, departs or loses its sense. | Observation coverage changes; no omniscient continuing watch. |
| AX52 | Request includes wind-based concealment with no wind/scent model. | Preserve unsupported clause; no falsely successful stealth. |
| AX53 | Move/eat/use known action while NPC invention is locked. | Ordinary authorized use does not require opening authoring. |
| AX54 | Known spell used for a novel ordinary goal. | Invoke existing definition, not unnecessary reinvention. |
| AX55 | Missing fire/flow/force implementation. | No effect from prose, tags, art or an invented G1 field. |
| AX56 | Unresolved method reaches INV. | Preserve actor origin/method and locks; no hidden finished solution or auto-build. |
| AX57 | Definition changes during interpretation or active work. | Apply exact pin/activation policy; never silently retarget. |
| AX58 | In-world theft or compulsion versus platform authority. | World rules do not grant raw private data or control of human accounts. |
| AX59 | Duplicate response after hot receipts rotate. | Durable identity prevents duplicated effects. |
| AX60 | Load a save while old native/model/asset callbacks remain. | Old epoch rejected; no abandoned-future effects or disclosures. |
| AX61 | Restore a wait, follow or partially completed method. | Cursor, evidence, outputs and native continuation remain coherent. |
| AX62 | Relevant dependency changes versus unrelated ticks. | Retry invalidates only for the appropriate cause; paraphrases do not bypass blocks. |
| AX63 | Rebuild caches and subscriptions. | No extra native RNG draws, past branch changes or event replay. |
| AX64 | Optional interpretation fails after valid speech generation. | Preserve valid components and unresolved intent; no automatic paid repair. |
| AX65 | Touch-only actor receives an action request. | No new sight, map oracle or precise hidden contact identity. |
| AX66 | Finite-charge non-biological actor acts and replenishes. | No mandatory hunger, human anatomy or food semantics. |
| AX67 | Graph-world contract fixture uses navigation. | Outer invocation/lifecycle works without required XYZ/support/human fields. |
| AX68 | Payload includes code, effect setters or unregistered predicates. | Reject before mutation; no eval or host-operation creation. |
| AX69 | Direct structured or Jev-selected grounded action. | No mandatory generative translation; native continuation also makes zero paid calls. |
| AX70 | Large partially searched scope. | Bounded paging with honest partial coverage; not “all clear.” |
| AX71 | Art delivery fails or arrives for an old version. | Mechanics unchanged; fallback remains; old asset cannot alter authority. |
| AX72 | Fixture acceptance compared with live evaluation. | Reports label actual test scope and calls/costs; no fabricated model-quality evidence. |

## Documentation and review gate

- [ ] Keep runtime facts in Architecture, observed evidence in Verification, open incompatible decisions in `archive/05-project/open-decisions.md`, and active research questions in the research backlog. Do not duplicate those records here.
- [ ] Review inbound links, target anchors, repertoire IDs, task ownership and the complete diff for information loss. Preserve all unrelated work and existing checkboxes.
- [ ] Change runtime code only as required for the delivered slice, using small shared adapters and actual tested extension seams. This design is not approval to implement every aspirational action or a speculative general language first.

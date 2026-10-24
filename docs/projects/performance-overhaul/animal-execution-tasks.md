# Animal simulation: implementation packets and qualification

| Status      | Current progress                                                                                                         | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | All 21 animal-execution dispositions and review fixes are delivered; command latency and broader acceptance remain open. | 2026-10-24   |

**Design prepared: 2026-10-24T03:26:45Z.** Companion to [architecture and decisions](animal-execution.md), the existing [feature specification](../performance-overhaul-feature-spec.md#animal-simulation-continuation) and [technical design](../performance-overhaul-tech-design.md#animal-simulation-continuation). The [PF09 checklist](../../maintainers/performance.md#pf09-animal-execution-continuation) is the sole task-status owner. A01–A21 correspond one-to-one to the consolidated list and supplied proposal; a conditional item is not silently complete.

**Current execution:** all 21 mechanisms or specified conditional dispositions are recorded in [the current evidence](../../verification/performance/2026-10/animal-execution.md). Main selects its existing three-game-second routine-sight cadence. Requested reviews correct shared bodily deadlines, observation-clock lifecycle, independent sense eligibility and overly broad rule-signature invalidation through existing owners. Static walking batches use the shared worker pool; no residual pure kernel meets the hardware gate. The latest ten-added run keeps up, twenty is not reliably at normal time and fifty fails the larger-run gate. Normal-speed capacity, command latency and broader first-playable acceptance remain open in PF09. Focused native/server/storage/browser evidence retains its actual source and limits. No new paid calls, branch switch or merge.

**Follow/cache correction and focused modularity:** current action/body facts replace redundant movement/perception membership sets; the existing dependency-valid capability preparation remains shared. Path execution, server command-input schemas and construction-phase data validation have focused owners, with all callers rerouted and no forwarding APIs, permission changes or saved-format changes. The [connected review evidence](../../verification/performance/2026-10/animal-execution.md#following-and-focused-modularity-review--october-24-2026) covers zero-rate following, restrictions, stopping, cold continuation and actual server/native consumers. Unchanged broader performance evidence remains limited to its measured source.

For every packet, record the production caller changed, repeated work removed, consumer correctness evidence, measured or unmeasured performance effect and residual limit. Reuse the current campaign and tools. Do not create another test programme, approval gate or benchmark for each helper. Code names below identify edit targets; inspect current signatures at implementation time rather than copying illustrative data shapes literally.

## A01 — Retain unaffected calculations after local deadlines

**Owners:** `kernel.ts` native advance/preparation, `temporal-boundaries.ts` interval/refinement, `status-effects.ts` rate preparation; shared derived records in a focused `native-preparation.ts` if needed. Depends on the current semantic-change owner, not a new event bus. Extends PF17.9/PF17.12 and PF13 rather than replacing them.

**Build:**

1. Change interval preparation to return the selected ending causes as well as elapsed duration. Preserve all equal-time causes; distinguish participant-local, coupled/global and sampling endings. Store absolute times and dependency generations alongside the already prepared participant facts.
2. Retain subject-local bodily selections/rates and action/motion facts after another subject's event. On each iteration consume semantic changes, expand only actual reverse dependencies, and refresh dirty/due entries. Derive predicates from the existing compiler; unknown groups remain conservative.
3. Replace the unconditional `remainingSeconds <= epsilon` → discard-all path. A sampling expiry refreshes the relevant sample/motion deadline; a local arrival refreshes that actor and actual effects. Global law/unknown coupled changes still invalidate the required wider group.
4. Preserve canonical phase order and entity order for simultaneous events. Collect due work before mutation, then apply existing bounded zero-time transitions. Scan compact numeric deadlines initially; do not add a heap until numeric-min selection itself is measured expensive.
5. Carry valid preparation only across an exact published continuation lineage. Commands invalidate from their real changes; unknown lineage and restore rebuild. The cache is disposable and unsaved; saved action/effect deadlines remain authority.

**Expected reduction:** broad bodily/movement preparation no longer runs almost once per animal movement slice. Arithmetic to find a minimum remains O(active participants); expensive rule/object traversal follows changed participants and their actual dependents.

**Acceptance:** A arrives at 112 while B retains arrival 118 and hunger threshold 180. Changing B's speed at 114 recomputes B's arrival from its actual current position. Two equal-time arrivals retain event/RNG order. A global status-definition edit and shared-supply depletion use the coupled owner correctly. Counters identify ending causes and show unrelated rule preparation retained, not merely a renamed global loop. Compare complete event/physical outcomes through native advance and server progress. An unsupported common dependency is an explicit open limitation to implement, not permission to mark the packet complete.

## A02 — Several internal intervals per owned world edit

**Owners:** `apps/server/src/world-service.ts` native-advance loop, domain native generator and `draft.ts`. Depends on A01 and a valid complete-boundary yield; finish with A12.

**Build:** remove the service's unconditional `maxIntervals: 1` policy for ordinary uncontended advancement. Continue the same generator/draft through successive compatible intervals until requested time completes, an ordinary operation waits, an existing execution budget is reached, or the host's approximately 32 ms publication target is reached at a complete boundary. Preserve approximately 8 ms I/O opportunities. The server, not the deterministic domain, measures real time. Retain the native work/interval limits as independent safety bounds.

Differentiate a preparation yield from a complete transition boundary. Preparation yields permit worker/I/O service but cannot publish unfinished consequences. When a command/read is waiting, return at the next complete boundary, freeze once, then use the existing mutation queue. Do not hold the writer until all accumulated game-time debt is drained. Ordinary readers use the existing last coherent immutable result while the edit is in progress.

**Expected reduction:** fewer finish/freeze/reopen cycles and repeated collection preparation for several short waypoints. This is not a promise of fewer database saves: their policy is separate.

**Acceptance:** three waypoint arrivals, a teaching interruption and subsequent return, simultaneous projectile contact, and a command arriving mid-batch all produce ordered complete consequences. A save captured after arrival one remains unchanged after arrivals two/three. Count draft opens/finishes versus internal intervals and measure command latency. The earlier four-interval trial failed to improve complete operations; this trial changes the hypothesis by combining retained participant preparation and scoped writes. If grouping alone worsens input latency or complete CPU, reduce/disable grouping through the existing host budget, retain independent improvements and record the measured result. Do not repeat the old fixed-four trial unchanged.

## A03 — Plain current inputs for repeated calculations

**Owners:** `draft.ts`, `spatial-state.ts`, `status-capabilities.ts`, `encounter-cache.ts`, kernel movement/timing consumers. Depends on exact current reads; shares representation with A14.

**Build:** extend the existing prepared physical/exposure data with plain scalar position, support, heading, body profile, speed and current capabilities required by each calculation. Traverse nested draft records once per changed participant/phase. Consumers calculate from these values rather than repeatedly calling draft-returning entity accessors. Only semantic writers request mutable records. Current-value readers include deferred earned meter changes.

A shallow read-only view can still contain child drafts: explicitly unwrap/extract the needed leaves. Cache by actual physical/rule revisions and relevant time, not just entity object identity. A write earlier in the same batch must refresh its entry before the next consumer. Do not use `original()` as a shortcut to current data, clone the world, or cache a draft after its lifetime. Share immutable definitions by reference.

**Acceptance:** move then check visibility in the same edit; start a movement restriction then attempt movement; change speed/body then recalculate arrival; read a deferred meter before a rule check. Every consumer observes the changed current value. CPU attribution should show reduced proxy access in actual movement/perception/timing paths. No claim of benefit from an unused prepared helper.

## A04 — Cheaper authoritative physical writes

**Owners:** existing movement/action owners in `kernel.ts`, `spatial-state.ts` spatial setter, `dependencies.ts`, `draft.ts`, `entity-collection.ts`. Depends on A03. Selected representation is specified in [owned physical writes](animal-execution.md#42-current-read-views-and-cheaper-physical-writes).

**Build:**

1. Refactor `moveAlongPath` into a pure local segment calculation and one owner-controlled commit. Preserve supporting surfaces, territory/forage distance accounting, occupied-body policy and all required intermediate consequence boundaries. Use a local route cursor instead of repeatedly shifting a proxied path.
2. Extend the existing spatial setter with a complete movement-step input containing final pose/support/heading and required observed segments. It replaces the final placement once and updates heading through the attached physical component; flight/fall owners retain their live progress references. Preserve exact placement revision increments where used by route/aim validity. Action/foraging owners replace their own changed cursor/accounting branches once. Do not make the spatial package mutate domain actions.
3. Emit existing semantic changes and a precise component change set from those owners. Conservatively include the traversed envelope/intermediate segments when endpoint-only invalidation could miss a relevant observer/body. Preserve current flight-release semantics. No-op movement must not invent motion evidence or revisions.
4. Finish/publication uses existing changed-entity lineage and freezes every newly owned branch before sharing it. Do not freeze a live branch then mutate it later; do not attach a published mutable object to the new draft. Reacquire current action/path references after replacement.
5. Audit `changedDraftEntityIds`, sensory draft audit, indexes, save encoding and public projections. Keep general patch-derived tracking for other writers. Remove only obsolete movement leaf-patch inspection after its consumers use explicit changes. Route all affected native/human movement through the shared writer; do not create an animal-only shortcut.

**Expected reduction:** fewer nested writes and patch objects per waypoint, no repeated mutation of large action paths, less read traversal after A03. The selected design keeps outer Immer ownership for complex edits; it does not claim to remove its entire measured share.

**Acceptance:** preserve an old published world and an in-flight background save while advancing the new world; old nested poses, paths and meters stay unchanged. Save/reload the new result and verify physical state, observations and continued action. Exercise a gate closing mid-route, body collision where required, support change, foraging distance cap and held-aim motion evidence. Changed-record output includes every affected entity and no lost in-batch write. Review path-tail sharing for accidental aliasing. A failure here blocks integration, not just benchmarking.

## A05 — Share current capability preparation

**Owners:** `status-capabilities.ts`, effect/contribution mutation/removal owners, `status-effects.ts`, kernel participant preparation. Depends on A01/A03. Reuse contribution-source indexes and installed capability definitions.

**Build:** share the existing dependency-valid capability mask and display preparation. Match effect/contribution state, definition identity and timed expiry; foreign source-sustained contributions remain current. Read cheap alive/incapacitated, participation and current-action facts through their existing owners at consumption, rather than duplicating them in eligibility sets. Keep the existing active/status participant rosters and action guards. A timed expiry remains represented in A01 even without a setter at that instant.

Cold preparation rebuilds; unchanged warm restrictions reuse the existing preparation. Effect/source changes or expiry refresh their actual dependencies. Preserve different restrictions on different capabilities without interpreting a status name such as sleeping. A hold-to-walk change must move within the same native advance even when passive meter rates are zero.

**Acceptance:** an installed sleep effect blocks movement and routine sight while hunger/recovery/damage continue; wake restores eligibility before movement or perception. A different authored machine-style charge restriction uses the same mechanism. Removing a foreign contribution source refreshes its affected subject. An already prepared route never overrides newly blocked locomotion. Observe correct eligibility through action execution, native escape and current sight, not only the cached answer.

## A06 — Dependency-specific bodily rules

**Owners:** `status-effects.ts`, `status-condition-references.ts`, `native-values.ts`, `temporal-boundaries.ts`. Depends on A01/A05; designed together with A15.

**Build:** extend existing compiled conditions with a dependency summary and next-check computation for supported time predicates. Group subject-attribute, action, effect/contribution, periodic/time-window, bound-source/target and definition dependencies. Maintain reverse lookup from changed fact to compiled groups. Reuse the condition evaluator; no second rule language or interpretation of generated executable code.

A threshold predicate runs on an explicit attribute write, rate/limit change or its next threshold. Action predicates run on action-stage changes. Time windows/periodic effects get their own deadlines. Cross-entity predicates subscribe to exact bindings. Shared transfers and unsupported/non-monotone time conditions use the existing conservative boundary. Compile once per admitted definition identity, not each entity or tick. Deactivation of an active effect must remain eligible even if its activation rule was pruned from the ordinary roster.

**Expected reduction:** movement does not repeatedly trigger hunger/energy condition matching for every body. Costs follow actual dependency changes plus genuinely due time predicates.

**Acceptance:** food crossing, an eating write before crossing, action-dependent recovery, a daily boundary, periodic damage and foreign-source deletion each wake exactly the required rules. Reuse does not freeze a false condition forever. Compare effects/events/health through current-value reads and save/reload. Record broad fallback frequency/reasons so unsupported common laws cannot conceal the old cost.

## A07 — One current danger assessment per matching input

**Owners:** `native-response-controller.ts`, `native-response-danger.ts`, `encounter-cache.ts` and kernel callers. Depends on A03/A05; compatible with A16.

**Build:** return a reusable assessment certificate from the existing personally perceived danger reconciliation. Key it by animal life, current game instant, observer pose/sense/capability revision, geometry identity, relevant candidate pose/evidence generations and response-policy identity. Reuse it when the noticing and escape-choice phases see the same inputs. Bound its lifetime to the current prepared continuation; a mutable alarm/episode reference is not a certificate.

Attack/sound evidence, observer/threat movement, sensed membership change, geometry edit, expiry/uncertainty boundary or policy/life change invalidates it. Reuse the current candidate grid and observed threat records. Shared geometry can be reused across observers, but the selected dangers and remembered points are observer-private. No fresh hidden threat coordinates enter a remembered danger.

**Acceptance:** noticing then choosing at the same instant reconciles once. Moving a threat or executing an attack before choosing forces refresh. After a threat goes behind a wall, its remembered old point remains old; the server's actual hidden movement is not used. Repeated attacks, speech and actual projectile danger reach the same controller. This packet changes preparation, not personality, escalation goals or chosen retaliation.

## A08 — Select only due or invalidated native choices

**Owners:** kernel animal selection, `native-response-controller.ts`, `native-foraging.ts`, existing authored wandering queue. Depends on A01/A07.

**Build:** retain current review/foraging/route-completion deadlines and a dirty native-actor set. Select the union of due entries and relevant changes: new personally perceived stimulus, arrival/blocked route, route result, capability/life/control change, resource depletion, hunger threshold and local pack/territorial event. Remove full animal copy-and-sort on every movement slice. Sort only the chosen set by the existing review-time/identity ordering, retaining defined tie handling.

At idle, record no pending review if installed rules have no timed reconsideration; preserve all actual need/resource/wander deadlines. Do not repeatedly write a future review merely to express that nothing happened. Cancellation/death/control transfer removes stale entries. Saved RNG is consumed only by ordinary executed choices; skipping a no-op must not remove an existing meaningful random event. If a supposed no-op currently draws randomness, preserve or explicitly reconcile that behavior before pruning it.

**Acceptance:** settled animals do no choice work until a meaningful wake; hungry animals still forage, prey respond to executed attacks, and finite pack/regroup/territorial work completes. A route wait does not cause rapid retry. Cold restore reconstructs due order and produces the same meaningful actions and random sequence at the same schedule.

## A09 — Track pending navigation directly

**Owners:** kernel pending-navigation queries, `native-response-navigation.ts`, navigation request/admission/cancellation owners and server navigation service. Can run alongside A06 after A01.

**Build:** maintain derived pending request membership at request creation/retirement instead of mapping/scanning all actors for each `navigationPending`/`navigationBlocked` query. Retain distinct world-blocking and entity-wait counts/sets and exact request-to-owner identity. A query for a supplied subset examines that subset's indexed requests. Rebuild once after load; do not save duplicate counts.

Every lifecycle path must update the same owner: accepted result, stale result, replacement request, cancellation, action completion, death, physical-life change, control transfer, entity removal and restore. Geometry invalidation retires or re-prepares requests through existing admission. A worker result alone never clears a newer request or resumes an old action. Entity-local wait invalidates previously retained movement so the animal actually stops while the rest of the world advances.

**Acceptance:** two animals wait while a third moves and a person works; one result becomes stale, one owner dies, one world-blocking request remains. Pending/blocking queries stay correct without full entity enumeration. Restore a supported pending request and prove current-generation admission. Separate worker query CPU from admission/waiting time in the final report.

## A10 — Reuse movement facts and physical candidate indexes

**Owners:** `spatial.ts`, `spatial-state.ts`, kernel `moveAlongPath`/movement-bound consumers and `packages/spatial` existing queries. Depends on A03/A04/A05.

**Build:** use one current speed/body/capability preparation per actor; update body-grid membership only for pose, dimensions, membership/support changes, not unrelated meter revisions. Retain indexed conservative candidates over a route segment/corridor and reuse existing static clearance proofs where geometry/body/support still match. Dynamic occupied-body checks use current body poses at the actual sequential movement step.

For one actor moving along several waypoints, reuse the other-body sweep reader; refresh when another relevant body moves before that actor's next step. Restrict invalidation using old/new swept bounds, including removals and teleports. Preserve surface identity, thin walls, action-specific occupied-body rules and territorial distance limits. Walking callers that historically allow body overlap do not acquire a new universal collision law. A route clearance result never replaces current movement eligibility.

**Acceptance:** a changing hunger value performs no body-grid reinsertion; a moved/resized/removed blocking body does. A gate closes across the remaining route, a wall is thin, and two actors move sequentially through a narrow passage under their existing policy. Static proof reuse must fail when support/geometry changes. Count actual candidate/index work through movement, not only cache-hit statistics.

## A11 — Make maintenance follow its own inputs

**Owners:** kernel recurring maintenance; `social-offers.ts`, `appraisals.ts`, `social-compacts.ts`, existing outings/reservation/remains/material/continuing-activity owners and incident indexes. Depends on A01 and semantic mutation notifications.

**Build:** connect the existing time owners to A01 and consume participant-local dirty IDs. Use this required audit table to cover every recurring caller; extend it only for an actual newly found caller:

| Family                           | Wake inputs                                                                         | Timed boundary                       |
| -------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| Exchange offers                  | Exact participants, item/permission changes, acceptance/cancel                      | Offer expiry                         |
| Appraisals/danger interpretation | New/corrected evidence, participant/life/definition changes                         | Existing reconsideration/expiry      |
| Compacts/cooperation/outings     | Party choice/withdrawal, participation, action/progress, relevant location/resource | Chosen finite end or existing review |
| Construction/work reservations   | Owner action, grant, contributing item/site, cancel/life                            | Reservation expiry/lease boundary    |
| Remains                          | Death/creation, harvest/use, removal, environment law                               | Existing decay/removal due time      |
| Wandering/foraging membership    | Current activity/capability, need/resource/stimulus/control                         | Existing chosen wait/review          |
| Continuing controls              | Action stage, chosen stop/retarget, relevant perception/permission                  | Chosen finish/wait boundary          |

Do not add separate timer queues per subsystem when its deadline is already available. A spatial change only wakes relations whose contract reads that location. A cooperative hunt ending does not cancel a released projectile; contributions already committed remain. A maintenance skip must not bypass current command admission or authority revocation.

**Acceptance:** unrelated deer motion does not reconsider an exchange; expiry still occurs at its deadline. Revoke an exact contribution grant, end cooperation during work, remove a reservation's object, and let remains expire while nobody moves. Actual effects, permissions and player views agree. Eliminate obsolete unconditional calls after the dirty/due path covers them.

## A12 — Bounded groups instead of trivial yields and allocations

**Owners:** native generator and its existing work budgets; service I/O yield loop. Depends on the shape of A01–A11 and integrates with A02.

**Build:** process cheap independent operations in bounded groups and yield on the existing work budget, expensive geometry preparation, complete event boundary or requested host interruption. Reuse the current 128-unit preparation bound where its units match; do not assume a rule evaluation costs the same as a geometry query. Use existing native work accounting for mixed expensive operations. The host checks wall time only at these opportunities.

Replace per-item temporary arrays/sets and repeated full sort/copy operations with stable prepared lists, scalar iteration or a bounded reused scratch collection owned by the current call. Clear scratch references at completion; no global unbounded object pool or retained old-world chain. Preserve canonical processing order and distinct consequences. A fewer-yields counter is diagnostic, not a success criterion.

**Acceptance:** commands and worker completions arriving during a dense update get an I/O opportunity and a coherent admission boundary. No giant loop defeats the 8 ms/32 ms host intent; report worst indivisible operation where unavoidable. Actual native CPU/allocation and command latency are measured after the batch. A12 must not increase the domain's simulation-time quantum or silently skip elapsed time.

## A13 — Reuse changed records through views and persistence

**Owners:** `apps/server/src/world-service.ts`, `view.ts` and affected view modules, `store.ts`, existing immutable-record/journal encoders, domain changed-record publication. Depends on A04 and exact lineage.

**Build:** carry the existing exact changed entity/component/history identities from domain publication through permitted view preparation and save encoding. Cache immutable record encodings by exact record identity within the owning lifetime; cache view sections by their full dependencies and audience/grant/control/timeline scope. Reuse geometric membership independently of unrelated inventory/need changes. Share compatible preparation for one committed read, and avoid constructing an unchanged replacement view for every internal native result.

Coalesce only replaceable motion at the existing public-delivery boundary. Preserve ordered speech/events and current admission. Permission, disclosure, life, control or timeline changes immediately invalidate relevant retained views; never reuse another observer's recognition/private knowledge because their geometry matches. After an asynchronous/cache-promise result, recheck the existing private-read guard at final disclosure; invalidation alone cannot stop an in-flight stale result. Public projection retains current disclosure/visibility checks independently of routine awareness timing. Cold hydration and missing lineage use existing full validation. Writes/deletes/new records must all reach saving, including history-only edits and journal application. Do not redo already delivered SQL query caches without a demonstrated caller gap.

**Acceptance:** repeated unchanged state reads reuse preparation, moving one actor changes its public pose, and a withdrawn grant removes private detail immediately. Simultaneous users retain distinct views. Capture a save then advance, append speech and delete an object; both saved revisions remain internally consistent and current restore matches the selected cut. Measure in-memory preparation/encoding separately from actual SQL/request spans. No save-frequency or durability relaxation is part of this packet.

## A14 — Compact batches of physical facts

**Owners:** existing spatial/exposure prepared frames, movement preparation from A03/A10; no independent ECS. Depends on A03/A05 and integrated with A04.

**Build:** retain a compact current entry for each relevant body, containing only physical/sensing/rate facts actually consumed. Traverse active subsets for similar arithmetic in one loop. Keep immutable definitions/routes referenced rather than copied. Update changed slots from the semantic owner; do not reconstruct all character data each small interval.

Start with ordinary plain entries plus stable identity lookup. Use typed numeric arrays only if the consumer can operate directly on them without reconstructing objects or serialization. When used, the owning frame maintains ID→slot, slot→ID/life/generation and a free list, while a separate canonical-order list governs effect/RNG application. Removal invalidates outstanding slot references; insertion reuses storage, never an entity identity. Frame storage is bounded by current participating entities and released with its world; it is not a history cache.

**Acceptance:** insert/remove/reinsert actors while a geometry answer is outstanding; stale slots cannot move or expose a new actor. Restore builds the frame cold from authority. A rate-only write updates only the rate facts, not all geometry. Small populations must not pay a whole-world copy to enter the batch. Record whether compact entries were sufficient or arrays were retained, and the production consumers using them.

## A15 — Anchored continuous meters

**Owners:** `native-values.ts`, `status-effects.ts` integration, `temporal-boundaries.ts`, current-format definition/save validators and all current-value consumers. Depends on A06; coordinate representation with A04/A14. Supersedes only the supported portion of NW17's segment replay.

**Build:**

1. At compiled-rate preparation, classify an independent continuous attribute law with fixed current limits/rate and known next meaningful boundary. Reuse existing net-flow rules; do not combine ordered clamps merely because arithmetic looks similar. Unsupported/shared/periodic/health cases retain their current execution.
2. Retain `AttributeState.value` as the single stored start value; its one `native-values.ts` linear binding stores start time, net rate, limits and contributing rule/episode identities. The next boundary is prepared from these facts. Compute current value as clamped start value plus elapsed time × rate. Several independent effects may contribute to that one attribute binding; effect elapsed-time/work accounting stays at its shared episode owner and is charged exactly once.
3. Before an explicit write, rate/limit/binding change, effect removal, death or transfer, settle the affected anchor to now, perform the ordinary mutation and start a new eligible anchor if appropriate. Changing time alone requires no anchor rewrite. A new rate never applies backward.
4. Update current-value readers used by conditions, action admission, context/UI, saved-state validation and work accounting together. Current-value cache keys include time/anchor identity; dirty predicate selection uses A06 threshold deadlines, not the absence of repeated raw writes.
5. Persist and validate the current anchor representation with the selected world/rule definitions and complete active-work references. On restore derive current values from saved game time before admission; no earned time is lost/replayed. Remove the segment-replay path for migrated eligible laws, retaining one explicit fallback for operations that still require ordered arithmetic. No old-save reader or second public meter API.

**Numerical policy:** accept last-bit differences caused by replacing repeated equivalent additions, with existing consumer tolerances. Never round health, permission amounts or resource transfers to hide discrepancies. Threshold event ordering and conservation remain acceptance criteria. Audit revision semantics: semantic writes/rate changes advance an invalidation generation; elapsed evaluation reads do not mutate it. If a consumer needs current value identity, include time/anchor generation rather than forcing every small arithmetic step to write.

**Eligibility is mechanical:** `changeRate` on an existing non-health attribute with constant finite admitted amount/limits and fully tracked conditions can qualify. `all`/`any` compose the existing predicate dependencies; `compare`, `hasAttribute`, installed actor fields and `statusActive` use their actual bound targets; `dailyWindow` supplies its next clock boundary. Reference aliases qualify only when their actual bound values make the supported independent calculation valid. `changeEvery` remains periodic, not a smeared continuous rate. A health target, shared finite transfer/drain, unknown dependency, mutually activating rate cascade or incompatible ordered clamp stays on its existing eager/conservative owner. Multiple constant contributions combine only according to already supported net-flow semantics. Do not infer eligibility from attribute/status names or weaken a definition to make it qualify.

**Acceptance:** positive/negative/zero rates, min/max clamp, threshold at an exact action boundary, rate change halfway, food gained before depletion, effect removal/readdition, simultaneous transfer and same-format save/load. Independent hunger/energy and an alternate authored charge meter use the same mechanism. Ordered damage and shared drain/replenishment retain their established results. Compare meaningful values/events, not incidental old subdivision counts. Report reduced replay/materialization and complete CPU, including save/read cost.

## A16 — Give routine sight its own cadence

**Owners:** selected-world time/sense definitions, kernel observation scheduling, `encounter-cache.ts`, saved native continuation/validators, relevant world docs. Depends on A01/A07/A08; qualify after engineering-only measurements.

**Build:** add an explicit installed policy selecting the current boundary-triggered behavior or cadence-only routine sight. Reuse `worlds/base/senses.ts`'s installed three-game-second duration for the Main candidate; the engine contains no number three. Persist per-observer `sensoryProgress.routineSight` under the [concrete data contract](animal-execution.md#concrete-data-contracts-for-implementation), not inside the invalidatable `world.nativeInterval`. Change `types.ts`, current entity validation and save consumers together. On cold initialization without progress, use the ordinary current initial observation and schedule from that instant. Wake/new-sense activation follows the same rule; unrelated mutations preserve the clock. No burst replay of all missed samples after a pause.

Split the observation call by purpose. Ordinary movement or another body's hunger threshold does not request an early routine visual sweep in cadence-only mode. Immediate personally perceived executed attacks/physical events, sound emission/hearing, current action admission and explicit watching use their existing current checks and feed the same evidence owner. Participation/disclosure removal is immediate bookkeeping, not delayed until the next sight pass. Geometry/capability changes invalidate proofs immediately; routine appearance may wait until the next routine sample, while action-time checks see the change now. Sharing a valid geometric result is allowed; sharing private conclusions is not.

**Tradeoff:** a body briefly visible entirely between samples may go unnoticed; constant ordinary movement cannot make the world check at arbitrary additional mechanical boundaries. At normal Main speed three game seconds are approximately 50 ms of target wall time; under overload they take longer. This is a fidelity choice, not a universal five-checks-per-second rule.

**Acceptance:** a brief pass between samples, appearance exactly at a sample, speech behind a wall, release/impact during the interval, current ranged admission after a door closes, explicit watching, sleep/wake and save/reload at a partial cadence. Retain exact hearing and committed consequences. Run a separate matched A16 comparison so its gain is not mixed with A01–A15 engineering changes.

## A17 — Exact quiet suspension and interaction relevance

**Owners:** native choice scheduling, existing sensory/physical spatial indexes, needs/foraging/wandering owners. Depends on A08/A11/A16 where selected. Reuses PS02 contracts without introducing coarse travel.

**Build:** retain no recurring choice for a settled animal whose installed behavior has no due reason. Keep its bodily deadlines, chosen finite work, actual movement, ambient routine and environmental effects in their own active sets. Wake relevant behavior from stimuli, current neighboring resource changes, actual arrival/contact, needs thresholds, participation/capability changes and the existing finite world-authored review. Interaction relevance comes from supported sense/action bounds and conservative spatial candidates, not camera position.

A stationary creature outside any relevant interaction envelope may retain its unchanged preparation without an arbitrary periodic scan. A moving creature still follows its real route; potential observers/hazards are discovered by the existing indexed movement/perception owners. No teleport-to-destination, imagined successful meal, fake eyewitness memory or dropped owed time. Coupled unknown interactions use detailed fallback.

**Acceptance:** an unseen hungry animal seeks actual food, offscreen injury/arrow effects continue, an approaching person can wake alarm through actual perception, and a changed nearby resource invalidates foraging. Move the camera without changing the world: outcomes are unchanged. Lower-frequency approximate behavior is explicitly not selected here because A08 already supplies exact quiet suspension and approximate travel would change encounter truth; its broader product design remains PS02, not an unimplemented hidden requirement in A17.

## A18 — Sample incidental awareness, keep consequential physics exact

**Owners:** existing sensory crossing bound and encounter/contact observation owners; selected-world fidelity configuration. Depends on A16; no changes to combat collision or physical support.

**Build:** classify each current future contact/reach/watch calculation by its consumer. Explicit watching, approaching/reach promises, action execution and physical hit/support/collision remain on their existing precise boundary. Add a selected-world policy for **incidental contact awareness only**: precise crossing (the existing default for installed contact senses) or current contact sampling at the routine observation cadence. Main itself installs no contact sense. In sampled mode, do not schedule future crossings solely to create incidental awareness; test current contact at the ordinary sample through the existing owner.

Do not erase an already admitted explicit watch or approach when incidental policy changes. Reconcile active-work definitions through the current definition owner. No endpoint-only substitute for swept collisions. Use the concrete contact policy/progress fields in the [shared timing contract](animal-execution.md#concrete-data-contracts-for-implementation). Contact-only/blind observers retain their own due entry under that owner; do not make touch depend on having vision. Coincident channel deadlines share physical preparation. Save/load preserves both the selected policy and its progress.

**Expected effect:** remove a small remaining future-crossing cost, previously ~1.19% overall for the larger mixed group, only to the extent incidental contact contributes. This cannot explain the majority of current slowdown.

**Acceptance/adoption:** compare the candidate's deliberately missed brief incidental crossing against preserved explicit watch, moving attack, thin-wall and support cases, including a contact-only observer and a vision restriction. Where the measured opening has affected contact observers, one bounded matched run assesses benefit after A16. Ordinary Main has none, so a zero-applicable-observer disposition replaces a meaningless Main timing comparison. Retain its current precise physics/watch/reach behavior; separately verify the supported contact-only alternative. A rejected candidate with >200 added logic lines and no/low effect is removed; retain no unused policy machinery solely to claim completion. Record the actual disposition and this changed-fidelity result separately.

## A19 — Reuse vision cones without changing the baseline

**Owners:** installed sense definitions, `spatial.ts` current sight/crossing checks, public range-guide projection and selected-world docs. Existing mechanism: omitted horizontal field of view means 360°, heading zero faces +Z, positive heading turns toward +X.

**Build:** audit the actual current and A16/A20 consumers for the same convention and early angular rejection. Reuse the installed definition; fix a demonstrated missed consumer universally. No duplicate cone filter and no default change to Main. A narrow-cone diagnostic is a supported alternate definition, not ordinary acceptance.

**Acceptance:** a target behind, on an edge and in front; observer turns without translating; elevated target; explicit current action sight; cold restore and public guide. Orientation changes invalidate affected pairs. A cone can reduce candidate work but adds turn-triggered updates, so improvement is workload-dependent. Record mechanism coverage as delivered/verified only with evidence; a future Main cone selection remains a gameplay choice outside this performance continuation.

## A20 — More substantial pure geometry batches

**Owners:** `apps/server/src/geometry-worker.ts` / `.mjs`, domain spatial-preparation generator contract, renderer-free `packages/spatial` segment queries. Reuse the current worker pool; depends on A03/A10/A14 and current geometry identity.

**Build:** extend the existing compact geometry request union with supported static walking-segment clearance (map identity, supported endpoints, body-profile identity/values). Prepare proposed independent segment queries together before authoritative movement. Workers answer static support/obstacle feasibility only; dynamic occupied bodies, permissions, current action/life and territory limits remain with their sequential domain owners. Apply results by canonical query ID after rechecking exact geometry/body/endpoints. Unsupported route transitions or stale answers use the current local query.

Use existing NW18 policy initially: fewer than 32 queries local, batches bounded at 128, up to two workers with no backlog, existing timeout/failure retirement and exact local fallback. Reuse worker geometry preparation; do not ship the map or private actor records per query. If the current pool is busy, execute locally rather than creating a second pool or awaiting an unrelated queue. Do not mark ready native movement as completed merely because a worker accepted a request.

**Acceptance:** exact local/worker answers for supported same-floor/transition/wall cases; stale geometry after gate edit; body change; cancelled action; worker failure; canonical application with reversed reply order. Existing sight work still progresses within the shared bound. Include preparation, copying, waiting, admission and main+worker CPU in the comparison. This experiment is selected despite uncertain individual payoff; if it adds >200 logic lines and low/no complete-operation benefit, remove the extra operation and record the existing exact local path as the measured disposition. Do not call the current ~0.14-second route search a reason to build another navigation engine.

## A21 — Conditional native/GPU population experiment

**Owner:** PF09 residual diagnosis and the existing pure spatial/prepared-numeric boundary. Depends on the final A01–A20 implementation and matched profile. This is a concrete decision procedure, not an obligation to add unused GPU code.

**Gate:** identify a uniform pure numerical batch that remains material in the 20/50-added case after accounting for data preparation and transfer. Compute its optimistic whole-operation ceiling from exclusive CPU samples. Require at least a plausible **10% reduction in occupied native/server CPU** if the batch became free; otherwise hardware acceleration cannot meaningfully address this task's remaining normal-speed gap. Ten percent is a provisional experiment-selection threshold, not a gameplay limit. Also require enough same-shape independent inputs to batch without adding latency, and a current consumer that would use the result. Record the actual residual numbers whether the gate passes or fails.

If it passes, first implement a bounded CPU-worker/native-vector prototype for **that named kernel only**, with the existing compact input and deterministic output contract. Compare transfer+dispatch+compute+admission to local execution at the observed sizes. Only if a GPU-compatible kernel remains and that comparison supports further benefit, try one optional GPU prototype in the same experiment. Do not add a production GPU dependency, capability matrix or alternate authoritative engine before this evidence. No new cloud capacity/paid service is needed for this design or required by the task.

GPU output may supply conservative candidates or pure numeric proposals, never permissions, private knowledge, RNG order or committed damage. Exact authoritative validation remains local; include its cost. If device precision cannot preserve required results, use the CPU path rather than weakening the rule. A CPU-only supported host must remain usable.

**Completion:** record (a) qualifying kernel and retained bounded implementation with full cost/correctness evidence, or (b) concrete residual shares/transfer estimate and why no kernel qualifies, or (c) rejected prototype evidence and removal. Bloat alone is not a rejection reason. Current evidence already makes wholesale GPU work unattractive because much cost is managed records, phase preparation and event handling, but that is a hypothesis to verify after the core changes, not a fabricated final profile.

## Delivery order and verification

### Connected batches

| Batch                                           | Packets and dependencies                                                        | Connected completion boundary                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Keep and cheaply update current work        | A01, A03–A05, A14, then A02 with enough A12 for bounded host yields             | Real animal movement, capability changes and publication/save use retained calculations and owned component writes.                    |
| 2 — Follow meaningful changes                   | A06–A13, finish A12, then A15                                                   | Bodily rules/values, threat decisions, navigation waits, social maintenance, public views and persistence share actual dirty/due work. |
| 3 — Explicit fidelity and pure batches          | A16–A20; engineering-only control first, then separate A16/A18 comparisons      | Selected routine sight, exact quiet suspension, cone coverage and supported worker batch are integrated with ordinary play.            |
| 4 — Final evidence and conditional acceleration | A21 assessment and any triggered bounded experiment; final matched measurements | All 21 dispositions recorded, no speculative optimization loop, required correctness and current performance reported.                 |

Batch 1 is roughly 1,000–2,000 changed logic lines; batch 2 roughly 1,200–2,500; batch 3 roughly 800–1,500. These are planning estimates excluding tests/deletions, not prescribed size targets. Performance outranks avoiding bloat. Implement uncertain useful candidates; remove them only when evidence shows low/no effect and meaningful complexity (the user's approximate 200-line cue), or a correctness/design premise is disproved. Do not keep a broken or unsupported branch to satisfy a checkbox.

Within each batch, run immediate checks when changing privacy/authority, snapshot/current-save integrity or committed effects. Other checks wait for the connected journey. Review the affected diff and fix concrete issues. Do not benchmark between helper edits or repeat valid evidence after unrelated changes. Commit under root cadence without turning each commit into another qualification/documentation checkpoint. Use one AI, the current branch and existing campaign; do not merge into main.

### Required consumer matrix

Use relevant existing native/server test files and bounded existing scenario tools. Add a focused case to an existing owner only when a concrete changed contract lacks coverage; do not create a growing parallel suite. The implementation must record each row's actual result or precise blocker.

| Case                              | Required outcome                                                                                   | Packets            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------ |
| Arrival amid unrelated work       | Other actors retain valid rates/deadlines; due actor's new work earns no previous time             | A01–A03, A06       |
| Simultaneous due events           | Existing phase/entity order, exact IDs and saved RNG; finite zero-time handling                    | A01, A08, A12      |
| Sleep/restriction and wake        | Movement/sight stop and resume; hunger/recovery/damage continue                                    | A05–A06, A15–A17   |
| Actual attack and repeated danger | Immediate required evidence and current choice; no preparation-only alarm or hidden tracking       | A07–A08, A16       |
| Entity-local route wait           | Waiting animal stops; unrelated world continues; cancellation/life/geometry rejects stale results  | A09–A10, A20       |
| Gate/support/body change          | Current movement/attack/building consequences agree; no stale spatial proof                        | A04, A10, A20      |
| Interrupted cooperation/work      | Withdrawal ends voluntary future work; committed contributions/projectiles persist                 | A11                |
| Same-format save/restore          | Values, cadence, work, identities and consequences continue; derived caches rebuild without RNG    | A01–A17            |
| Async save during later movement  | Captured world cannot change through aliasing; atomic current-format publication                   | A02, A04, A13, A15 |
| Two observers and revoked access  | Geometry reuse never merges private evidence; revocation reaches view/admission immediately        | A03, A07, A13, A16 |
| Partial cadence/contact           | Brief routine appearances follow declared policy; sound/watch/physical consequences remain correct | A16, A18–A19       |
| Worker failure/reordered replies  | Exact local fallback, stale rejection and canonical effect application; bounded retained data      | A20–A21            |

The native journey includes ordinary prey hunting and escape, a human working while hearing an unseen speaker and enduring repeated assault, and a gate changing during travel. Use retained compatible setups; do not run unchanged Ada baselines. Exact current permission/storage checks are not waived by the user's preference for fewer benchmarks. Existing broader first-playable integration gates remain with their trackers, not newly duplicated here.

### Matched performance protocol

Reuse `scripts/performance/profile-server.mjs`, `scripts/performance/scenario.ts` and [the animal campaign](../../verification/performance/2026-10/animal-reductions.md). Inspect the fixture's actual opening and generation before running; repair a genuinely stale shared fixture once and label that work as fixture repair. Do not develop a new benchmark tool.

After each substantial stabilized batch, measure **10, 20 and 50 added animals** (normally 30, 40 and 70 total; count the resulting world). Use ordinary Main, world seed 1086, placement seed 73, the existing actual-contact alarm setup, 30 seconds normal 1× and the same 60 commands at 500 ms spacing as the retained comparison. Use real PostgreSQL/HTTP/SSE for complete-server claims. Warm/cold navigation setup must be reported separately, not moved across the timed boundary to claim improvement. Reuse valid source-control comparisons; do not rerun an unchanged control merely to accumulate samples.

Obtain one CPU attribution run for the remaining bottleneck when needed, then measure achieved progress without optional CPU/counter instrumentation. A profiler reduces progress and excludes worker CPU unless measured separately. On a heavily contended host, report the limitation; one bounded quiet comparison is justified if available, not repeated attempts to find favorable numbers.

Report real duration, achieved game time, requested conversion and percentage, population/alive/work completion, command count/errors and p50/p95/max confirmation latency, CPU including workers, post-GC retained heap/RSS, host contention, draft/preparation counts, remaining exclusive categories, route-query time versus queue/admission, snapshot/view/save stages and incremental paid cost ($0 without provider work). Include player-visible command/render evidence only when actually observed; HTTP receipt timing alone does not prove browser rendering. Native, server and browser results are distinct.

The immediate goal is the **20-added case sustaining normal speed with prompt controls**, not merely completing escape eventually. Use existing [latency budgets](../../maintainers/performance.md#acceptance-budgets) and report misses rather than redefining them. A short 30-second run is diagnostic evidence, not the broader long-play acceptance.

At the final boundary only, include 100/200/500 added cases if 50 added keeps up with normal time within 2% measurement slack, has no command errors/unbounded waiting, completes the actual escape workload and meets the existing command-latency budget. This explicit 50-case gate prevents pointless larger overload runs; 2% is measurement slack, not authorization to discard owed time. If the 50 case fails, record that and skip larger cases. Five hundred is not a required capacity target.

After a failed run, name the measured bottleneck and proposed correction before another edit. A single supported correction and rerun can resolve a concrete defect; do not pursue perfect numbers or speculative micro-optimizations indefinitely. Close the batch when selected work, review fixes and required checks are done, reporting actual remaining limits. A software defect remains work; a missed performance target remains explicit evidence and a tracked gate, never a relabeled success.

### Documentation and completion checklist

Update PF09 once per coherent delivery, keeping A01–A21 independently visible. Link existing evidence rather than copying diagnostics into every design. Reconcile changed world behavior in its authored profile, generic contracts in their existing owners, and numeric bounds in [native-work limits](../../limits/native-work.md#nw19--animal-execution-bounds). Mark obsolete duplicate code removed, not retained as a compatibility path. Date feature-spec changes and the technical design used.

Design tasks may be marked complete now; runtime checkboxes require actual implemented consumers and checks. A19 may close with verified existing coverage; A21 may close with the specified measured no-hardware disposition. A18/A20 rejected trials require evidence and cleanup. No item may be marked complete merely because a similarly named mechanism exists. No design document proves human comprehension/enjoyment, independent character quality, full first-playable acceptance or readiness to merge the entire branch.

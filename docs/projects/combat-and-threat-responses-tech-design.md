# Combat and threat responses: technical design

| Status      | Current progress                                                                                                                               | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Physical combat, animal responses and busy-character choices are installed; Ada’s counterattacks and final combined qualification remain open. | 2026-10-22   |

**Implementation reference recorded:** `2026-10-22T22:45:16Z` (current branch implementation/review).

## Design baseline and integration

The active implementation baseline is `https://github.com/Macrofold/OpenLegend.git`, local `main` and freshly fetched `origin/main` at `19a0c303a89d3cb278db1cbbbe5b95e2e6e26fe1`, containing the reviewed `d261c94f50875edd88e8eb4a69cf8f4a413563cb`. Implementation uses `codex/implement-complete-first-playable`. The [feature specification](combat-and-threat-responses-feature-spec.md) defines the accepted scope; [repertoire scope](combat-and-threat-responses-repertoire-review.md) relates it to broader possibilities. Implementation crosses domain mechanics, world policy, server cognition and player controls, so delivery requires staged integration and separate runtime qualification.

Implementation must measure actual calls, receipts, latency and costs. A faster model alone does not establish faster complete reactions.

## Existing owners and change boundaries

| Responsibility                                | Existing owner or seam                                                         | Design requirement                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Exact attack admission and physical execution | Domain strike, ranged, contact-defense, body-effect and action owners          | Preserve one effect owner, exact life/tool bindings, costs and recovery.                        |
| World harm and participation choices          | Bundled body/participation policies and combat permission adapter              | Allow human PvP and physical collateral under authored world rules.                             |
| Animal behavior                               | Bundled animal policy, native action/movement and navigation owners            | One controller per animal; no model work; destination-based multi-danger escape.                |
| Actor evidence                                | Perception, event observation, retained experience and response-context owners | Distinguish event-time observations from current visibility and hidden truth.                   |
| Appraisal and personal state                  | Existing appraisal definitions, source-linked records and cognition context    | Interpret threat with actor-specific context without creating a second feeling store.           |
| Relevant choices and decisions                | Action catalogue/context, Decision API selection and ai-director               | Complete feasible offers while busy, two explicit semantic stages, stale-result handling.       |
| Reconsideration                               | Existing attention, dependency invalidation and decision scheduling            | Wake for meaningful observed transitions and chosen-purpose boundaries.                         |
| Command-click                                 | Existing installed context-action ranking and exact preferred-choice guard     | Extend current aggression facts with per-opponent continuity; preserve exact preview/admission. |
| Persistence                                   | Current-format save/load and identity owners                                   | Save authoritative ongoing consequences; rebuild derived indexes; no legacy adapters.           |

The engine does not infer hostility from selection, a species name, an NPC name or prose. It transports typed evidence and executes admitted commands. World-specific native algorithms are legitimate policy when installed through a narrow supported seam; hiding them in generic callers is not.

Shared choice preparation and prospective work transitions are owned by [action capabilities](../action-capabilities.md#prepared-choices-and-prospective-work-transitions); supported deliberation strategies and their request lifetime are owned by [agency runtime](../../archive/07-technical-architecture/agent-agency-runtime.md#25-shared-deliberation-and-prepared-choices). [Speech composition](../narration-and-conversations.md#admission-ordering-and-memory) and [caller authority](../engine-and-world-boundaries.md#shared-callers-distinct-authority) consume those owners. This project delivers the threat strategy and its world content through that shared architecture. It does not own a general-purpose replacement framework. Existing task, conversation and direct-player paths must preserve their supported behavior and cost when these shared helpers change.

## Implementation modules

Use the stable CTR identifiers in the [tracker](../maintainers/combat-and-threat-responses.md). Keep dependent work sequential at its semantic owner; independent profile/catalogue drafting may proceed in parallel.

1. **CTR01:** reconcile attack permission and released-projectile contact consequences.
2. **CTR02:** add exact, observer-scoped encounter evidence and derived per-opponent projections.
3. **CTR03–CTR04:** implement the native animal-controller seam and bundled escape/speed profile.
4. **CTR05:** repair complete cognition choice preparation with explicit work transition semantics.
5. **CTR06–CTR07:** implement generalized appraisals and the two-stage prepared response repertoire.
6. **CTR08:** connect evidence changes and chosen-purpose progress to bounded reconsideration.
7. **CTR09:** extend the existing contextual action preference through the same authoritative catalogue.
8. **CTR10:** qualify the integrated player and independent-character journeys, resolve failures, and reconcile delivered truth.

CTR identifiers name delivery responsibilities, not new packages, services or one class per checklist item. Extend the existing semantic owners below; one selected world policy may compose several of them. Each delivered path must be usable end to end. The [delivery sequence](../maintainers/combat-and-threat-responses.md#delivery-sequence) places the existing Ada/latency and hunt-to-meal qualification early, before breadth work can conceal an unusable core loop. Final integrated qualification still covers every required module.

## Design-register and source mapping

| Selected register scope                                                                                                                                             | Technical modules   | Source discussion and remaining scope                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ND11](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity): direct PvP, physical projectile contact and immediate threat response | CTR01–CTR08, CTR10  | [COMBAT ND11](../../archive/02-research/game-inspiration/synthesis/combat-and-encounters.md#nd11--responsive-conflict-in-the-selected-base-world). Designed here; broader indirect hazards, rescue/return and NPC ghost adoption/delivery remain separate. |
| [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization): stable opponent-specific Command-click               | CTR02, CTR09, CTR10 | [COMBAT ND13](../../archive/02-research/game-inspiration/synthesis/combat-and-encounters.md#nd13--predictable-opponent-specific-quick-actions). Designed here; general ranking/counting, remapping and other input/device extensions remain separate.      |
| Supporting immediate character/animal behavior                                                                                                                      | CTR03–CTR08, CTR10  | Reuse DG02/CE and existing native actors. This does not complete ND06 ecology/generations or ND04/DG23 long-term character and relationship change.                                                                                                        |

The [feature specification](combat-and-threat-responses-feature-spec.md) owns player journeys and why these choices serve the game. The [repertoire scope](combat-and-threat-responses-repertoire-review.md) identifies the selected contributions and future possibilities. Current physical implementation remains the baseline until each selected module actually ships.

## Performance questions answered before implementation

Cost grows with nearby living density, active danger relations, route candidates, prepared action/tool combinations, retained evidence and concurrent model work. Share actor-independent tool feasibility and observer-permitted snapshots within the existing read scope. Spatial/native work uses meaningful-change triggers and existing regional/navigation preparation rather than all-animal/all-human scans each tick. Model work is reserved and scheduled through the existing owner.

Invalidate reuse for the actual entity life, control or timeline, observed evidence, physical/navigation dependencies, chosen objective, relevant authored definitions and elapsed deadlines. A whole-world revision is not a substitute for identifying those dependencies. Budget exhaustion means incomplete work, not safety, lack of witnesses or unreachable terrain.

Measure complete caller paths, including cold preparation, dense danger, obstacle invalidation, provider-stage delay and persisted continuation. Retain deterministic native ordering and saved random choices. Report planned targets separately from measured results.

### Active worker and density qualification

Use the existing disposable PostgreSQL server profiler for ordinary cold/warm
progress and command waits, with provider dispatch disabled. The exact Main
initializer stays unchanged; an expanded-map preliminary run is separate evidence.
No baseline speedup follows from different geometry or instrumentation settings.
The ordinary current-source 8× request falls behind and remains failed acceptance.

Extend the single evolving native scenario, approximately 80–150 diagnostic logic
lines, to drive an actual perceived punch preparation beside an admitted low
barrier. Require a complete pending refuge batch, let the persistent navigation
worker answer it, and consume the result through the service's existing native
advance. Confirm supported physical movement, RNG ownership, exact pending-profile
and geometry invalidation, then cold reconstruction through PostgreSQL. This
checks the real worker separately from the synchronous backend fixture. Preparation
cost grows with complete route candidates and local dangers; static geometry is
shared by the existing worker, answers retire with proposals/map/timeline, and no
new gameplay authority or movement owner is added. Do not substitute a manually
supplied route for an observed worker result. The broader 100/500-animal matrix
remains required after this connected proof.

### Native movement admission cost follow-through

The calm +100/+500 server runs fail progress and expose a long unyielding native
calculation. The +100 native CPU isolation identifies repeated state copies in
nested walk preview and selection. Trial approximately 5–15 logic lines in the
existing kernel: allow a validated native movement preview to return after its
complete read-only operation/route/controller checks, and avoid a disposable
selection draft when exactly one route is available and no random draw occurs.
Keep ordinary final command admission, costs, exact path/profile/life checks,
weighted choice, all alternatives, work allowance and rollback semantics.
Other nested action previews retain their existing execution path. No world rule,
clock, speed, perception, population or candidate bound changes.

Cost grows with admitted animal walks times copied live state; preview shares the
same exact prepared move and route in its current request. No retained cache or
new invalidation scheme is introduced. First record three unsampled finite
400-game-second +100 runs and complete world/event digests; compare the identical
runs after the trial. Also repeat the sampled diagnosis and real server density
caller before retaining an alleged improvement. Refused/native controller and
route cases must still refuse without mutation or random draws. Reuse connected
worker/profile/restore coverage and recheck affected native behavior. A smaller
finite cost does not close speed, dense alarm or sustained server acceptance.

The first two-copy reduction preserves exact finite outcomes and improves that
finite native mean by 19.7% elapsed / 17.7% CPU, but server results are mixed and the
+500 burst still stalls. A separate 200-game-second +500 CPU isolation completes
in 25.323 seconds and locates 7.388 seconds sampled self time in immutable-state
finalization, including finishing each animal's growing command/movement result.

Trial a further 10–25 logic lines at those same owners: after successful private
native movement publication, freeze that completed snapshot only when the native
call began with an immutable input. Existing mutable builders retain their current
ownership; never freeze the live outer draft or a rejected original. This lets the
next animal's ordinary finalizer skip already completed immutable branches, using
the existing freezer rather than an alternate command executor or writable cache.
Add ordinary generator yields between animal decisions and wander starts; they
permit I/O scheduling but are not coherent world-publication boundaries and cannot
change simulation time or decision order. Recheck frozen and mutable input ownership,
full native digests, actual worker/SQL continuation and the same whole-server
caller. Do not present a smaller unyielding segment as completed clock progress.

### Active alarm-density workload

Extend the existing generated-scene profiler, approximately 70–120 diagnostic logic
lines, with an explicit 0–100 percent alarmed fraction of its added deer cohort.
Keep the ordinary Main content as background and report total native population
separately from cohort size. Construct alarms through actual admitted unarmed
preparations and cancellations, recording each animal's real local observation
before moving the fixture performer to the next supported clear setup stance.
Restore the performer to its initial position afterward. These deliberate setup
placements are a controlled diagnostic, not ordinary player travel or human
acceptance. Reject an unavailable stance/preparation rather than silently dropping
animals or creating synthetic danger records. No source/model call or game law is
added. Use the existing animal controller and native perception owner throughout.

Setup grows with admitted cohort size and exact body-clearance/perception reads;
all event/history effects are real and retained, so alarm percentages are complete
workloads, not isolated controller-cost comparisons. Existing immutable geometry
and spatial candidates serve those checks. The benchmark shares its existing
worker, persistence and command paths; no new recurring scan or cache is introduced.
Record initial/final actual alarm counts because a finite danger can legitimately
end during measurement. Compare only identical configuration/source when claiming
an implementation improvement, and retain failed progress/requests. Extend the existing clock-free optional tallies (approximately 10–25 logic lines)
for random-number evaluations, ground-route preparation, retained-route checks,
stale proposals and retired worker answers. These count actual work, including a
tentative random evaluation if its surrounding transaction later refuses; saved
world randomness remains authoritative. Disabled observation performs no report
preparation or retention. Prove identical finite world results with recording on
and off before using these counters. Complete 10%/all-alarm, two-danger-group,
geometry/cold and optional counter coverage remains open until actually run.

### Dense alarm sight-preparation follow-through

The measured +100 all-alarm run completes only 0.100/0.512 game seconds in its
1×/8× phases, despite no final navigation backlog. Its latter phase evaluates
105,052 crossing pairs, retaining about 6,675. Source review finds native alarm
observers predicting visibility changes for neutral animals and objects that the
installed danger controller never consumes. Ordinary character sight and physical
contact remain separate consumers and must retain all their existing candidates.

The fixed one-game-second native/backend +100 all-alarm input/result and CPU
profile are retained. This fixture drains native calls with a one-interval hint;
it does not emulate the server's timed publication requests. The implementation
uses approximately 60–120 logic lines: let the existing native
danger owner prepare a request-scoped source predicate from the installed profile
and exact retained body/life records. The movement predictor uses it only for
memoryless native alarm sight. Keep every possible dangerous body and every exact
old body/corpse that can resolve retained evidence; missing preparation stays
conservative. Do not prune ordinary character sight, contact, selected-person
reach or danger-distance/uncertainty crossings. Retired cached native-sight pairs
must use the same current predicate. No global cache, fixed source cutoff, new
world law or independent decision system is introduced.

Cost grows with local physical candidates plus complete retained danger records;
prepare profile/retained-source membership once per observer/query, not per ray.
Invalidate with the current query's life, profile, body/action/category, danger
records and geometry through the existing owners. Check actual known/unknown
sources, ordinary neutral animals becoming naturally aggressive, source death and
exact old-life remains, controller/memory changes, current-format continuation,
whole/split observable outcomes and the full server caller. Changed optional
sampling subdivisions are not permission to change native effects, RNG order,
privacy or meaningful evidence. Keep failures and diagnose any outcome difference.

### Repeated encounter-deadline preparation

The full-server +100-all-alarm CPU capture finds repeated encounter scheduling
and content hashing, rather than nearby-body indexing, as the largest identified
JavaScript cost. Its 28.428-second process capture includes startup and idle time;
4.785 seconds fall under deadline calculation and 3.013 seconds under response
profile lookup, with overlap. Source inspection confirms that every retained
opponent re-hashes the same mutable authored constant, even without a pending
observation band, and own-offense reconciliation recalculates unchanged deadlines.

Change approximately 20–50 logic lines at the authored response definition and
existing encounter owner: deeply freeze the static trusted definition so the
existing exact-pin cache can reuse it; resolve a stabilization duration only when
a pending observation actually needs it; reschedule owned offense only when its
retained deadline changes. Authoring continues by installing supported selections
or copied data, not mutating the linked trusted template. Do not change any pin,
tuning, deadline, observed cause or save field. No new cache or scheduler is needed.

Compare the fixed native input/result exactly, including whole/split and SQL
continuation, actual own-offense expiry/return and existing encounter cases. Then
repeat the complete running-server caller with the same declared workload. Keep
CPU-profiled diagnosis separate from unsampled speed qualification and retain
failed density measurements. Broaden only for a demonstrated changed assumption.

### Active implementation sequence for the connected human response

The delivered work-transition and scoped-feeling foundations precede the following
connected changes. The ordinary profile is now installed with its connected native and
decision consumers; qualify the complete selected repertoire and shared behavior.

1. Extend the existing chosen-activity control with optional observation/counting
   requirements and an exact selected distance boundary. Preserve its original
   deadline, cancellation, actual-cost and completing-child rules. Reuse native
   movement and boundary prediction, including complete route segments; no second
   mover or pursuit loop is introduced. Preserve exact physical-life references
   through prepared attack/follow selection and final native admission.
2. Connect the catalogue's authored data through the cognition policy and a
   selected-world compiler at the existing world-composition seam. Purpose/role,
   source, exact method, work handling and finite terms remain one offered binding;
   admitted plans/activities and action records retain that selected meaning.
3. Extend decision preparation with an explicitly complete-required set before any
   provider callback. Preserve its members or refuse preparation; optional ordinary
   suggestions keep their existing policy. Select this strategy before ordinary
   routing and action retrieval.
4. Use the existing accounted job for the required relevance/appraisal call,
   source-bound native appraisal publication and independent Noul action choice.
   Revalidate post-publication from accepted feeling revisions, preserve newer
   external evidence, and suppress only this pipeline's own derived receipts.
   No routing/generation gate or automatic paid fallback is added.
5. Enable the profile, target-stacked interpreted fear/anger and the selected new
   Ada dispositions together with removal of both automatic fear producers. Run
   the twelve ordinary baselines and complete reaction timings at this first
   connected minimum, before expanding animal/species breadth. Retain failures.
6. Finish bounded refresh, meaningful subscriptions and two immediate job slots
   through the existing scheduling/execution owners, then continue the remaining
   combat controls, animal breadth and qualification.

The remaining repertoire work uses the existing native command and agency owners.
Complete threat preparation requests all permitted physical follow targets rather
than the compact ordinary suggestions. Ranged one-shot children declare safe
deadline cancellation in their installed world host: unreleased ammunition remains
unspent, and a released projectile continues through its independent native owner.
Explicit return to paused work needs an exact paused-plan ID/revision operation,
not the ordinary Stop operation, which deliberately discards paused work. Its
read-only preflight examines the remaining frontier and original control before
ending the intervention; refusal preserves both. Admission reuses the existing
resumption owner and personal result records. This is approximately 200–300 logic
lines across agency/activity inspection, native admission and the public command
boundary. Verify actual interruption/resumption, lost target or material,
expired original limits and a stale paused-plan selection without discarding work.
Review also requires retaining original actor-reference associations for activity
steps not yet expanded when an intervention begins. Extend the existing saved
activity binding/validation owner and shared dispatch/resumption checks; a later
sighting cannot silently rebind an unfamiliar person. Do not add another history
store or reconstruct forgotten identity from world truth. This adds approximately
100–150 logic lines and needs native loss/reacquisition and cold-storage checks.
Last-seen preparation distinguishes a remembered point from a currently
identifiable body. Record the personally observed support and label with the
existing encounter point. A historical-point purpose binds that point and its
actual source, with no live actor role or targeting grant. Its instance identity
includes the historical observation, and continuation inherits the matching
original pursuit's time/distance bounds. Check unseen relocation, loss of an
unfamiliar-person association and cold restoration through actual native movement.

The CTR08 movement slice extends the existing follow owner with explicitly finite
arrival: a selected distance, original absolute deadline, actual sight/identity
and an arrival result distinct from reaching the time limit. Ordinary relational
following retains its existing minimum separation and continuing behavior; finite
proximity movement may close to a real available strike's reach, with native body
clearance still controlling its route. The threat compiler selects that physical
distance from existing methods and supplies no automatic attack. This is roughly
150–250 logic lines across follow preparation, saved action validation, shared
native composition and public command binding. Actual approach/arrival, source
movement, cancellation, original deadline, lost sight/life and cold restoration
have focused native coverage. Complete pursuit and reconsideration qualification
remain open.

Fixed-point pursuit uses an optional selected proximity stop on the existing
finite control, bound to one of its exact visible participants. The compiler
supplies the currently offered method's distance; remembered-place searches keep
their separate point-only meaning. Native continuation checks the same reach and
line-of-effect owner. The existing piecewise motion-crossing owner now includes
that interaction-anchor sphere/ray predicate so two moving people cannot pass
through the stopping interval between samples. It reuses body/geometry/track
certificates and bounded active participants, without a second trajectory cache.
This is approximately 150–250 logic lines across finite-control validation,
world-owned compilation, movement boundaries and descriptions. Actual static and
crossing approaches, an intervening low wall, split clocks, original limits and
PostgreSQL restoration have native coverage. Current-format validation refuses an
unbound stopping participant. The same finite participant checks retain their
sight/life boundaries. A stop offers a new choice; it never attacks or retargets
automatically. Broader source/capability races and complete subscriptions remain
required.

Meaningful observation subscriptions then extend the existing private encounter
index, temporal due calculation, world-selected response adapter and ordinary
intake. Capture passive selected participants separately from prerequisites that
must remain true for physical execution. Persist stable/pending visibility,
preparation, movement and actual-method reach bands with original game-time
deadlines and exact native sources. Emit one actor-private native change receipt
per stable transition; immediate actual harm/preparation remains independent.
Never infer ceased preparation from lost sight, or erase historical evidence
because an unseen body changed elsewhere. This is approximately 500–800 logic
lines; no second mover, decision queue or history store is planned. Native checks
must cover band jitter/reversal, the 0.75 m/12-game-second exit rule, brief and real
sight loss, changed protected people, source/body loss, old-source forgetting,
clock splits and PostgreSQL restart without duplicate notices. Measure work on
the actually affected observers and route/geometry owner; do not scan all history
or create a paid call on each movement update. Full dynamic crossing and shared
combat qualification remain required before closing CTR08.

Before those subscriptions, the current actor/tool preparation is extracted from
the server catalogue into one domain read query for catalogue and observation
preparation. It preserves native equipment/reservation/body checks and supplied
permitted inventory; group ammunition by admitted kind once, without crossing
every lot with every perceived target during actor preparation. All compatible
available lots are retained, expanded only for actual offered targets, with each
exact combination receiving a structured identity. Native admission remains the
authority. This is roughly 100–150 logic lines plus caller reconciliation. Real
catalogue/native cases cover distinct lots and admitted damage profiles, actual
aiming holds, a pure replacement view and the unchanged ordinary complete request.
Broader inventory scaling remains part of complete qualification.

The ordinary-route hazard specimen also exposed cause selection: a later incidental
sighting could headline an unread actual blow. Reuse the existing actor-scoped
urgent-evidence read and actual selected physical result to choose their newest
personal cause before incidental newer records. Preserve the remaining
coalesced records and their original evidence cut. This is a small scheduling repair,
not a new urgency rule or queue. The ordinary-route specimen explicitly omits the
optional threat strategy; both routes require their own qualification.

The observation slice distinguishes hard execution participants from passively
watched selected people in the same finite-control owner. Preflight proves both
at selection; continued execution stops only for its hard requirements. Native
encounter records retain profile-pinned stable/pending sight, observed preparation,
movement and actual supported-method reach bands. Temporal due work and the
existing piecewise crossing owner establish their real boundaries; private native
notices enter ordinary intake. Include current and paused finite commitments
without rebuilding identity from hidden bodies. Recovery observation takes its
original deadline from the existing body/action owner, survives Stop and emits
once only for a still-relevant selected response. The actor pass that prepares
sensory crossings also bounds newly pending observation deadlines inside retained
physical forecasts; it does not rebuild unrelated mechanics to service a notice.
Combined with shared actor/tool
preparation this is approximately 900–1,200 logic lines. Cost grows with active
observers' own admitted means and relevant pairs/ranges, not retained history or
every world resident. Share actor preparation once per observation pass and
retain only certified geometric runs; equipment/custody/holds, body, geometry,
perception, profile or selected work changes invalidate affected preparation.
Measure actual native/service preparation, changed-pair visits and full reaction
paths, including jitter, missing evidence, restart, density and provider waits.

Own spoken output is retained as personal speech evidence and a native attributed
speech result. Neither is a fresh autonomous cause for its speaker. The shared
intake filter and supplied physical-result predicate distinguish that output from
another person's heard reply and actual physical completion. This small repair
uses existing native memory attribution, with no additional history or scheduling
owner. Actual chosen speech through ordinary intake and a real heard reply have
controlled native coverage. An unrelated observed-interest subscription change is
considered independently before isolating own output. Historical encounter
reconciliation retains the last personally observed point when an unseen source
vanishes or changes body life; current exposure, not hidden world truth, resolves
that association. Focused native counterfactuals pass; broader subscriptions and
independent choice remain unfinished.

Steps 1–4 have connected native implementations and partial controlled service
qualification. Complete requests retain their full sets; supplied callbacks reach
an admitted exact strike and its next ordinary native step. The ordinary world now selects the connected profile, interpreted fear/anger and Ada’s general assertiveness together, with both automatic fear producers removed. Both fixed twelve-case live samples failed 0/12 counterattacks and remain
retained. Uniform explicit action questions now fit the complete 475-choice native
case without changing the 220,000-character limit. Actor/job-owned immediate
scheduling and shared two-execution capacity have controlled coverage for ordinary
plus urgent, two urgent actors and exact cancellation. The one saved refresh now has controlled actual repeated-hit coverage through both
refreshed stages, including preserved native work and a same-boundary forgetting
contrast. Exact fear/anger guards exclude unrelated bodily discomfort. Independent
interpretation/choice, remaining repertoire, meaningful subscriptions, remaining
source/stale races and complete concurrency qualification remain unfinished.

The native-control change is approximately 150–300 logic lines; the catalogue
and decision integration is expected to affect another 1,000–2,000 logic lines.
Relevant recurring growth is active controlled work × remaining route segments,
plus actual perceived threat pairs × supported methods. Reuse actor/tool and
source preparation only within an unchanged read; invalidate for path/body,
geometry, life/control, source/policy revision and original time boundaries.
Measure actual admission, simulation progress, collision/stop outcomes and
PostgreSQL continuation, then whole reaction preparation/queue/provider/commit/
render latency. Existing chosen camp-watch checks remain regression obligations.

## Physical attack and contact contract — CTR01

### Permission before commitment

Change the installed base-world combat participation definition, not a client allowlist: human-issued targets include vulnerable player, NPC and native bodies. Preserve performer/issuer distinction, source availability, exact target life, currently permitted target observation, body capability, tool/ammunition and ordinary work/recovery checks. A high-level voluntary help request still grants no exact attack command; direct orders retain human provenance and final-blow review. Do not change the territorial stag's target-selection rule merely because player-targeted commands are now allowed.

All current paths consume one permission answer: typed commands, interpreted action binding, menus, equipped-item and Command shortcuts, grounded NPC alternatives, temporary activity control, plans, held aim and automatic shots. Current policy data is in the bundled body/participation profiles; `combat-consent.ts` remains a shared admission consumer. A different installed combat profile that denies human PvP must still work through every consumer, without a bundled-world fallback.

Melee and unreleased ranged actions retain exact intended-life binding. Revalidate only the dependencies that can actually have changed at approach, wind-up and release. Admission of a potential future action does not commit its material cost. In particular, showing an attack, choosing a purpose, preparing a prospective interruption and opening a lethal review remain nonphysical operations.

### Released contact data and execution

Extend the existing saved projectile record rather than create another flight or event log. The exact technical field names can reuse current projectile fields; the following distinctions are mandatory and are not interchangeable:

| Binding                | Required meaning                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Committed source       | Source entity/person reference, source physical life, issuing-controller provenance, admitted action/receipt and world/timeline of release. It remains valid attribution after departure or death and never gives a dead source perception. |
| Intended target        | Selected entity/life and last permitted aim point at release. This is historical intention, not an impact-damage allowlist or a live tracking reference.                                                                                    |
| Frozen physical effect | Launch point, direction, launch time, speed, remaining range, injury inputs, exact tool/ammunition and installed profile pins already used by release.                                                                                      |
| Contact policy         | Exact admitted world contact-response binding. The bundled binding applies captured injury to actual vulnerable bodily contact; another supported binding can differ.                                                                       |
| Launch-overlap state   | Whether the projectile has actually exited the launch source's physical capsule. Limit the initial self-collision exception to that exit; do not exclude the source ID for all flight.                                                      |
| Actual contact         | Exact collider/material or physical body/life found by the current swept contact query, contact fraction/time/position and incoming direction. Resolve this before applying damage.                                                         |
| Outcome                | Original intention and actual contact remain separate; record material interception, bodily impact/prevention, miss/range expiry and true committed quantities through the existing occurrence/action-experience owners.                    |

Keep the existing motion/collision interval and canonical tie ordering. For each projectile, find the earliest supported physical contact; at most one body/material receives the first-family impact. Do not stop a shot at an old target point when no collider is there. Retain point-projectile and straight-path limitations as authored/current supported-family scope.

Remove the impact guard that requires the contacted body's ID/life to equal the original target. Remove post-release target-specific lethal-review rejection under the selected base-world policy. Do not replace either with a controller/friendship/practice special case. Invoke the common contact-defense/body-effect owner using the actual body and incoming direction; apply susceptibility, prevention, injury, scars, clamping, interruption and death once. Full shield prevention is a real physical result. A practice shot uses the same contact rule and only earns practice-target evidence when the actual target was hit.

Use captured source attribution when its current entity is gone; do not require an alive source merely to create the committed contact effect. A narrow effect-context parameter may replace an unnecessarily live-source parameter in the contact owner, with no second damage implementation. Source damage multipliers already captured at release are not recomputed from a successor. The contacted body's current susceptibility/guard still applies.

An intended target's successor is not automatically attacked by an unreleased old command. After release, any actual vulnerable body intersecting the trajectory can receive damage, including such a successor. This is physical collision under an existing committed law, not permission to issue a new attack against a different life. Fully inactive participants remain absent from projectile-body capture; exposed fading participants remain vulnerable until their existing exact deadline. Never leave an inactive body as an indestructible invisible shield.

Keep current material-response owners: scenery can resist and stop, a practice target records contact, and supported damageable material commits its defined effect. New structural-destruction physics is outside CTR01. The [world contact contract](../worlds/base/ranged-counterplay.md#selected-contact-consequences) states this limit explicitly; a future material family extends contact response without restoring target-only immunity.

### Observation and result handling

Create the authoritative actual-contact occurrence before any recorder copies it. Include actual effect location, contact role and exact injury/prevention quantities. Preserve original shot intention separately in the release/action occurrence. Do not describe an intercepted shot as a hit on its unharmed intended target; its terminal result can distinguish observed collateral, observed miss and unknown outcome.

The victim receives their personally experienced contact with only permitted source attribution. Other observers and the shooter receive only their own evidence, not world-truth damage telemetry. An unknown shooter can produce anonymous urgent danger. The hit animal and territorial withdrawal owner receive the same committed harm/attempt event, even when the shot was intended for someone else. A valid shield interception can be a credible threat without health loss. Expiry or removal of a historical source must not synthesize a name, death observation or current location. A new impact can create a local danger-region cause; it cannot refresh an unseen shooter's last-observed point or time. Near-passage alarm uses only the actually traveled segment before stopping contact, with saved once-per-projectile/animal-life deduplication in the projectile/observation owner.

No second material debit, practice credit, contact injury or appraisal occurs on request replay, flight restoration or observation projection. Native effects already committed cannot be undone by late model cancellation.

## Observer-scoped encounter evidence — CTR02

### One bounded-lived meaning

Use a narrow native encounter-evidence owner, installed only when the world selects this supported behavior. It records short-lived personally known attack facts and own exact offensive conduct. It is not another memory database, an actor's emotional state or a world-wide combat relation. Existing occurrence/observation records remain causal evidence; existing plans remain chosen commitments.

The initial record is keyed by the structured tuple of observer physical life and other physical life within the world/timeline. Never concatenate IDs with an ambiguous delimiter or use display names. A person can have several directed records simultaneously. Anonymous harm has an observation-bound unknown-source entry and cannot be joined to a guessed nearby body.

| Saved logical field                                | Contract                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observer identity/life and episode identity        | Exact owner of this personal record. A new life/control timeline cannot inherit executable bindings by matching a name.                                                                                                                                                                                                |
| Other identity/life, if personally identified      | Publicly known physical reference for this record. Missing identity stays unknown. A record does not reveal a source beyond observation authority.                                                                                                                                                                     |
| Source occurrence/observation references           | Exact personally admitted causes and last processed native sequence. Keep current summary references, not copied prose or a second history of every hit.                                                                                                                                                               |
| Latest hostile evidence time, kind and revision    | Observed directed preparation, attempt/release, contact or meaningful prevention. Only fresh personally admitted hostile evidence updates this revision. Interpretation of motive remains separate.                                                                                                                    |
| Last observed physical facts and movement revision | Actual observed point, time and exposed activity identity/phase, distinguishing current exposure from remembered facts. Relevant closing/withdrawal has a separate revision; it can wake cognition but cannot renew hostility, reset grace or clear a deliberate Speak override. No hidden future path or target plan. |
| Observed-active membership                         | Exact action/flight-observation keyed associations currently establishing directed attack, or references to their existing authoritative owner. Several can overlap for one opponent. Each ending removes only its matching association; derive active while any remain.                                               |
| Own selected offensive preference                  | Exact successfully admitted attack/aim method and target life plus its originating intention/receipt, monotone preference revision and exact owned unfinished invocation references; only the controlling actor owns this information. Rejected commands and menu previews create none.                                |
| Incoming recent deadline                           | Absolute installed-world simulation deadline from fresh hostile evidence or the last known boundary when aggregate observed-active membership ends. Renew neither on read nor mere movement.                                                                                                                           |
| Own offensive retention deadline                   | Separate expiry for the retained method after one's own accepted offense ends; the world uses the same grace duration. Explicit Stop attacking clears this preference and deadline without clearing incoming evidence.                                                                                                 |
| Optional deliberate social override                | Controller-and-pair-local explicit Speak choice, with the observed hostile-evidence revision it overrides. It neither alters the other actor's behavior nor suppresses later new danger.                                                                                                                               |

Reuse any existing field that already owns one of these facts; do not persist a second mutable copy of a current action or position. Derived pair indexes, active-attack lookups and display role are rebuilt from the authoritative record/action/evidence owners. A record can retain a known body's last observation without pretending it is currently visible.

### Producers and updates

Intake from already-permitted event observation, not unrestricted scanning of every actor's action target. Add a common observable attack-activity adapter across punch, equipped strike, supported natural strikes, aim/shot and explicitly exposed contact phases. The current unphased punch must supply the same directed-preparation facts as other strikes without silently changing its work time, damage or recovery. The installed base-world [readable attack-cue table](../worlds/base/combat.md#readable-attack-cues) selects exactly which physical phases disclose direction and which performer/target exposure is required. Ordinary approach and private queued intent disclose no directed attack. Actual visible preparation/aim/release can disclose the exact personally exposed target; seeing an archer alone cannot reveal an unseen target. Another supported world may withhold that relation without changing the collision or action executor.

Bind a preparation/aim cue to the exact committed action and target life through the existing occurrence/observation owner, with its actual phase and source revision retained. Continuation between preparation and held aim keeps the same known commitment; actual release and attempt/contact outcomes retain their distinct occurrence identities. Project its permitted relation into event/activity presentation, cognition and native alarm, while keeping the generic animation descriptor target-free. The contextual helper must consume this prepared observer-scoped relation instead of reading `action.targetId` merely because the performer is visible. A known cue's lost/reacquired exposure changes observed-active membership, not its hostile-occurrence identity. Prior exposure comes from the existing admitted observation/occurrence receipt even after UI-grace retirement; no second permanent combat history or repeated whole-history scan is introduced. A stale end removes only its matching association. Fresh disclosure of previously unknown directed preparation, a new attack, actual release or a new qualifying outcome retains its ordinary hostility/urgency semantics.

Each real observation/command lifecycle transition updates its affected pair once. Actor-controlled selection, hovering, local Command preview, private proposed plans and a model's discarded alternatives create no event or hostile record. Witnessing A attack B does not create A-attacking-observer. An unknown impact stays unknown even when several humans are visible.

CTR02 qualification must distinguish private/queued approach, visible unarmed/equipped/natural preparation, a visible archer with hidden target, two visible bodies on nearly the same aim line, and a third-party witness who perceives both actual participants. Check current personal evidence and resulting quick-action preference, not only an animation. Lose/reacquire the same known aim after a deliberate Speak override, including after grace expiry: its restored activity must not manufacture a new attack or revoke that override. A subsequently witnessed release must remain genuinely new evidence and preserve its separate projectile association.

Current witnessed activity can keep a pair active without periodic history writes. On observed ending, cancellation, loss of sight or flight termination, remove only the matching active association. When none remain, start/retain incoming grace from the last actual knowledge boundary; another still-observed shot keeps the aggregate active. A stale completion cannot clear another action or flight association. Ordinary meaningful observations of a known assailant closing or leaving can wake a decision; they do not disclose that person's private pursuit objective. Do not equate movement toward a body with proved aggressive intent.

Native action results remain precise distinct evidence. Coalesce scheduling notifications, not different attacks, injuries or observations. When several events share a simulation timestamp, use the existing ordered native sequence. Expiration uses the existing due-work owner and stops unnecessary retained pairs when no current activity, own commitment, grace or valid deliberate Speak override remains. Retain only the minimal authoritative pair/preference and its exact hostile-revision binding while that override remains valid; ordinary grace expiry may retire other transient attack fields but cannot erase the override. Its existing fresh-hostility, newly admitted own attack and actual authority/life-removal rules still apply. Reuse this owner rather than creating another preference store. Personal history/appraisals keep their own lifetime.

### Queries, continuation and privacy

Known-pair lookup is direct. Build the current actor's relevant pair list from owned membership and active observed actions/flights, not all world pairs or all stored history. For incoming flights, use observer-authorized launch/contact evidence keyed to exact flight/source/life, not launch time alone; simultaneous releases must not become indistinguishable. The current contextual action helper's whole-projectile scan is replaced with this owned projection.

Resolve the current body through the existing [personal reference and recognition owner](../identity-and-references.md#contract) before reusing remembered pair evidence, offensive preference or a Speak override against it. Carry the existing expected continuous-observation/recognition binding with that read and recheck it after waits and at consequential admission. Native entity/life/action identities establish integrity and deduplication; they do not establish that this observer recognizes a new exposure. Recognized Ada can retain the same-known-aim preference across lost sight. An unfamiliar archer whose observation association ended receives only the newly permitted cue/reference; neither the old accusation nor its preference identifies the new exposure. Historical evidence remains with its original source, without a second recognition store or a whole-history search.

A derived quick-action preference consumes current target visibility, the observer's pair record, installed world priorities and ordinary action availability. It does not grant attack authority. The server's existing serialized preferred-choice guard compares the exact displayed command and current authoritative preferred choice; receipt recovery precedes rechecking a repeated request. Body/control/timeline, action/tool/ammunition, relevant definition, observation, overridden evidence and deadline are dependencies. A stationary body crossing a time-only deadline must still refresh its preference without waiting for another movement or global revision.

Save these authoritative short-lived facts in the current world format with existing source identity/deletion rules. Retire executable preference on death, physical-life replacement, current-controller loss, world leave or profile removal. Retained personal recollection can still mention the old person. On restore, preserve original deadlines and sequence watermarks, rebuild derived indexes, clear pointer gestures and old request handles, and do not replay attacks or inference. Invalid private evidence ownership, impossible life bindings or malformed current-format records refuse activation through the current validator; no legacy reader is added.

## Contextual action integration — CTR09

Extend the current `worlds/base/context-actions.ts` profile and server catalogue; preserve the implemented renderer and exact preferred-choice admission. The [world decision table](../worlds/base/combat.md#contextual-action-decision-table) owns the actual default. Do not create a new combat menu, command executor, global target flag, or separate authoritative client threat timer.

Temporary blockage and permanent removal differ. During recovery, preserve the selected attack row as disabled with its owning deadline/reason. When a held weapon is permanently gone, invalidate the old choice; a newly requested preview may disclose a newly selected allowed method. Never silently replace a held gesture's bindings. An unavailable computation is its own pending/refused display and does not imply that Speak is now the intended action.

Pointer-down captures the fully disclosed exact action; pointer-up may dispatch only that unchanged intention. Native admission rechecks the captured preferred-choice binding and the full action/transition. A drag, lost modifier, pointer cancellation, canvas blur, text-entry focus, owner/timeline change or target loss cancels the gesture. Existing menu-dismissal input cannot leak into an action, and browser Command/Control context-menu conventions remain owned by the current controls.

The keyboard-accessible object/action route uses the same label and exact command. Display approach, ammunition, real preparation/recovery and lethal review before commitment. No target hover or modifier gesture dispatches AI, grants sight, spends ammunition or warns Ada. A click during physical recovery is refused/explained without queuing an attack to occur later. Ordinary manual selection of an alternate action remains available.

### Pair-local intent controls

Expose deliberate **Prefer Speak** and **Stop attacking this person** through the existing authenticated actor command/preference and durable-receipt boundary, serialized with ordinary command admission. These are narrowly scoped operations over CTR02's single authoritative preference record and its exact owned work references, not client-only flags or a second action queue. Each request binds world/timeline, actor/control generation and physical life, the other exact physical life, expected pair preference revision and an idempotent request identity. Prefer Speak additionally binds the latest hostile-evidence revision actually shown to the player. Refuse stale authority, life or consequential preference before mutation; recover an existing receipt before reconsidering its already committed request.

Prefer Speak records only the controller/pair override at that observed hostile revision. Opening the composer still emits no speech, attack, feeling or public event and does not cancel physical work. The draft may open while this preference request is pending, but the interface must not claim that the server preference changed before its receipt; retain the editable draft and explain a refused/unavailable preference. A genuinely newer hostile occurrence or newly admitted explicit attack invalidates the override. Merely ending an already known attack, ordinary movement and a fresh preview do not. The authoritative preferred-choice guard consumes this same record.

Stop attacking ends only the unfinished offensive invocation/continuation owned by that exact pair preference, then clears its retained method and own retention deadline atomically through the ordinary control/evidence owners. It never calls an unscoped Stop all work operation or cancels whichever action happens to be current. If the original offense has finished and the actor now crafts, clear the retained preference without stopping the craft. If another opponent's attack is current, preserve it. Exact ownership must also cover suspended/queued unfinished work belonging to the stopped invocation; do not leave a hidden future strike that automatically resumes. A genuinely new later chosen attack has a new preference revision and remains possible.

Where the existing plan-control primitive cannot end the exact owned invocation without affecting unrelated work, extend that primitive with the narrow scoped operation before exposing this control. Do not silently cancel a mixed-purpose parent plan or claim success while leaving its owned offense live; report the unsupported scoped stop and retain the separately disclosed ordinary work controls until this native path exists. Already released projectiles, committed damage, spent inputs and recovery are independent outcomes, not unfinished work to remove. Pause permits this same supported cancellation/preference change without advancing time; inactive/retired authority still refuses it. Qualify a late Stop after a new attack on the same person, a new opponent, an unrelated replacement craft, suspended offense, request replay and current-format reopen. A stale Stop must never delete a newer intention.

### Active player-control implementation plan

The existing catalogue already ranks recent personally observed aggression, own
admitted offense, a matching Speak override and held-shot release. The client now captures one prepared hovered choice at pointer-down; Speak/Stop
use durable exact-pair operations. Complete their connected qualification within CTR09 in
approximately 1,000–1,800 changed logic lines across the existing encounter,
activity-control, command/receipt, catalogue, protocol and scene/UI owners.

1. Retain a pair-local preference revision, exact physical lives and perception
   episode in the one encounter record. Hostile evidence, new admitted offense,
   explicit preference operations and expiry advance consequential preference
   meaning. A minimal revision record survives expired detail, preventing an old
   Speak gesture from matching again after an intervening fight. New life,
   perception episode or controlling authority still invalidates the binding.
2. Add a native exact-pair preference operation through ordinary command admission
   and durable receipt recovery. Speak changes only the override. Stop removes
   only that preference's owned unfinished offense, including queued/suspended
   continuation, through the existing activity owner. Preserve unrelated steps,
   current craft, other opponents, recovery, consumed inputs and released flight.
   Where a composition repeats the same bound offensive primitive, cancel its
   exact existing node continuation rather than the mixed-purpose parent plan.
3. Project only the player's current permitted pair/control bindings through the
   existing catalogue. Keep selected-world labels and descriptions in the installed
   body/context policy. Physical-life and recognition metadata remain private in the
   server; the wire carries opaque exact-scope references through the existing
   receipt boundary. Recovery remains the selected disabled attack; preference
   operations are usable while manually paused under the existing write guards.
4. Prepare the disclosed Command-hover choice through one scoped read owner.
   Capture that exact ready choice and target on pointer-down; commit only the
   unchanged gesture at release and serialized server admission. Current observed
   distance/bearing are display facts, not changes of the captured command; retain
   consequential facts and native reach/line-of-effect admission. Drag, modifier
   loss, target/life loss, focus, cancellation, owner/timeline change and new
   preference invalidate it. A pending preview cannot become a delayed click.
   Reuse the existing hover explanation, ordinary action menu and speech composer.
   Opening speech preserves its draft while the preference receipt is pending or
   refused; it never claims committed preference before acknowledgement.
5. Qualify ordinary berries/Speak, two opponents, held aim/recovery, late Stop after
   replacement work/new attack, suspended and mixed-purpose offense, paused
   operations, exact receipt replay/reopen, time-only expiry, target disappearance,
   pointer/keyboard/text focus and real browser input. Recheck affected ordinary
   cognition/work continuation and current-format persistence.

Cost grows with the current actor's retained minimal pair revisions, its bounded
plan frontier, the exact composition
nodes inspected for scoped cancellation and the explicitly requested action
catalogue. No world-history scan, second action executor or per-frame catalogue
construction is added. Share existing native method preparation per catalogue;
retain one owned exact choice per gesture. Scope, physical life, pair revision,
observation episode, possession/definition changes and relevant simulation-time
expiry invalidate reuse. Measure hover preparation, command queue/admission,
receipt persistence and actual browser display/dispatch separately, including
pending and stale paths. Existing native and broader performance gates remain.

Shortcut previews must expose their actual meaning as soon as their captured
command becomes ready. The held-shot browser check fits at 800 by 600, but its
existing ordinary hover fade can leave the facts nearly transparent while the
shortcut is already eligible. Set both delay and fade to zero only for the
primary-action preview (approximately one logic line at the existing hover
presentation owner), preserving ordinary hover animation. Recheck actual computed
opacity, complete fact visibility and disabled preparing-shot dispatch in the
existing evolving browser scenario; this changes no action or geometry rule.

### Next independent-choice diagnosis

The three failed twelve-case cohorts remain failed. Retained actual Ada judgments
show evasion or words outranking physical retaliation despite complete available
strikes. Before another cohort, inspect exact participant naming and the question
rubric. The current purpose/first-action sentences can name multiple unfamiliar
people simply “person,” while exact native bindings remain behind the server.
Distinct personally permitted roles now use captured model-facing labels in
each actual question, while native purposes/invocations retain their canonical
bindings and prose. Complete native/request construction and existing context
checks pass; independent willingness remains open. Reuse the existing scoped reference owner, never raw hidden
IDs or positions. The native compiler supplies the purpose label, meaning and
permitted role descriptions separately, so model projection inserts exact current
references without duplicating ambiguous role prose or persisting model handles. Estimated affected logic is 100–250 lines across the existing
supplied-purpose compiler, server context/questions and their callers. First prove
native/context distinction and privacy with controlled people; then freeze one
actual corrected Ada input for a declared diagnostic of at most $0.03. Preserve
all options, independent scoring, thresholds, identity and voluntary choice. A
higher score or native fixture cannot close the ordinary twelve-case gate.
All three bounded frozen controls still favor evasion: corrected permitted roles,
the existing world-authored selection criterion, and an explicit acting-character
question subject. The two experimental question wordings are not installed.
No frozen score or controlled native execution qualifies the ordinary cohort.
Preserve all three failed twelve-case cohorts and their exact evidence. The owner
has selected preserving Ada's current personality and keeping the counterattack
acceptance gate explicitly open. No stronger temperament, conditional retaliation
trait, forced response or injected goal is installed. Continue the remaining
implementation and qualification in the agreed phase order under that decision.

### Fatal-contact review repair

A reproduced visible fatal projectile hit on a player body loses the shooter's
actual contact account after death separates that body into a corpse. The
post-injury sight check addresses the former living participant. An absent
optional physical-life counter also incorrectly becomes the nonactor sentinel
instead of life zero. Repair these exact causes in the existing body-lifecycle
and projectile owners (approximately 40–80 logic lines): capture contacted life
and both participants' actual sight before injury, retain those witnessed facts,
and resolve a previously captured body through its existing exact corpse link
when another projectile reaches it in the same native interval. Never bind a
successor life or infer hidden contact. Qualify fatal intended/incidental contact,
two projectiles, unseen contact, life-zero records and current-format continuation
with the evolving native contact fixture and affected existing checks. The repair
is implemented and these controlled cases pass, including SQL restoration. The
same life-zero distinction also preserves the actually seen first-life shooter
for a nonlethally struck territorial animal. This changes no target-selection law.

### Return after stopped attacks inside mixed work

Actual finite mixed work (strike, movement and wait), interruption while waiting,
scoped Stop and later explicit return reproduce a prerequisite read selecting the
cancelled strike. The executor correctly skips that same saved primitive. Reuse
the existing cancellation set and remaining-work query in the read-only first-step
calculation (approximately 10–20 logic lines); skip cancelled invokes and exhausted
cancelled repetitions exactly as execution does. Preserve original limits and
unrelated movement. Qualify native return, hidden former opponent, current-format
validation and PostgreSQL continuation with the existing preference fixture, then
run affected static/existing checks. No new work owner or saved record is needed.
The same review found remaining-work wording claiming every selected person must
stay visible, although purpose-only people correctly prompt reconsideration
without stopping unrelated work. Project actual hard and observation-only
requirements separately from the existing finite control, and qualify both
descriptions against the already checked continuation behavior.
Remaining-work descriptions also mark stopped primitives as skipped, exclude
their material demands and promise no future output from a cancelled producer.
Any actual earlier output and the authored method remain unchanged. These repairs
are implemented; native return, scoped visibility, projection and SQL cases pass.

### Native movement ownership at restoration

Current-format validation accepted a copy of an actually admitted hare escape
after its animal owner was removed. Check for an orphan native ground/flight
binding before the validator's ordinary nonanimal return (approximately 5–10
logic lines). Keep normal nonanimal movement and physical flight unchanged, and
retain the supported creator-control path that ends a committed animal flight at
its real landing. Qualify malformed ground and airborne copies, valid native
continuation, that control transfer and SQL restore through the existing fixtures.

A supported joined-route fixture also exposed ordinary takeoff running before an
already due alarm choice. It removed ground support at the same point, causing
the choice to reject its floor-intersecting connector and fall back to gravity.
Hold an unreleased supported routine at that start boundary while the existing
animal owner chooses, as already done for supported terminal rest. Preserve
already airborne movement. Then qualify a real admitted native flight through
creator transfer and its joined continuation, including prediction, execution,
SQL and partition agreement. Expected repair is 10–30 logic lines in the flight
owner; no new movement owner or authored speed/geometry change is permitted.
After supported takeoff was repaired, the actual admitted native flight and
creator transfer exposed a second failure: prediction compared a later joined
corridor against the still-current body's original corridor digest. Validate the
captured digest against actual current progress, while forecasting each trusted
joined corridor with its own climb limit. Execution still advances that digest
only when it actually crosses the join. Preserve changed-definition refusal.
Use one flight-owner held-routine predicate in execution and every movement
forecast; a supported routine waiting for the alarm choice predicts no travel.
The bounded finite-route diagnosis then retained twelve coherent advances at
game time zero: an unusable aerial comparison deleted the ground proposal on
every read, replacing generations 1–12 before their completed route answers could
be consumed. Retain that exact ground proposal when air offers no usable choice;
retire it only when choosing an actual flight or when no ground support exists.
Existing origin/geometry/body checks still invalidate genuinely stale preparation.

### Complete held-shot choices and visible animal activity

An actual ready manual aim is offered in the player catalogue but absent from
the complete character choices. Preserve its exact release as an immediate
continuation, not a replacement activity that discards the prepared shot. Reuse
the release owner's readiness, exact aim and permission checks for preparation
and commit; expose the selected world's existing shot facts. Include the release
in applicable physical purposes and qualify native response admission, stale aim,
unready refusal and one exact projectile consumption without a provider call.
Record the immediate release and its chosen purpose through private action history,
linking the prepared aim without making the revision-bound release reusable or
retaining one-attack permission. This repair affects roughly 70–110 logic lines across character-choice preparation,
the purpose compiler and release/admission owners; it adds one current-aim option
per character read, without multiplying inventory or target searches.

Blocked and settling animals must remain visibly alert, rather than being called
foraging. Put this activity wording in one selected-world presentation source,
consumed by visible status and entity description. Preserve actual action and
territorial presentation precedence and disclose no private danger records.
Approximately 20–40 logic lines affect two existing server projections and their
world-owned wording; each visible animal needs one constant-time lookup.

## Shared continuation, authoring and removal

Treat current saves as one supported format. Update domain types, validators, installed definition bindings, server projections, pending native work, public protocol and all retained action/context consumers together. A changed current-format definition is not a reason to invent version-suffixed compatibility records or an old-save migration.

Capture the exact selected meaning for the lifetime declared by its owner: released flight, the whole animal episode, or the chosen finite invocation. An author can change supported profile values through the normal admitted world-definition route for future work outside that lifetime. An animal's pending proposal and later refuge legs therefore retain its episode pin; publishing a newer future selection does not rebind them. Incompatible removal of a family still used by active flight, an animal episode or a chosen finite plan refuses before partial mutation unless the existing owner supports an explicit whole-operation cancellation. Do not rewrite committed costs or reset deadlines when a profile changes.

Authoring inspection must explain what is supported: native danger classes, refuge/speed parameters and allowed controller family; prepared personal purpose definitions and their actual action capabilities; harm/participation policy; and UI grace. Prose cannot install unsupported free flight, grappling, omniscient sensing, social consent or host execution. Current edit/inspection grants remain enforced. No new world-creator privilege follows from changing a fictional combat rule.

## Native animal execution (CTR03–CTR04)

### Current native animal implementation

Design used and revised **2026-10-22T22:10:00Z**. One installed controller owns
personal danger, escape, ordinary travel, rest arbitration and ground/air handoff.
The [authored animal rules](../worlds/base/animal-responses.md) own the sequential
10–15 m ground search, 75%/50% thresholds, three/ten attempts and tuning. The
[world plan](first-playable-world-tech-design.md#simple-escape-and-entity-local-navigation-waits)
owns this implementation boundary and actual verification.

Each saved proposal carries one current endpoint, the drawn bearing/distance/side,
attempt count and best shorter physical path. Current origin/body/geometry/life
and proposal identity fence worker results; the shared clock is deliberately not
part of an unchanged waiting request's identity. Directions are tried one at a
time through existing direct navigation or the bounded Recast worker. Only actual
movement admission installs a path. Support and body collision remain mandatory;
complete route visibility and optimal all-danger corridor comparison are removed
from ground escape. Periodic danger review retains an admitted useful leg.

Requests select world-blocking or entity-local waiting. The selected animal profile
uses local waits for escape and native travel; existing ordinary callers default
to world blocking. A pending animal remains still while the world advances. Late,
cancelled and restored callbacks retain current action/proposal/body/map/timeline
checks. The former anticipatory multi-route preview is removed: each waiting animal
now publishes its own actual single request through the existing coordinator.
Callback availability may affect when locally waiting animals depart, an explicit
tradeoff rather than a second simulation clock or hidden elapsed-time discard.

Personally observed executed attacks, release, passage/contact and authored sound
rules can alarm animals. Attack preparation does not in this world. Keep human
combat preparation evidence and all committed projectile effects intact. No animal
model calls, forced human decisions, second mover or legacy state adapter is added.

The failed early bow hunt exposed the observed-point ray striking the ground
behind retreating prey. Mike approved observed-motion leading on October 18.
Before repeating that journey, extend the existing held aim with one personally
seen, actually executed linear movement segment. The shared physical forecast
may prepare that segment, but it becomes evidence only after actual movement
matches it and ordinary sight covers its observed portion. Unsupported or
ambiguous physical motion supplies no lead. Capture only active aims and their
exact targets; do not scan unrelated animals or inspect future route choices at
release. Current target life, visibility and observed endpoint must still match.
The bundled release law solves the constant-velocity intercept within the
launcher's existing flight range, otherwise aiming at the current observed point.
It preserves preparation, steadiness draws and fixed released flight. Current arrow speed, range and approach tuning are owned by [ranged counterplay](../worlds/base/ranged-counterplay.md).
Approximately 200–300 logic lines affect physical-motion preparation, held aiming,
release and current-format validation. Verify static and moving shots, turns,
loss of sight, changed life, same-clock release, save/load and split continuation,
then repeat the actual hunt–harvest–cook–eat path. This is an approved aiming
contract change, not evidence that hunting is qualified.

Completion requires the single installed controller and every connected consumer
above, the canonical qualification matrix below, and truthful remaining evidence.
The ordinary supplied Main opening remains selected. Broader feeding, packs and
roaming stay in the later already-authorized RW phase and must extend this owner.

The territorial owner retains pursuit, antler timing, relinquishment and withdrawal
ownership. Its formerly authored refuge remains saved as a known handoff hint;
ground movement uses the same bounded sequential escape and never starts a second
return mover. Settling keeps relinquishment. Existing finite bird connections and
physical landing/flight continuation below remain under the same response owner.

The remaining bird connection extends the existing flight family in two connected
steps (approximately 600–1,000 logic lines across flight, prediction, response,
authored routes and current validation). First make route completion explicit:
ordinary loops, finite supported landings and exact joins to another admitted
route. Retain terminal perched progress so settling cannot restart a loop, and
allow a physically authored return connection only after the alarm ends. Every
forecast, swept contact and actual flight must traverse the same completion rule;
no second flight updater or position path is saved in the response episode.

Then author two finite alternative landing corridors on distinct sides of the
clearing, resolving their actual ground support during initialization. Explicit
source-route connections authorize only a currently exposed, swept-clear physical
join from the bird's actual position; a route identity cannot move the body to its
entry. Compare complete three-dimensional corridors and actual supported endings
against the same complete danger set. Preserve current refuge continuity and one
canonical weighted choice. An unsafe ending is not a landing permission: retain
a valid airborne corridor or report the explicit unsupported/blocked flight
outcome. A grounded bird without usable takeoff can use ordinary ground escape.
The selected flight binds its episode/profile/generation, while the flight owner
retains the route and current progress. It also retains the original selection time,
geometry revision and any consumed weighted draw, including finite air-node choices.
Exact route digests reuse only deeply immutable definition identity; changed drafts
and mutable builders recompute them. Complete graph preparation occurs at due
reviews, not every movement slice. Prediction and execution read the same pinned
speed and body factors without another navigation or position owner. Its escape cruise comes from the selected
profile, with the existing route climb constraint and body movement factors
applied once. Native control loss ends new choices and stops at a real landing;
released projectiles and actual falling retain their existing owners. Qualify
waiting/takeoff, mid-edge joins, blocked and changed supports, unsafe perches,
ground fallback, rest/incapacity/death, continuation and actual server/browser
motion before declaring the animal phase delivered.

The concrete finite graph supplies supported landing choices and named airborne
waypoint choices. Compare landing routes first when a currently exposed clear
landing is reachable; otherwise compare finite movements to admitted air nodes.
Reaching an air node requests another same-clock native choice and cannot start
settling. A currently retained flight keeps its exact remaining leg when still
eligible. New ground takeoff requires a real vertical connector at the body's
actual supported point; unsupported ground positions use ground escape instead.
The body's explicit future graph binding survives that fallback, without keeping
an obsolete active flight. A last-moment unsafe landing requests native review
before contact; no available admitted continuation uses explicit flight/falling
recovery rather than indefinitely hovering at an arbitrary point. Pure landing
previews read the same complete danger owner without recording new observations. A clear
ordinary supported perch holds through settling as actual rest, then resumes its
real successor at the completion boundary. Flight admission and resumption call
the flight owner at zero elapsed time before any subsequent interval; neither
waits for another public advance nor backdates departure to an elapsed interval.

The spatial substrate now provides nominal upright-body separation, full-piece
minimum separation and complete distance-band intervals. Ordinary capsule routes
use a quadratic minimum; mixed short-cylinder slopes or a growing region use a
bounded convex search below spatial tolerance. This is shared geometry preparation,
not a second mover or completed animal controller. Diameter-height projectile
contact now follows the existing movement sphere convention.

Installed native response definitions use the existing world record catalogue,
with a structured key containing their complete definition pin. A body selects a
profile and locomotion binding; its running episode retains its own exact pin.
Referenced authored revisions remain installed when a future default is selected,
so one registry owns definition content instead of copying rules into every
animal. This supports actual authored revisions, not old-format readers. Native
family validation admits data only; a definition grants no movement or harm.

### Owners and integration

Replace the current selected animal steering adapter with one installed trusted native response family. Keep the existing `actor.controller = native` authority distinction. Do not turn species into controllers, route animals through the person's Decision API, or introduce a second write path for position. A native controller can be a small coded policy; world ownership means its installation, parameters, meanings and permitted choices can differ between worlds.

The current producers/consumers that must be reconciled together are `native-response-controller.ts`, `worlds/base/actions.ts`, `worlds/base/hunting.ts`, `worlds/base/bodies.ts`, `worlds/base/spawn.ts`, `worlds/base/world.ts`, `worlds/base/landscape.ts`, `worlds/base/first-threat.ts`, `territorial-threat.ts`, `flight.ts`, `kernel.ts`, `temporal-boundaries.ts`, motion/sensory prediction, body/energy active-work detection, public behavior projections and current-format validation. Search all reads of the former animal danger/direction fields and the old universal flee speed; a clean primary adapter does not prove those secondary meanings agree. The ranged approach helper and its execution/action-view consumers must use the [selected explicit ranged allowance](../worlds/base/ranged-counterplay.md#selected-approach-allowance-during-animal-speed-integration), retaining its current effective value rather than inheriting a species escape speed.

The world contract [animal-responses.md](../worlds/base/animal-responses.md) owns constants, species bindings, candidate construction, comparison and deferred repertoire. Reuse existing movement, navigation, perception and lifecycle operations. A narrow route-to-one-of-these-destinations preparation can extend the existing navigation request if needed, with one current endpoint and the common body/query budget; do not create a second worker fleet or world-wide navigation service for animals.

The engine installation dispatcher resolves the supported native family and exact profile. Kernel/domain callers use that selection, not imports of base-world animal constants. A world without that family has no automatic escape behavior. A contrasting fixture binds a small native rover that avoids a locally perceived harmful emitter and selects a reachable sheltered endpoint using a different locomotion profile; it makes no claim to simulate new radiation physics. Supply the fixture's harmful-region input through an admitted test/world policy. This proves the dispatcher and physical route execution do not require humans, animal species, fear prose or this world's distances. Do not implement that fictional world as shipped content.

### One state owner

Evolve or replace the existing animal behavior state in one current-format change. The final runtime type names may follow neighboring contracts, but these meanings are mandatory:

| Logical field                            | Meaning and invariant                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile pin and physical life            | Exact admitted controller/profile definition and current body life. A name or species display label is insufficient.                                                                                                                                                                                                                          |
| Episode identity, start and latest cause | One active alarm, with exact existing source occurrence references. Repeated hits update evidence without duplicating physical episodes or replaying events.                                                                                                                                                                                  |
| Phase                                    | Routine, escaping, settling or blocked. A territorial owner can contain an escape withdrawal substate, but cannot run a second ordinary escape updater.                                                                                                                                                                                       |
| Danger estimates                         | Latest permitted observed body/region state, source-life key when recognized, observation time, uncertainty representation and expiry. Distinct anonymous evidence retains its uncertainty. No private inventory or hidden live target location.                                                                                              |
| Chosen refuge                            | Exact supported world point or admitted aerial/perch destination, original selection inputs/revision and RNG result. No second saved movement path.                                                                                                                                                                                           |
| Pending refuge proposal                  | Monotone proposal generation and the native decision boundary/basis for outstanding preparation. Candidate endpoints and meshes are derived from the saved world/episode basis, not another authoritative path; restore cannot silently become a new random decision.                                                                         |
| Movement reference                       | Exact current action/flight ownership reference and purpose. Required references agree in both directions.                                                                                                                                                                                                                                    |
| Review, clearance and routine deadlines  | Absolute simulation times, optional `clearSince` only while continuously clear, next ordinary wander deadline, and the last meaningful danger/geometry revision. Incapacity, uncontrolled falling or lost voluntary locomotion clears the settling clock and enters blocked/capability-unavailable while the actual physical owner continues. |
| Blocked continuation                     | Actual refusal category and last tried input signature, plus the next eligible review. Repeating identical blocked input does not allocate fresh work.                                                                                                                                                                                        |

The animal state retains lightweight geometric danger estimates, not the person's autobiographical memory or appraisal model. Authoritative observation events remain under their existing owners; transient candidate lists, spatial indexes and mesh data are derived. Aggregate diagnostic counters do not become gameplay fields. Ordinary 0.4-metre wandering also uses timed locomotion at its selected profile speed; remove the old instantaneous wander displacement when consolidating movement ownership.

### Transition order

At each applicable native boundary:

1. Advance to the earliest applicable native motion/contact, perception or personally perceived near-passage boundary, then apply any contact and body consequences actually due there. Produce exact hurt/attempt/passage evidence and its permitted animal exposure. A passage cannot be emitted beyond the projectile's first stopping contact. A passage alarm that changes an animal's movement requires recomputing the remaining interval before committing a later impact; do not finalize that later impact using its obsolete trajectory. Released projectiles retain source attribution without revealing or refreshing an unseen shooter's position.
2. Intake all new eligible alarm evidence, including when the animal is busy, perched, airborne, incapacitated or falling. A physical-work condition may defer movement; it must not discard evidence. Dead bodies receive no new animal response. Injury/flight interruption follows existing physical owners.
3. Reconcile source estimates from the animal's complete permitted local danger set. Expire old estimates by original observation deadlines. Native spatial broad-phase membership is not itself perception. Do not silently truncate to the nearest danger.
4. Determine whether a real dependency, temporal crossing or due review invalidates the current refuge. Continue an unchanged admissible route without a new query. Before requesting a route for a stationary route-blocked animal, apply the world's [in-place settling contract](../worlds/base/animal-responses.md#separation-and-settling): complete current clearance, available voluntary capabilities and no current qualifying attack permit adopting its actual supported position and starting a fresh full settling interval. Danger-estimate expiry can enable this without an arrival or usable movement endpoint. Do not consume a navigation request/RNG draw, backdate safety or let a late prepared route overwrite the new mode. A fresh threat can interrupt ordinary cancellable wandering/walking, while a committed physical phase must use its real interruption semantics.
5. If needed, prepare the bounded refuge candidates through the ordinary navigation owner. Direct supported movement stays on its established fast path; unresolved preparation retains explicit pending state. Finish/refuse the complete request before committing the destination, RNG draw and movement ownership together. Preparation grants no movement success; an entity-local wait does permit elapsed world time.
6. Execute/predict actual movement through one owner. At arrival evaluate current clearance, start/reset settling or request the next refuge. An arrived unsafe refuge is not retained as a zero-length winning route. The temporal owner detects 15-metre clearance entry along executed relative trajectories and growing remembered-region uncertainty, even when the danger enters and leaves between 12-game-second route reviews. Same-time physical, perception and capability changes precede final settling completion.
7. Emit only real coarse behavior transitions and actual physical outcomes under current disclosure. Repeated reviews do not emit repeated thoughts, alarm-start events, history entries or public destination hints.

Use canonical animal ordering when starting saved searches. Draw the bearing tie,
leg distance and side preference only when creating the actual attempt, never in
views, callbacks or restoration. An entity-local wait does not stage later animals
behind it: they can choose while it waits. Callback availability can affect later
movement/start order under load; this is the accepted local-wait tradeoff. A
callback only supplies a fenced physical answer; native admission starts movement.

### Preparation, passage identity and rest integration

A pending refuge proposal binds world/timeline, exact animal life, controller/profile pin, episode and proposal generation, current position/support and movement ownership, body/navigation profile and the actual candidate endpoints. The returned physical preparation also binds relevant supporting/obstructing part revisions. Recheck those bindings before publication. Body replacement, controller loss, a change to the episode's bound profile pin, a newer proposal, changed origin/ownership or changed relevant geometry makes the old proposal noncommittable. Merely selecting a newer profile for future episodes does not. Recompute the complete currently permitted danger set before settling or starting a fresh leg; an old danger snapshot cannot declare safety. Valid derived navigation preparation may be reused through its existing owner, but an obsolete proposal cannot spend RNG, cancel work or claim a destination. Restoration reconstructs pending derived work from the same saved semantic proposal/episode without replaying a committed choice.

Extend the existing projectile record with saved **`nearPassObservedLives`**: a canonical set of exact physical-life references that have already received its qualified passage observation. A derived lookup may index that set; there is no new global passage log. Add membership atomically with the admitted passage occurrence/observation, before exposing the alarm. The query is one projectile/life lookup, not a search through all event history. A physical impact remains a separate exact occurrence. Retire this set with its projectile; current-format restoration preserves it. The animal's latest cause alone is insufficient for deduplication when several flights overlap. Qualification covers an earlier passage followed by trajectory-changing escape, source death, two simultaneous flights, replay and a save between passage and impact.

The world profile's selected ordinary-rest rule needs one narrow status field, **`nativeResponseActive`**. Extend the finite field schema/validator/evaluator, dependency preparation and any static dependency indexes to read the current installed native-response owner's episode. For a resolved target it is false when no supported response family/episode is installed, with no bundled fallback; unresolved targets remain inapplicable. It is derived, life-scoped and read-only. Starting/ending an episode, removing/changing its controller/profile or replacing its life invalidates affected status conditions through the existing state-dependency owner. Escaping-to-settling remains true and does not itself create an unrelated status invalidation. This boolean contributes no new clock crossing; actual episode and energy/clock deadlines keep their existing owners.

In `worlds/base/config/status-effects.yaml`, add `nativeResponseActive == false` **only to the existing night/energy automatic-rest branch**. Keep the independent `energy <= 0` branch, all current applicability and rates, full-energy completion and reactivation delay. Add `perceived-danger` to restorative rest's authored `interruptOn`. The selected native policy dispatches that interruption once for a newly admitted qualifying observation when its body is alive, not incapacitated and has energy greater than zero. Use the current status interruption/deactivation owner and the same observation dedup/serialized transition as alarm intake. Do not set status/activity/capability fields directly. Old retained alarm or energy regeneration alone cannot dispatch it. A continuous `alarm && energy > 0` end predicate is specifically wrong because it immediately wakes zero-energy rest on its first gain.

Prepare event-time permitted evidence before same-boundary automatic night rest, intake the alarm, dispatch any allowed authored ending, then recapture effective capabilities. Existing injury waking, explicit wake admission, actual exhaustion, unconsciousness/incapacity and status work release remain authoritative. While sleep removes perception, ambient proximity is not a new permitted alarm observation. `activeWork` reflects actual locomotion, flight or other physical work: settling or a stationary blocked episode does not spend the moving-work rate merely because `nativeResponseActive` remains true. Reconcile all former animal-danger reads in energy/rate forecast as part of CTR03. Regenerate/check status data through the existing configuration owner; status/save/condition validation and selected-default documentation must change together. There is no new psychological meter or separate sleep implementation.

### Flight and territorial integration

The current bird route is a looping native flight record. The implementation must supply a terminal escape-route/landing outcome through the same flight owner, rather than letting the loop immediately take off toward danger after reaching a refuge. Add the smallest supported flight continuation distinction needed for an admitted finite escape route, preserving existing loop behavior as an explicit selection. All current route definitions and current-format validation change together; no legacy default hides the distinction.

New escape connections require current swept-body clearance, allowed climb/descent and compatible landing support. A route swap retains the current physical position and never spends the interval twice. While airborne, ordinary ground escape cannot also run. If all aerial alternatives are unsupported, use the actual flight recovery/ground fallback and keep a truthful unresolved alarm. No implicit teleport, free hovering at arbitrary height or invented landing point is permitted.

The territorial stag keeps the existing territory decisions, antler strike, pursuit deadlines and relinquishment outcome. Its pursuit speed becomes an explicit authored territorial value so replacing the generic animal speed cannot silently double encounter difficulty. When the territory owner selects withdrawal, it delegates to the same escape evaluator and profile speed; its old authored refuge remains a handoff hint rather than a second movement owner. Active antler preparation/recovery cannot run concurrently with the delegated move. Settling preserves relinquishment; ordinary prey code never reacquires the cache on its behalf.

### Performance contract

Let A be living native animals, E the subset with active alarm episodes, D the eligible local danger records for an animal, C the bounded new candidate count, and P the actual accepted route segments. Routine work must grow with A through existing participant membership and actual sensing/behavior deadlines, not A multiplied by all world entities, all history or all observers. Active comparison is proportional to the complete local D and at most C route candidates; ground route checks cost O(C × P × nearby bodies), with early acceptance under the authored progress thresholds; danger bearings and settling still consider the complete D. The retained route is checked directly. C is bounded in the world profile; D has no independent nearest-N cutoff, and its reachable growth/retention must be recorded honestly in the limits inventory.

Share immutable body meshes and static support preparation through the existing coordinator. Reuse a complete observer-scoped danger snapshot within one review; do not rerun perception separately for every candidate, tool, route segment or public projection. Current positions/uncertainty remain live at the relevant boundary. Geometry dependency keys cover actual changed parts/supports, not only the top-level map object. Relevant motion and evidence expiry invalidate safety without invalidating unrelated static meshes.

Use the current spatial work/admission budgets, finite navigation request queue and explicit pending outcomes. A queue or computation ceiling does not establish unreachable terrain or an absent danger. No new background busy loop retries all blocked animals each tick. No candidate/path history is appended on a harmless refresh. Retire transient episodes and derived entries when ordinary behavior resumes, the current body life ends, its controller is removed, or the timeline changes.

Ordinary requests retain their world-blocking default. Animal requests select entity-local waits, so required animal path preparation cannot hold the shared clock. Large alarmed populations can still overload native processing or the bounded navigation queue. If required qualification fails, optimize shared preparation and invalidation or keep the affected population capability unqualified; do not publish success by dropping animals, skipping threats, replacing paths with collision-blind steering or claiming a timing win from paused/inactive simulation.

Required implementation measurements use identical seed, geometry, native rules, inputs and host for old/new comparison. Include ordinary opening density, 100 native animals and 500 native animals in valid admitted layouts; add a 1,000-animal exploratory workload only where world admission permits it. For each, separate calm, 10% alarmed, all alarmed, two converging groups of human dangers, concentrated geometry edits and save/load cold reconstruction. Record elapsed simulation achieved at normal and requested 8× speed, native CPU/headroom, whole-server responsiveness, navigation pending/hold time, allocations/retained state, and counts of danger candidates, exact perception checks, route preparations, reused routes, invalidations and RNG draws. Report accepted population/time behavior and failures; no numerical speedup or capacity is established by this design document.

### Qualification matrix for CTR10

| Case                                                                                       | Required check                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two humans and one original attacker                                                       | Safe selection accounts for both; changing which human delivered the blow cannot permit the same dangerous corridor.                                                                                                                                                                                                                                        |
| Entire locally perceived danger set                                                        | Add more than a plausible nearest-N display count; a farther body on the route still changes safety. No silent truncation at ordinary catalogue/UI limits.                                                                                                                                                                                                  |
| Open ground, wall detour, U-shaped obstacle, slope, support seam, narrow opening, map edge | Use continuous body-checked movement; choose an admitted detour when available; distinguish no candidate, outside local scope, blocked and incomplete preparation.                                                                                                                                                                                          |
| Threat lost behind a wall and later reacquired                                             | Use retained estimate and increasing uncertainty; no hidden current position. Reappearance updates only actual perceived evidence.                                                                                                                                                                                                                          |
| Unknown/dead shooter, passage and intercepted shot                                         | Retain actual damage/bearing without identifying or refreshing an unseen shooter's location; an unintended contacted animal still becomes alarmed. Passage stops at the actual first collider, deduplicates through restore and changes future motion only after its own exact boundary.                                                                    |
| Clearance clock                                                                            | Arrival alone is insufficient; reentry just before expiry resets it, pause freezes it and clock-only expiry is honored without a new position update.                                                                                                                                                                                                       |
| Destination stability                                                                      | Harmless small movement/global revisions do not redraw. Material route danger or an actual obstruction can cause a new refuge.                                                                                                                                                                                                                              |
| No physical exit                                                                           | No clipping, teleport, invented strike, infinite paid/native retry or false safe state. An opening created later permits a meaningful retry.                                                                                                                                                                                                                |
| Route-blocked animal after its last danger expires                                         | With no usable endpoint but complete clearance at its supported current position, begin a fresh full settling interval in place and return to routine. No path request or RNG draw is needed; stale route completion cannot restart escape. Incomplete danger preparation or unavailable voluntary capability cannot pass.                                  |
| Species and injury                                                                         | Actual motion, prediction, energy, sensory crossings and projectile contact use one selected speed, once adjusted for the existing injury/scar policy.                                                                                                                                                                                                      |
| Night rest, actual exhaustion and waking                                                   | Night rest cannot start for an active native response. Zero-energy rest retains authority and clears settling. The first tiny energy gain cannot replay an old wake cue; a newly permitted danger at recovered positive energy may interrupt once through status ownership. Dead/incapacitated bodies do not wake, and sleeping perception is not bypassed. |
| Perched and airborne bird                                                                  | Alarm is not lost behind the flight early return; route handoff/terminal landing are valid and single-owned; missing coverage is explicit.                                                                                                                                                                                                                  |
| Territorial stag                                                                           | Readable pursuit timing remains; injury withdrawal avoids all dangers, with no overlapping strike/move and no loss of cache relinquishment.                                                                                                                                                                                                                 |
| Save/load and native interval partition                                                    | Equivalent admitted inputs yield equivalent movement, deadlines and RNG; no event replay. Include a route turn, pending preparation, settling near expiry and malformed current-format references.                                                                                                                                                          |
| Alternate installation and omission                                                        | Controller execution does not require base-world species/names; omitting the family removes its choices with no bundled fallback.                                                                                                                                                                                                                           |
| Ordinary player experience                                                                 | Watch/pursue using actual controls and clock; record purposeful motion, hunting usefulness, awkward blocked cases and any navigation stalls separately from native correctness.                                                                                                                                                                             |

### Concentrated-workload measurement

The existing running-server profiler now implements the two finite diagnostic
selections: two actual converging pairs of people, or one serialized 0.2 m screen
edit every 500 real milliseconds with at most one outstanding edit. Earlier
100/500-alarm normal/8× measurements and 1,000-animal exploratory cold admission are
recorded in [combat evidence](../verification/combat-and-threat-responses.md#concentrated-population-measurements-and-exploratory-admission).
All required added cohorts are retained. Those earlier requested speeds were not achieved, including zero
progress in several phases; no gameplay rule is changed to improve the result.
Input validation, actual movement/publication counts, elapsed work, waits,
CPU/memory and owned cleanup are explicit. These measurements complete the
selected workload attempt, not rendered gameplay. Mike's October 22 revision requires honest current 100/500 measurements without a population throughput target; do not keep optimizing merely to hit those population sizes.

### Concrete limits to record in the existing base-world inventory

CTR04 changes the old universal half-person flee speed to species profiles; replaces the 16-direction/four-metre local steering and exponentially decaying danger with persisted refuge routing and continuous clearance; adds finite local refuge/observation/route-review rules; retains no top-N-danger limit; and makes animal model calls exactly zero for this family. World values and their reasons are canonical in the animal profile; the inventory records their selected/unimplemented status and restrictiveness. Existing spatial query, path, worker, queue and world-admission limits remain separate. Offspring, pack, predator, scent, generalized free flight, burst endurance and optional rare animal cognition remain explicit deferred capabilities rather than implied implementation TODOs in this slice.

## Complete threat choices, appraisal and voluntary action — CTR05–CTR07

### Current defect and minimum repair

`apps/server/src/context.ts` currently returns from physical-choice construction when `actor.action` exists. The comment protects actual work/materials from implicit replacement, but the return also hides later ordinary strikes, guards and equipment choices. Keep the material protection and remove the omission. Merely deleting the return is insufficient: direct-action preview can reject an alternative because current work still occupies its lane, and an adapter that pretends current work is absent would conceal cancellation costs.

Extend the existing action-availability/preparation owner with a **read-only prospective transition**: continue, replace, or interrupt current native work, followed by one exact action/invocation. Its result includes whether that transition is supported now; expected current plan/action revision; actual spent inputs and unrecoverable progress; paused-work disposition; outstanding strike/evasion/guard recovery; the exact subsequent binding; and the earliest meaningful boundary for a temporary blocker. Share these facts between ordinary action details, NPC candidates and final admission. Do not allocate an action ID, stop a task, reserve physical inputs, apply costs or mutate a throwaway gameplay copy to build the menu. Temporary preparation unavailable is distinct from an impossible action.

For interrupted work, preserve the current owner's real semantics. An unfinished restarted step may lose its partial elapsed work; consumed inputs are not refunded; one already suspended frontier can prevent another suspension. Replacement discards the corresponding paused work. An attack's committed contact or recovery cannot be cancelled away. A refused transition must leave the original action untouched. Recheck the full transition and its exact action together immediately before any interruption or cost; accepting only the transition and later discovering a predictable action refusal would reproduce the bug in another form.

Precompute actor/tool prerequisites once per request snapshot, before expansion across current permitted targets. Build every relevant feasible family even while busy. Do not cross every inventory lot with every visible entity before rejecting unusable tools. Exact source/tool/life identities remain bindings; display descriptions use permitted names. Empty hands still allow the world's granted unarmed action. A method unavailable because of current recovery remains explained with its current deadline; it is not quietly replaced by conversation or labelled permanently unsupported.

### One actor-permitted decision snapshot

The same prepared snapshot feeds both semantic stages and the current inspection surface. Required context has these meanings:

| Context             | Required owner and exact content                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Personal identity   | Complete accepted About me/current dispositions, not a combat-specific replacement biography. Keep chosen goals separate from author content.                                                                                        |
| Body and capability | Actual current bodily measurements/conditions, pain, ability to move/strike, equipped means, costs and recovery through existing native projections. Never infer hidden abilities from biography.                                    |
| Present work        | Current and paused plan/frontier, actual progress/outcomes, spent/held resources, explicit supported control transitions and next boundary.                                                                                          |
| Immediate cause     | Exact personally experienced/observed occurrence, observation roles, known/unknown source, source revision, observation time and cause sentence. No arbitrary latest world event.                                                    |
| Encounter           | Observer-scoped CTR02 relations, current observed attack versus past occurrence, current sight versus last-seen evidence, simultaneous relevant opponents, and own chosen finite commitment.                                         |
| Appraisals          | Relevant active private records with current intensity, installed scale, source/subject, lifetime and revision. The existing label-only `decisionFeelings` rendering must carry admitted numerical meaning for the selected profile. |
| Other people/place  | Only actual permitted current observations and retained sources needed for a purpose, such as a particular endangered person or known destination. Another person's fear or goal is never supplied as world truth.                   |
| Alternatives        | Current feasible exact choices plus consequential temporary blockers and their prospective transitions. A source/tool not prepared remains unknown, not nonexistent.                                                                 |
| Experience          | Required immediate attack/action-result/changed-term evidence before optional recall, through the existing memory owner. Include relevant contrary/new evidence and distinguish reported intent from witnessed conduct.              |

The actor's current protected identity, required cause, current body/work and necessary target interpretation cannot be dropped to make the request smaller. Reuse existing complete-context byte admission; if the complete required set does not fit, refuse preparation with its cause and preserve the pending opportunity. Optional recall remains optional, and no independent unbounded combat-memory cache is added. A shortlist length alone does not bound preparation; measure selected source bytes, candidate visits and exact physical checks.

Acquire mandatory threat-related feelings from the existing appraisal owner by exact actor/definition/subject or source association, including the relevant targetless danger interpretation, or continue that owner's pages until the required set is complete. The current `activeAppraisals` convenience projection and reflection binder expose only the first default page of 24 records; that prefix cannot prove that the person has no existing feeling about this assailant. A scoped lookup/index belongs to the same owner and must preserve its privacy, live-record, decay, cold-source and revision rules. Charge continued reads and source bytes to the existing preparation budget. Optional unrelated feelings may remain bounded; mandatory relevant feelings may not be silently trimmed, replaced with zero or read from another observer's state. If bounded preparation cannot establish the complete relevant set, defer truthfully and retain the opportunity rather than performing a supposedly informed interpretation of an incomplete prefix.

### Catalogue, bindings and definition ownership

The [world catalogue](../worlds/base/threat-response-options.md) owns purpose meanings and initial finite templates; [psychological reactions](../worlds/base/psychological-reactions.md#interpreted-threat-reactions) owns fear/anger definitions and numerical choices. Install their data beside the existing base-world cognition/appraisal/activity profiles, with one pinned definition consumed by discovery, candidate preparation, prompt text, selection, inspection, native admission and current-format saves. Do not scatter fallback purpose strings or fear coefficients through `context.ts`, `ai-director.ts` or the kernel.

Bind each request-local option to actor/world/timeline/control and physical life; purpose definition pin; permitted source/subject references and their evidence/observation revisions; exact method/tool/target life/destination; explicit work transition; current native prerequisite dependencies; and selected deadline/stop conditions. Display a compact handle, natural purpose, actual first action, costs and finite continuation. A handle is not an entity ID, an executable sentence or authority to substitute a more powerful method.

Use existing `ActorGoal`/`ActorPlan` and the finite activity composition/`ChosenActivityControl` owners. A selected purpose is metadata on that admitted work; there is no second combat goal or mutable global aggression state. Where a simple strike needs no durable personal goal, do not manufacture one. Use installed observation conditions to express current visible target, selected reach, anchor boundary and deadline. A truly missing condition receives one narrow reviewed native implementation with declared reads, unknown result, dependencies and next boundary; it is not evaluated by a model every tick.

The initial offered attack authorizes one strike. A pursuit can be an exact visible approach/follow or a currently supported approach-and-one-strike composition, bounded as the profile states. Target loss, changed life, route refusal or a selected limit cannot be repaired by substituting another opponent or restarting the original deadline. A last-seen point requires a separately selected permitted binding; unseen target movement never updates it. Future multi-strike compositions remain explicit later options, not the fallback for slow cognition.

### Shared prepared-choice integration

Apply the canonical [prepared-choice](../action-capabilities.md#prepared-choices-and-prospective-work-transitions) and [deliberation](../../archive/07-technical-architecture/agent-agency-runtime.md#25-shared-deliberation-and-prepared-choices) contracts through the current preparation and selection path. The table maps this project's concrete integration work; it does not define another choice schema or combat director. Several current helpers intentionally reduce ordinary optional suggestions to native commands and cannot serve the selected complete threat repertoire unchanged.

| Existing owner                                                                       | Required change and preserved responsibility                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AiDirector.decideAttempt` in `apps/server/src/ai-director.ts`                       | Resolve the installed threat-deliberation strategy from an admitted personal threat cause or a current subscribed commitment **before** ordinary route/suggestion preparation. Reuse the same actor/job, accounting, cancellation watcher and final publication. Native strategy selection chooses how this opportunity deliberates, never whether Ada fights.               |
| `prepareDecision` and candidate preparation in `apps/server/src/decision-context.ts` | Reuse the existing permitted evidence/context owner, with an explicit complete-required choice set for this strategy. Ordinary optional recall, top-300 retrieval and suggestion policies must not stand in for or trim that set. Establish native feasibility and complete-set size/work admission before either required call; failed preparation retains the opportunity. |
| `distinctActions`                                                                    | Deduplicate only semantically identical options. Preserve purpose definition/subject/role, exact first invocation, prospective transition and finite conditions; different purposes for the same native punch remain distinct. Share identical physical checks before attaching those purposes instead of repeating tool, reach, geometry and recovery work.                 |
| `fitActionCandidates` and `selectDecisionActions`                                    | Preserve the complete-required set or report its owning size/work refusal. Do not silently remove byte-overflowing options, rerun ordinary action relevance after the mandatory first stage, or discard the richer binding when constructing stage-two offers. Keep ordinary optional suggestion behavior separately scoped.                                                 |
| `AiDirector.selectKnownAction` through `commitActorResponse`                         | Carry the chosen option's exact transition, purpose binding, invocation, stop conditions and dependencies to the existing native response admission. A single global replace/enqueue flag cannot replace each option's offered continue/replace/interrupt meaning. Preserve truthful action/plan receipts and ordinary admission refusals.                                   |

Qualify two purposes sharing the same first strike, two supported transitions with different work consequences, and complete-set overflow before dispatch. The [shared-contract qualification](../maintainers/combat-and-threat-responses.md#shared-contract-qualification) also requires ordinary work replacement, optional speech and direct player choices through the same owners. Shared semantic identity and valid physical preparation retain the canonical contracts' scope and lifetime.

If addressed speech and an assault arrive together, retain the permitted speech and available replies in this same threat snapshot. The ordinary addressed-speech route must not replace the selected threat deliberation or purchase another routing gate. The two required calls below are the route's relevance/appraisal and actual-choice calls. Optional recall retains its existing separate accounting; automatic route judgment, another action-attention pass and a fallback generator are not hidden additional stages.

### Stage one: situation relevance and independent appraisals

Reuse the existing Jev batched question transport, Choice question and shared evidence rubric. The current `batchedAttentionQuestions`/`attentionIncludes` route in `apps/server/src/jev-questions.ts` supplies a binary Noul result with a 0.5 inclusion threshold; it cannot represent this route's three relevance meanings and is not the selected decoder for them. Keep ordinary noncombat relevance unchanged. Native feasibility first filters only proven impossibility: missing actor capability, unavailable exact target/subject, absent protected person, unsupported material/control operation or other native refusal. It does not decide whether Ada ought to be angry, whether someone deserves punishment, or whether protection is personally worthwhile.

The first cheap Decision API call is mandatory for this selected threat-response route. Supply one independent `type: choice` question per eligible grounded purpose instance, with its candidate meaning, exact intended opponent/protectee/place and role in the actual instructions and the full shared actor-scoped context. Its criteria use the world's [three relevance meanings](../worlds/base/threat-response-options.md#2-two-decision-stages). Construct the offered handles in this insertion order, also their canonical lexical order: `a_uncertain`, `b_relevant`, `c_irrelevant`. Each criterion carries its full world-authored meaning; these handles are bookkeeping, not the model's explanation of the question. A response handle binds the whole purpose instance and its definition/source revisions; it is not merely a purpose-family ID. Stage two must not expand one approved protectee into every nearby person or substitute a different opponent. Preserve all relevant and uncertain purposes and their selected disposition; a fixed top-N truncation must not silently hide a legitimate response. Existing byte/work limits can refuse an oversized preparation, not misclassify it as irrelevance.

Use the existing shared Choice decoder in `packages/ai/src/validation.ts`: the highest finite offered score selects the handle; the first offered key wins an exact tie. Matching insertion and canonical order keeps direct Jev and Macrofold results consistent. Uncertain wins when it is among the tied maxima; relevant wins a relevant/irrelevant tie above uncertainty. Do not claim every tie becomes uncertain. Preserve the decoder's existing score/confidence handling without normalizing scores, adding a confidence threshold or trusting a separately returned choice label. Missing or invalid required answers retain the existing invalid provider-result disposition; actual service unavailability remains unavailable. Neither is an irrelevant or uncertain purpose. Qualification must carry an explicitly uncertain exact subject/role into stage two, exercise ties through both adapters, and retain ordinary noncombat relevance behavior.

Independent finite appraisal questions share this call and the same source snapshot. Each can choose no change or an exact source-bound supported fear/anger operation, using current feelings plus the new evidence. Do not combine every feeling amount with every purpose/action into a Cartesian product. Native known work—visibility, life checks, movement availability, source eligibility and arithmetic—does not purchase its own relevance call.

Prepare at most one appraisal question and admit at most one appraisal write for each actor, exact definition pin and target-stacking key in this pipeline. For coalesced causes, bind the newest personally eligible relevant occurrence within the captured native sequence, retaining earlier still-relevant occurrences and the existing interpretation as context. Do not manufacture a merged occurrence or let several independent questions replace the same active feeling in response-order sequence. No eligible new cause means only the existing permitted no-change/resolution/reframe choices. This binding rule selects evidence identity, not an intensity or mandatory reaction; every actual source remains retained and newer evidence after the cut remains pending.

After the response, decode through the existing provider boundary; validate handles, values and supplied question coverage. Unknown is not zero and an unavailable/invalid relevance response is not a chosen empty shortlist. Partially unavailable appraisal operations get explicit individual receipts; a valid relevance result can still proceed using the actual unchanged or accepted state. An invalid overall relevance response defers this pipeline; no fabricated shortlist or automatic paid fallback is created.

Before any appraisal effect, recheck actor authority/life, source privacy/revision, current definition pin and supplied record revision through the existing appraisal binding and serialized publication path. Use target-stacking source-bound creation for a genuine new interpretation, retaining predecessor outcomes and original-occurrence deduplication. Existing same-cause reframe cannot change a decaying value or restart its curve. The automatic damage-to-fear producers, including projectile fear, are removed in the same installed-world change; native body effects and immediate urgency remain. Do not run both mechanisms in parallel.

Associate accepted appraisal-operation receipts with this job's exact input cause identities and captured evidence cut. Publication of these operations is an internal result already consumed by stage two, not a new external threat occurrence or a reason to supersede this same pipeline. Intake recognizes those exact receipts/derived cause identities and coalesces them into the current opportunity without buying another relevance/choice pair. Do not suppress an entire event class, every self-authored result, or evidence after the captured cut: a later independent blow, communicated withdrawal or newly crossed subscribed decay/goal-condition boundary remains eligible. In particular, this appraisal feedback guard must not hide a subsequently executed strike, guard, evasion or movement result; the physical outcome is new experienced evidence with the action-result trigger below.

### Stage two: actual personal choice

After stage-one native publication, capture a postcommit snapshot and expected appraisal revisions for stage two. Its own accepted appraisal changes are intentional results to include; they must not make every second stage permanently stale under the old guard. Preserve the original source/privacy/observation bindings, recheck intervening external changes, and update only the dependencies demonstrably changed by this job. Never ignore all actor revisions as a workaround. Reuse immutable catalogue and unchanged source/native preparation through their existing owners. A changed grounded purpose subject or role needs new relevance consideration; ordinary movement within an unchanged meaningful band can retain the purpose while physical reach is checked live.

Prepare the relevant/uncertain purposes' fully grounded compatible action options, reusing the valid prepared native prerequisites and checking changed dependencies. This is deliberate purpose-plus-action composition, not a cross product of unrelated judgments. The second Decision API call chooses **one** complete bound response, explicit continuation/no new action, or an uncertain/deferred outcome through the existing selection semantics. It sees the actual admitted appraisal values, current required context, transition costs, available alternatives, chosen finite limits and temporary blockers. It is not told which response passes an evaluation.

Keep this final selection on the existing independent Noul option ratings and `resolveLevel1` outcome/threshold/tie semantics, with the full prepared binding behind each handle. Do not replace it with one Choice question and thereby impose that question's 255-option ceiling on the retained action set. An uncertain result keeps its existing disposition; this strategy does not automatically escalate it to generated thought or action.

No required generated thought, explanation, new goal or speech accompanies this selection. For a finite speech response, stage two sees and selects the profile's [complete authored utterance](../worlds/base/threat-response-options.md#31-executable-finite-speech-choices), ordinary volume, permitted addressee/audience and exact source/role binding. Its ordinary speech operation requires no third generator call. Speech plus a physical action is offered only when an installed composition already supports the exact lane compatibility, order, costs and partial outcomes; one utterance is otherwise one response. Existing generated conversation/unlisted-action routes remain independently available under their current rules; no automatic third call, generative repair or preset thought is added. A finite catalogue response and a novel generated response are different routes with distinct accounting and admission; selecting the catalogue does not pretend that richer generation ran.

After the wait, recheck the exact actor/control/timeline, current observation/recognition association, sources, method/definition/tool/target life, chosen plan revision and all current physical and selected continuation prerequisites. Lost authority/life, corrected or forgotten supporting evidence, an invalid bound participant, replaced work/definition or a failed actual prerequisite produces the appropriate stale/refused disposition. An unrelated edit or newer additive evidence alone is not another execution veto. Apply the whole-job bounded-refresh rule below, retain later cues and describe the selected response as based on its actual captured snapshot; do not claim it considered later blows. One strike already released or contact already committed follows its actual native owner; an old response cannot cancel or refund it. The native receipt, not the chosen option text, establishes whether the attack began, failed or caused harm.

If stage one committed a private feeling and stage two fails, preserve that independently accepted feeling and both stages' accounting; record that no physical choice was committed. If neither stage ran or returned a valid answer, never report deliberate pacifism, paralysis or indifference. A newly meaningful situation may schedule a fresh decision with new source identity. Repeating the same failed work is not automatically authorized spending.

## Reconsideration, finite continuation and prompt reactions — CTR08

### Subscription ownership and saved state

Extend `ThoughtIntakeInputs`/`ActorWork` and current plan/goal/interest dependency capture. A person's active threat response subscribes only to the relevant observed opponents, protected subject if any, selected target/destination/tool, own body/work, defining terms and deadline. Reuse CTR02's observer-scoped episode index for changes; do not scan every world's pair or poll each record's history. Each transition carries the native source/evidence reference and actor-perspective cause sentence into normal intake.

Save canonical actual plan/invocation bindings and revisions; selected purpose definition pin and source references; target life/observation binding; original anchor and deadline; current frontier and actual result/cost counters; previous meaningful observation band and its pending stabilization time when that affects future delivery; consumed transition/cause identity or watermark; and pending eligible reconsideration evidence under the existing scheduling owner. Persist nothing twice if an existing owner already carries it. Derived subscriptions/indexes are rebuilt from those owners after restore or relevant revision change, without spending, inference or RNG.

Current-format validation checks identities, finite positive selected durations, supported installed conditions, world-relative positions/support, deadlines, private evidence ownership and legal plan/control state. Pausing stops game time; a restore preserves original deadlines and unresolved cues and cancels old-timeline provider work. Rebuilding subscriptions cannot generate an extra attack or replay an acknowledged appraisal. Death, retirement, control transfer and deleted/forgotten evidence release or invalidate the respective subscriptions through their existing owners. Physical consequences already released persist independently.

### Exact meaningful triggers

The [world profile](../worlds/base/threat-response-options.md#5-first-delivery-commitments-and-reconsideration-tuning) owns selected numeric hysteresis/deadlines. The following table owns producer-to-intake behavior. “Immediate” means eligible in the next normal scheduling pass with urgent priority, not a promise of instant provider completion. Native invalidation always occurs at its real boundary independently of paid scheduling.

| Trigger                                 | Native observation/condition                                                                                                         | Scheduling and what remains authoritative                                                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actual new harm                         | Personally experienced new impact/body injury with exact source uncertainty                                                          | Immediate urgent opportunity; retain each distinct cause, coalesce scheduling while busy. The body effect already happened. It can supersede stale same-actor decision context.                                                               |
| New credible attack                     | Newly personally observed directed preparation/attempt/incoming trajectory or another supported threat cue                           | Immediate urgent opportunity using only disclosed source/target facts. Mere selection/hover or a hidden intention is not a trigger.                                                                                                           |
| Opponent leaves relevant reach          | Observed distance exceeds the selected method's actual reach plus the profile hysteresis continuously for its stabilization interval | One fresh opportunity to pursue, hold, withdraw or let go. Native reach checks already prevent remote contact. Do not trigger on every changing distance.                                                                                     |
| Chosen approach enters reach            | A personally observed target crosses into the admitted selected method's reachable band                                              | If an already selected approach-and-one-strike still authorizes that strike, execute normally; otherwise schedule a fresh urgent choice. Never turn mere follow into attack.                                                                  |
| Opponent ceases observed preparation    | The previously observed activity ends/cancels or changes to a non-preparation state and remains changed through stabilization        | One new opportunity with current activity/result evidence. Cancellation is not surrender, friendliness or permission to read a new hidden target.                                                                                             |
| Lost sight                              | Current perception of a relevant target actually ends                                                                                | Sight-dependent native work stops immediately; after short stabilization, coalesce a fresh opportunity with exact last-seen evidence or unknown location. A brief reacquisition coalesces the changed facts without two redundant paid calls. |
| Reacquired sight                        | A still-relevant opponent is newly recognized through current observation rules                                                      | One opportunity if it changes a blocked/searching/withdrawing commitment or supplies new credible danger. Recognition is not recovered by comparing display names.                                                                            |
| Strike/guard/evasion completes or fails | Actual result through action-experience, including miss/block/refusal and remaining recovery                                         | With the initial one-strike template, schedule reconsideration before a second attack. Preserve result memory even if the result does not also create an awareness row. No inferred victory from a selected option.                           |
| Selected recovery ends                  | The real recovery deadline passes while this response was waiting on that capability                                                 | One opportunity from the due queue if still relevant; no all-actor combat polling. A recovered hand is not a standing command to punch.                                                                                                       |
| Route or exact target becomes unusable  | Movement/observation/native prerequisite owner blocks or ends the selected frontier                                                  | Immediate native stop/refusal plus a fresh opportunity describing only what the person can know. Server identity loss does not reveal unseen death or teleportation.                                                                          |
| Pursuit/hold/wait limit reached         | Original selected time or spatial boundary becomes true                                                                              | Stop the dependent native continuation at that boundary, then offer a new decision. No automatic extension or return to home; the larger personal goal remains independently chosen.                                                          |
| Protected person's situation changes    | Actual permitted movement, new injury, disappearance, communicated refusal or other relevant source                                  | Immediate for new danger; otherwise stabilized once. Protection options are rebuilt from reality, never retained against a missing subject or invented consent.                                                                               |
| Own body or means materially changes    | A relevant bodily condition threshold, incapacitation, equipment/custody loss, or exact selected capability changes                  | Native feasibility changes immediately; urgent significant changes enter intake. Do not infer a mandatory flee percentage or emotion from the condition.                                                                                      |
| Purpose/reason changes                  | Actual accepted goal/plan change, relevant received speech or a personally known supporting condition changes                        | One opportunity through existing change-fed attention. Words are attributed testimony; accepting a peace suggestion is still a choice.                                                                                                        |
| Quiet after the exchange                | The person explicitly chose assessment/waiting, or the normal existing quiet opportunity becomes eligible                            | Use the chosen deadline or existing quiet scheduler, not the Command-click grace or a new forever-combat timer. Retained memory and lingering feeling can still affect the next ordinary choice.                                              |

For a range or visibility condition, remember the last emitted stable band and an optional pending candidate band with its first-observed game time. A reversal before stabilization clears that pending transition; it does not erase actual observed evidence or undo native stoppage. A stable transition emits once and advances the band/watermark. A new direct harm/credible attack bypasses this smoothing. Enter/exit thresholds use the same installed reach and geometry owner; cache expiry includes the next deadline even if entity objects did not change.

Keep the typed native occurrence/observation watermark separate from the existing durable actor-evidence intake cursor (`nextId` under EPR05). These identity/sequence namespaces are not interchangeable integers: capture each through its own owner, acknowledge each only through its own receipt, and never advance one using the other. Never acknowledge native evidence beyond its captured sequence, or durable actor intake beyond its captured actor cursor. If a punch is being processed and a withdrawal arrives, acknowledge only the processed snapshot and leave the withdrawal eligible. Coalesce duplicate scheduling wakes, not distinct actual blows or material changes. A budget-exhausted preparation remains incomplete; it must not clear a threat, declare a route unreachable or mark a cue handled. Missing or forgotten evidence never gets reconstructed from omniscient current state.

### Bounded urgent concurrency

**Current baseline:** the director's single global running slot can hold an attacked person's decision behind another actor's provider call. **Selected target:** permit at most two simultaneous immediate decision pipelines per world, at most one pipeline for a particular actor, and at most one ordinary pipeline at a time. The second capacity slot is available for urgent threat response; two urgent pipelines may occupy both slots. This is an initial protected service/concurrency choice, not an animal simulation rule or unlimited parallel cognition. Existing background-maintenance/reflection budgets retain their own owners and do not acquire extra allowances from it.

Keep one existing director/admission coordinator with actor/job-indexed running records and a fair coalescing ready queue. Reuse the current urgency/aging order: urgent or long-waiting eligible work first within available lane eligibility. When two pipelines are active, retain later actors' coalesced cues; do not drop them, launch a third pipeline or cancel an unrelated admitted job to make room. One ordinary job can run alongside one urgent job without freezing the world. Apply the same existing external monetary, request and provider concurrency ceilings; a world-local free slot is not funding or provider capacity.

Each running record owns its stable job ID, actor/life/control/timeline bindings, captured evidence cut, stage, abort controller, exact reservations, retained preparation and completion disposition. Provider callbacks close over that record. Completion/cancellation removes a map entry only if it is still the same actor-and-job record; an old callback cannot delete a replacement run, overwrite another actor's response watcher, clear another actor's preview or release another job's reservation. Stop/control-loss targets the matching actor/job; whole-world teardown cancels every owned record explicitly. Preserve serial native commits and ordinary state revalidation after every wait.

Apply the [shared whole-job lifetime](../../archive/07-technical-architecture/agent-agency-runtime.md#one-lifetime-through-preparation-choice-and-admission) through the current director watcher and original evidence watermark. Its existing single funded refresh covers the initial two-stage attempt and the refreshed attempt together. For this threat consumer, qualify repeated blows during both attempts: every blow is retained, the refresh bound holds, a still-valid independently selected strike can start, and later evidence reaches the next normally admitted opportunity after the current job ends. Contrast additional non-incapacitating blows from the same still-bound assailant with actual authority, source, recognition, life or action invalidity, which must refuse without another paid repair.

The two selected stages remain sequential because choice depends on admitted relevance and interpretation. The original job's admitted allowance covers both planned calls, each reserved through the existing durable accounting owner before dispatch. Accepted first-stage appraisals remain real effects if choice fails. No extra routing/generation call is hidden as preparation, no stage resets the shared refresh allowance, and missing funds defer honestly without an aggression fallback or clock pause.

### Latency and complete-path measurement

Share immutable world catalogue preparation, actor/tool feasibility and current source retrieval inside each valid request scope. Reuse required current observations and cause-bound memory across both stages where their dependencies remain valid; do not retrieve the same history again merely because the second call has a new request ID. Hydrate only selected actor-permitted optional records. Retain each job's own immutable prepared data across awaits rather than depending on a single mutable “latest context” cache that concurrent actors overwrite.

Measure perception-to-enqueue, queue wait, native/source preparation, first provider stage, appraisal admission, option binding, second provider stage, final native admission and first visible physical response separately. Record cold versus warm preparation, repeated hits, two unrelated simultaneous actors, a long ordinary generation beside urgent combat, provider cancellation/failure and dense visible threats. Count candidates visited, exact checks, source rows/bytes and every paid call, including calls that selected continuation or were superseded. Report precise cumulative Jev cost and unavailable billing separately. Two short calls are an architectural choice, not evidence that the route is already fast.

No host pause, tactical slow motion, free reflex counterattack or invisible catch-up movement compensates for provider delay. The selected design must preserve playable native input and ongoing physics while waiting. Initial optimization targets and measured release timing belong with CTR10's actual offered model/service workload; a failed performance comparison remains open work, not a claim that asynchronous code is fast.

## Independent character acceptance — CTR10

Begin this qualification at the first complete person-response path under the [CTR10 delivery sequence](../maintainers/combat-and-threat-responses.md), before unrelated breadth; final integration retains all acceptance below. The same sequence places a real hunt-to-meal check at the first complete grounded-animal path. These are the existing qualification gates brought forward, not additional test programmes.

The required ordinary Ada outcome is an **actually admitted and started physical counterattack chosen by Ada**, not merely a relevant option, hostile language, model intent or imposed script. The exact target-bound strike must enter native preparation/wind-up or contact with its authoritative action receipt; approach alone does not pass. Use the actual installed world profile, real perception, complete identity, ordinary two-stage selection and normal command path. In the baseline setup, the attacker delivers one ordinary punch at a legal starting separation of 1 m, then remains at that observable, reachable position in an open area; both bodies begin able to act and Ada has the granted selected method. The moving variant starts with an ordinary admitted nearby movement whose destination keeps the attacker visible and reachable by a supported approach; do not stop, redirect or teleport Ada after the hit to obtain the desired choice. A voluntary continuation away is evidence of her choice and can fail this baseline. Observe at most 900 game seconds from the personally experienced hit (15 normal-speed seconds at 60:1). Ada must start the native counterattack within that window. This is a declared product acceptance window, not a guaranteed provider latency. The setup qualifies her choice independently of an impossible intercept; it is not evidence about catching a running opponent. Separately qualify ordinary real-time punch-and-run behavior without holding the target still or stopping the clock.

Before paid execution, fix a small finite baseline suite and funding under the verification owner. The selected suite is twelve ordinary baseline runs: idle, moving and doing actual interruptible work, each with two permitted starting equipment contexts (unarmed and an ordinary usable melee method), repeated twice with independently scheduled normal choices. Every run retains the exact initial profile, delivered evidence, options, relevance/selection results, actual action receipts, latency and cost. **All twelve must start a native counterattack**; do not reroll failures or average them away with fluent speeches. This is an explicit first-delivery acceptance sample, not a statistical guarantee about all future model outputs.

Use separate counterfactual controls for anonymous/unseen source, target fleeing before range, blocked route, incapacitated body, credible overwhelming danger, a different coherent personality, an endangered third person, current non-interruptible/spent work and a provider outage. Their acceptance is truthful context, complete feasible choices and permitted physical outcomes; no impossible strike is demanded. Counterfactuals must not be substituted into or used to relax the ordinary Ada baseline. Verify that removing/changing the name while retaining the same relevant character/world data leaves the native mechanism identical, and that changing a meaningful disposition/evidence can lead to a different independent choice without code changes.

Diagnosis proceeds cause delivery → required context → complete availability/control meaning → relevance stage → appraisal and actual intensity → final choice → native admission → physical result → next trigger. Retain each failed boundary separately. Fix a missing context/action/wake in its general owner before adding more personality wording. If coherent disposition changes are tested, identify them as alternative authored profiles; never disguise a conditional response command as biography or omit valid withdrawal options until a desired answer wins. A model-directed diagnostic strike can verify the mechanical path only.

Native/fixture qualification also covers private known/unknown target attribution, two-stage stale races, rejected appraisal with valid relevance, first-stage success/second-stage failure, repeated/cold-source deduplication, failed prospective interruption with no costs, full current-format restore, the two-pipeline actor/job isolation races and cue coalescing without lost evidence. No such runtime, browser, live-provider or enjoyment evidence is produced by this documentation task; all of these exits remain open in the tracker.

## Open decisions and intentional limits

The owner has selected preserving Ada’s current personality with the failed counterattack gate explicitly open. No stronger general temperament is installed. Remaining implementation and qualification continue in the agreed phase order. Numerical animal/response/UI values are selected initial world tuning and must be evaluated, not rediscovered by an implementer. Reliability, latency, scale and fun remain acceptance work, not unspecified design choices.

Later owner decisions remain explicit and do not block this slice: richer material destruction/penetration; additional animal ecology/cognition; long-term relationship and legal consequences; broader indirect hazards/background conflict fairness; explicit repeat-attack or team tactics; and any expansion of the initial perception or locomotion capabilities. The selected no-PvP-enrollment rule is settled for this world, not deferred back to those later questions.

If a required native condition or supported API cannot implement the exact declared behavior, record the concrete missing computation in CTR's owning module and add the smallest compatible capability. Do not silently narrow coverage, force Ada, drop dangers, substitute an automatic reflex or mark the module complete from a fixture. Implementation and runtime qualification remain open in the tracker.

## Maintained records

- Implementation and acceptance state: [Combat and threat responses](../maintainers/combat-and-threat-responses.md).
- Limits: [Combat/threat](../limits/combat-and-threat-responses.md), [base world](../limits/base-world.md), [ranged/evasion](../limits/parallel-batch-06-rivals-and-contested-ground.md), and [interface](../limits/ui-ux.md).
- Player behavior and scope: [Feature specification](combat-and-threat-responses-feature-spec.md).
- Shared contracts: [Engine/world boundaries](../engine-and-world-boundaries.md), [targeted actions](../targeted-actions.md), [spatial world](../spatial-world.md), and [save/load](../save-and-load.md).

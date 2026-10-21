# Physical sound and acoustic stealth work

## Status and ownership

**Selected design complete; runtime implementation and qualification have not started.** ACS00 records the source-grounded design and repertoire review. ACS01–ACS08 are the remaining implementation, integration and acceptance work. This assignment is documentation only: no application code, executable tests, migrations, runtime measurements or player sessions were performed.

The [feature specification](../projects/acoustic-stealth-feature-spec.md) owns player/NPC/native behavior and the compared scenarios. The [technical design](../projects/acoustic-stealth-tech-design.md) owns contracts, exact integration points, algorithms, simulator ordering and verification cases. [Physical sound](../worlds/base/physical-sound.md) owns selected base-world emission, movement and received-signal policies; [the acoustic inventory](../limits/acoustic-stealth.md) owns their bounds, tradeoffs and overflow. Unchanged speech levels, intelligibility and current geometry remain under [hearing and speech](../hearing-and-speech.md) and [its limits](../limits/hearing-and-speech.md). Do not copy policy schemas, numeric tables or complete verification matrices into this tracker.

The shared [SC01–SC14 contracts](../projects/stealth-awareness-tech-design.md#shared-contracts) and [SAD-C / SAI-C coordination](stealth-awareness.md) remain authoritative. ACS IDs are local to this acoustic tracker; existing action-capability task IDs retain their owner. Module C supplies real emissions, physical reception and supported features/location uncertainty. Module A owns detection/accumulation, classification, recognition, association and retained observer facts. E owns chosen attention/investigation and native response; F owns warning/preparedness and surprise; D owns emotion and startle effects; G owns controls and authorized presentation. Acoustic delivery extends existing owners rather than introducing a footstep detector, second hearing engine, separate animal fleeing process or AI request for every sound.

## Source baseline, dependencies and design disposition

The exact source base is `Macrofold/OpenLegend:codex/design-stealth-00-contracts` at `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. The acoustic branch is `codex/design-stealth-04-acoustics`, created from that tip. Read module A at the completed `codex/design-stealth-01-perception` commit `40805523c4a19ab7c6cc455d49d51e4a122ecae0`: [feature][a-feature], [technical design][a-tech], [world recognition policy][a-policy] and [PP00–PP07 tracker][a-work]. These pinned references are design dependencies, not claims that A's runtime or branch was merged here.

The available vision boundary is [SC06](../projects/stealth-awareness-tech-design.md#sc06--one-accepted-pose-and-physical-action-owner) and [SC07](../projects/stealth-awareness-tech-design.md#sc07--physical-channels-and-prompt-cues). Specialist vision work is neither awaited nor merged. Before implementation, reconcile any subsequently completed B design against those shared physical pose, receiver-transform, clearance and temporal-invalidation meanings. Recheck callers that changed after the pinned source; a later implementation base must not be assumed identical.

**SA-D02 is an implementation gate, not an unresolved acoustic product choice.** Module A's [source-revision proposal][sa-d02] identifies SC02's conceptual numeric revision versus existing personal-source string digests. The shared owner must adopt an exact family-specific representation or provide an equally exact alternative before dependent representation work in PP01 and ACS01/ACS04/ACS06. Preserve the source kind and its real owning revision; do not coerce a digest, invent a universal counter or announce adoption from this specialist branch. Independent design and unaffected work do not wait for the gate. SA-D01's controlled-character psychological fear producer is outside this feature.

This design completes only the physical-sound/quiet-movement and generalized-hearing portions of [ND13](needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization), [ND16](needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) and SAD-C. Broader controls, communication, attention, emotional behavior, surprise, hearing media and final shared integration retain their open owners.

- [EPR](events-perception-and-reactions.md), [PP01–PP06][a-work] and [SPK](speech-and-social-perception.md) retain acquisition, recognition, speech/addressing, experience and memory responsibilities. Acoustic tasks integrate their supported inputs and consumers without duplicating their delivery checklists.
- [HE01–HE05](hearing-and-speech.md) retain delivered speech/caption/history foundations and outstanding hearing qualification. This design changes selected physical-sound scope, not historical runtime evidence or unchanged speech thresholds.
- [CTR](combat-and-threat-responses.md) retains the existing native response/controller, contact and combat foundations. [Animal sound responses](../worlds/base/animal-sound-responses.md) owns the selected sound intake policy; acoustic integration does not claim that the existing controller itself is absent.
- [Action capabilities](action-capabilities.md), [spatial work](spatial-world.md), [simulation time](simulation-time.md), [save/load](save-and-load.md), [native/performance work](performance.md) and the shared A–G implementation graph retain their existing owners. New fields begin current-format persistence in their first implementation slice.
- `codex/design-stealth-05-attention` receives permitted anonymous sound evidence and meaningful-change notifications for choosing investigation or no action. `codex/design-stealth-06-surprise` receives already-acquired evidence with immutable time/support for deciding whether it warns the actual victim. Neither receives a hidden emitter target from C.

## Delivery order and completion boundaries

Dependencies below refer to the narrow implemented interface each slice needs, not reciprocal completion of entire sibling projects. Safe projection and current-format persistence accompany the first source; they are not postponed until a final polish phase.

| Work | Status | Dependencies | Completion boundary |
| --- | --- | --- | --- |
| ACS00 | Completed — design only | Exact common source; completed A design; shared B/C boundaries | Selected pair, policy, limits, source/scenario/repertoire review and scoped handoffs. |
| ACS01 | Not started | ACS00; SAI-C interface review; PP01–PP02 acquisition contract; SA-D02 for dependent representation | One physical occurrence/hearing path with memory-independent receiver eligibility and exact owner revisions. |
| ACS02 | Not started | ACS01; joint B/C SC06–SC07 pose contract; existing action/motion owners | Admitted quiet gait/posture and body-appropriate contact emissions from actual traversal. |
| ACS03 | Not started | ACS01; each supported activity's real occurrence/lifecycle owner | Other physical producers, persistent intervals and simultaneous sound/masking without synthetic duration. |
| ACS04 | Not started | ACS01–ACS03 supported inputs; PP01–PP04; relevant SPK interfaces | Received features, location uncertainty, classification/recognition and speech semantics compose end to end. |
| ACS05 | Not started | Actual ACS02–ACS04 reception; shared native controller; applicable E/F interfaces | Eligible animal responses and voluntary attention/warning consumers use the same evidence. |
| ACS06 | Not started | Starts with ACS01; A's PP06 and G projection; completes across ACS01–ACS05 | Current-format restore, invalidation and every public/actor projection preserve the admitted meaning. |
| ACS07 | Not started | Staged with ACS01–ACS06; complete producer and consumer callers | Mechanical, ordering, disclosure, recovery and full-path workload evidence on the implemented tree. |
| ACS08 | Not started | Relevant ACS02–ACS07 delivery; ordinary G controls and applicable E behavior | Uncoached play demonstrates useful decisions and acceptable burden; tuning changes follow their policy owner. |

## ACS00 — Complete the selected design and source-grounded review

**Completed — design only, 2026-10-21.**

- [x] Inspect required repository/design/documentation guidance, common contracts, the completed A design and available vision boundaries.
- [x] Trace current hearing/speech, actual action/movement/pose, event observation, native animal response, clock, dependency and persistence owners; distinguish delivered foundations from absent physical emissions.
- [x] Define one reusable source/reception path, body-aware physical contacts, permitted C→A evidence, deterministic ordering, meaningful invalidation and bounded complete work.
- [x] Compare quiet hare approach, armored pursuit, sound behind a wall, mistaken footsteps, a familiar unseen voice, simultaneous sources, dense animals and fleeing prey on noisy terrain.
- [x] Review all 42 repertoire files in context and improve the focused opportunities recorded below while preserving existing IDs, priority metadata and source provenance.
- [x] Record implementation slices, future verification, current-format lifecycle, cross-module interfaces, selected limits and the SA-D02 implementation dependency.

**Exit:** the selected acoustic design is concrete enough for implementation against its owning contracts. None of these checks establishes runtime correctness, physiological calibration, capacity, usability or enjoyment. Final branch/doc/link review and the pushed commit are delivery evidence for this documentation assignment; ACS01–ACS08 remain open.

## ACS01 — Shared physical sources and memory-independent hearing

**Primary integration:** existing `acoustics.ts`, `perception.ts`, `speech.ts`, `events.ts`, `event-observation.ts`, selected world definitions and their validators.

- [ ] Extend the existing installed acoustic/source and receiver families with the technical design's exact occurrence, physical origin, performer/cause distinction, real timestamp/interval, sound properties and dependency pins. Update strict definition validation, construction and current-format encoding together.
- [ ] Generalize current physical level/reach/geometry evaluation without duplicating the engine. Preserve speech's existing occurrence/word owner and the clear-speech meaning of `hearsEntity`; a clang is not an utterance with empty text.
- [ ] Decouple physical receiver discovery and compact native acquisition from autobiographical memory. Apply exact body life, participation, hearing capability and current awake/alive eligibility before acquisition; do not enable separately deferred sound waking accidentally.
- [ ] Prepare conservative source/receiver indexes once per valid phase, with exact fallback on cache overflow. Key geometric transfer by the actual emitted origin and receiver geometry, not merely a causal entity ID.
- [ ] Admit detached impacts through their actual surviving physical source even if the performer died or left. Keep private source/cause/position proof outside recipient-facing evidence.
- [ ] Route completed physical samples into A's single acquisition boundary and distinguish completed negative, unsupported and incomplete results. Resolve SA-D02 before dependent revision adapters; never use later storage insertion as the original hearing time.

**Exit:** an existing utterance and a supported nonlinguistic occurrence reach eligible humans and memoryless native animals through the same physical owner, with exact provenance and no duplicated observation.

## ACS02 — Admitted posture, quiet gait and actual contacts

**Primary integration:** `spatial-state.ts`, `kernel.ts` movement/action owners, base action/body definitions, `motion-boundaries.ts`, `temporal-boundaries.ts` and B's accepted pose.

- [ ] Install the selected supported posture/gait definitions through ordinary action admission. Validate the resulting body, support, clearance and equipped attachments before a posture transition; a refused stand changes no pose, resources, contact phase or random state.
- [ ] Reconcile movement speed, route availability, body/receiver origins, prediction and held-action constraints through one owner. Independent supported looking and posture compose with movement; camera or animation updates are not physical writers.
- [ ] Generate contacts from accepted path segments, their actual distance/time and support/material crossings. Cover ordinary travel, follow, evasion, native wander/escape and supported landings. Attempted budget, blocked remainder, editor relocation, teleportation, endpoint chord distance and render ticks create no steps.
- [ ] Retain gait/contact phase by exact body life across compatible interruptions, partitioned native intervals and save/reload. Preserve existing movement-fidelity progress as a separate quantity.
- [ ] Resolve species/body contact patterns, actual posture/gait, terrain/material and equipment contributions from authored supported data. Prepare carrier equipment through custody/attachment invalidation rather than scanning inventories or world objects for every contact.
- [ ] Integrate the selected ordinary-cadence weak-cue example with A's accumulator and its real decay/correlation window. Quiet movement changes speed/contact properties without unconditional silence, invisibility, a universal stealth score or an unsupported fatigue mechanic.

**Exit:** the quiet hare approach and noisy armored pursuit differ for legible physical reasons; equivalent actual traversal produces equivalent contact occurrences despite command/simulation partitioning.

## ACS03 — Other producers, persistent sources and simultaneous sound

**Primary integration:** actual strike/contact, projectile, flight/landing, working/activity and installed environmental producer owners, plus shared native interval selection.

- [ ] Attach the designed source adapter to real supported impacts, equipment movement, foliage contact and work occurrences. Specify unsupported breaking/destruction instances honestly instead of introducing a full damage/physics subsystem by implication.
- [ ] Install persistent producer start/change/stop and finite pulse spans with their own committed lifecycle and meaningful boundaries. Do not convert speech captions, provider tokens, text length, rendering or ordinary publication delay into physical sound duration.
- [ ] Collect the complete source batch and synchronized receiver state at the agreed simulator boundary. Settle the old interval before changed policy/geometry/producer state applies, preserving half-open endpoints and the declared same-time phase order.
- [ ] Mix actually overlapping sound in linear energy under the selected policy, excluding the candidate's own contribution where required. Preserve distinct consequential occurrences while sharing valid listener-local masking work and uncertainty.
- [ ] Retain all contributing weak maskers under conservative bounds; a fixed loudest-N list or late source cannot erase a legitimate earlier cue. Moving sources/receivers and entry/exit boundaries must produce actual covered intervals.
- [ ] Use existing required-work continuations, allowances and owed-time/backpressure. If exact work cannot finish, hold dependent progress or apply the specified coherent failure boundary; incomplete work is not silence and legitimate recipients are not truncated.

**Exit:** a physical impact, an active work/environment source and a moving group can overlap coherently without a separate per-frame all-pairs propagation loop.

## ACS04 — Perception, voice and observer-safe interpretation

**Primary integration:** A's received-feature/acquisition/retention interfaces, existing speech evidence, identity, knowledge, personal experience and all explicit evidence projections.

- [ ] Supply A only supported received feature intervals, physical level/clarity/fidelity, exact occurrence/coverage support, original observer-relative bearing and justified location uncertainty. Preserve a missing or ambiguous location without a hidden point alongside it.
- [ ] Keep detection, classification, individual recognition and name knowledge separate. Source-kind hypotheses consume received discriminants, not private action names, species IDs, inventory or true emitter type. Footsteps must be able to remain ambiguous or be mistaken for another supported source.
- [ ] Integrate received voice fidelity with A's familiarity-plus-Perception law. Preserve existing word/intelligibility thresholds and speech propagation ownership; recognized voice does not refresh unseen body, equipment or exact location.
- [ ] Preserve one original utterance/sample root, continuous-source covered intervals and A's deterministic weak/pattern receipts. Repeated projections and duplicate reaction requests do not add recognition credit; hidden emitter equality alone cannot group ambiguous cues.
- [ ] Carry source-local anonymous subjects, exact role/time and A's facet ordering through speech/awareness, cold hydration, history, context and consolidation. A proper name or canonical association requires its owning evidence; an audible name remains a claim.
- [ ] Finalize discrete cue freshness and persistent live-lease loss correctly. Continued readability or retained correlation is not current physical permission; later turning cannot rotate an old observer-relative bearing.

**Exit:** a familiar unseen speaker can be recognized under A's policy without exact localization, and an unknown or misclassified physical sound stays useful without leaking its actual source.

## ACS05 — Native animal, attention and surprise consumers

**Primary integration:** existing `native-response-controller.ts`, refuge/navigation owners, native reception policy, E's ordinary work intake and F's actual-victim evidence cuts.

- [ ] Add the compact permitted acoustic intake to the existing native controller and selected species bindings. Keep independent recipients, current eligibility, cause/repetition support and actual route/refuge constraints; no human memory or provider call is required for the animal.
- [ ] Apply the physical-sound-specific eligibility policy so ordinary herd contacts do not automatically create a self-sustaining universal alarm cascade. Any secondary alarm/movement is a new actual producer that other bodies must independently receive.
- [ ] Suppress redundant response/intake work by the exact permitted cause/pattern and meaningful change rules while preserving distinct consequences and occurrences. Expired or invalid support cannot keep a response eligible after restore.
- [ ] Hand E a permitted historical bearing/region, quality and relevant change, allowing ignore, listen, investigate or another ordinary choice. Do not force every person to turn or route them to a live hidden entity.
- [ ] Hand F already-acquired facts and immutable support before its dependent cut. Preserve warning just before an attack, incomplete required work, nested callbacks and the exclusion of the same impact as its own advance warning.
- [ ] Leave fear/startle mechanics to D. Interruption, route failure, native settling and optional reasoning use their existing action/controller owners rather than another fleeing or emotional process.

**Exit:** the hare's response, a person's possible investigation and possible warning all use the same admitted hearing while retaining their separate decision owners.

## ACS06 — Current-format persistence, invalidation and privacy

**Primary integration:** existing source/body/activity encoders and validators; A's PP06; personal accounts, memory hydration, snapshots/patches/history and G's presentation.

- [ ] Save exact physical source/life, instantiated profiles, contact phase, producer state, consumed interval/sample roots, current policy pins and absolute simulation deadlines through their existing owners. Implement the current format together; add no legacy compatibility store or parallel acoustic autobiography.
- [ ] Restore without replaying old utterances/contacts, rerolling profiles or masks, accruing downtime hearing, resetting weak-learning eligibility, extending controller deadlines or attaching an old source life to a replacement body.
- [ ] Rebuild derived indexes from saved authority without acquiring evidence. Complete native cold working sets before dependent cuts; historical source facts can survive the emitter's later removal.
- [ ] Reconcile explicit dependency writers and draft-audit coverage for pose, material, equipment/containment, producer state, hearing capability, source/receiver motion, geometry, background and policy. Settle old intervals first; unknown coverage conservatively rebuilds. Recognition/name edits invalidate interpretation without needlessly repeating unchanged propagation.
- [ ] Preserve normal-speed authoring and one shared clock conversion across pause, 1×/3×/8×, deadlines and saves. No wall-time hearing loop, provider timing or offline catch-up may change the physical result.
- [ ] Qualify recipient privacy through native/controller payloads, NPC context, memory, events, captions, source links, client audio position, map/target affordances and creator-to-player transitions. Fence late reads/assets and scope changes; unknown sources cannot regain identity or a hidden exact position through another surface.

**Exit:** every new saved and projected field preserves the same original occurrence, admitted evidence and eligibility through lifecycle changes; no read path becomes a second sensor.

## ACS07 — Whole-caller correctness, ordering and scale qualification

**No case below has been executed for this design.** Use the technical design's exact cases and expected outputs as the single verification matrix; record future actual results under the existing [verification convention](../verification.md).

- [ ] Qualify complete native callers for split/unsplit paths, turns, heterogeneous terrain, blocked partial movement, zero travel, posture refusal, mid-stride save, bodies with different contacts and detached impacts.
- [ ] Qualify synchronized movement/receivers, simultaneous pulses, persistent source endpoints, many individually weak maskers, old/new dependency neighborhoods and stable equal-time ordering. Match original occurrence, acquired prefix and eventual response across pause/rate/save variants.
- [ ] Qualify all physical receiver gates, memoryless animals, anonymous/ambiguous patterns, familiar voice without a precise position, independent speech content/identity, source revocation and actual-victim cuts. Include the fleeing creature on noisy terrain and dense groups without omniscient or recursive group response.
- [ ] Measure the complete native/server/persistence/projection callers with living density separate from inert world size and retained history. Include cold restore, warm unchanged views, many moving emitters/receivers, concentrated posture/equipment/geometry changes, persistent sources and simultaneous consequential events.
- [ ] Report candidates visited, exact transfer evaluations, source/mixing work, retained state/bytes, required continuation/queue age, native advanced versus requested time, debt, storage work and whole-path latency. A bounded return list or helper microbenchmark does not qualify preparation, fan-out or persistence.
- [ ] Exercise exhausted allowance and incomplete preparation without dropping quiet listeners, inventing negative evidence, duplicating events or advancing a dependent outcome prematurely. Verify no per-frame N² propagation pass or parallel native scheduler.
- [ ] Reconcile actual runtime/limit evidence with ACS01–ACS06, A/G and HE05/CTR/SPK gates. Keep historical evidence pinned to its measured tree/workload; do not close broader owners from one acoustic scenario.

**Exit:** the selected composed behavior is mechanically and operationally qualified on real callers, with remaining workload or platform gaps stated explicitly.

## ACS08 — Uncoached play, usefulness and balance

- [ ] Observe an uncoached player approach a hare, then compare a noisy armored pursuit using ordinary controls. Record whether footing, pace, posture, load and route lead to understandable choices and whether success/recovery are enjoyable.
- [ ] Compare the complete quiet-route burden with already useful alternatives: a longer soft route, a shot from farther away, leaving equipment behind, continuing ordinary travel or abandoning the hunt. Include actual clock time, controls and consequences; a correct noise calculation alone does not establish value.
- [ ] Observe useful uncertainty in a sound behind a wall, a mistaken footstep interpretation and a familiar unseen voice. Record whether the player can act on a rough clue without a precise marker, compulsory note-taking or repeated confirmations.
- [ ] Observe multiple sources, dense wildlife and a fleeing creature crossing noisy terrain. Check that renewed clues, masking and independent reactions create opportunities without unreadable spam, tedious listening or obligatory chase loops.
- [ ] Exercise ordinary non-stealth benefits: secure quieter cargo, fit equipment, listen to work/music, or carry the chiming prize home. Preserve the reward and social meanings of sound alongside its hazards.
- [ ] Distinguish mechanical evidence, engineer-assessed utility, uncoached comprehension/enjoyment and balance. Change selected tuning only through the physical-sound/perception owners and linked inventories, retaining the reason and measured consequences.

**Exit:** players find worthwhile choices and recoverable uncertainty in the selected scenarios, with an acceptable ordinary-play burden. Remaining balance or accessibility limitations stay open even if all mechanical cases pass.

## Repertoire review and selected improvements

All **42 files under `docs/repertoires/`** were reviewed at the exact common base: catalog scope/structure, relevant entries and surrounding sections, all 25 combination scenes, four optional world profiles and supporting provenance/index files. This is a contextual design review, not a reread of every unrelated proposal or every historical source cited in the study ledgers.

Nine topical files contain fourteen revised existing entries, four introductory/link passages and one existing combination paragraph. IDs, ordering, worlds, use/priority/level fields, sources and scene headings are preserved. AP-044 alone changes its title from “Silent armor movement” to “Quiet armor movement.” No catalog entries were added.

| Changed repertoire | Relevant entries | Preserved opportunity and selected clarification |
| --- | --- | --- |
| [Abilities/progression](../repertoires/abilities-progression.md) | AP-022, AP-044 | Footing, route/range and patient wind-aware positioning compete with gear and time. Skill reduces avoidable armor rattle; acoustics/perception own sound/detection, Combat hunting/tactical use. |
| [Actions](../repertoires/actions.md) | REL-12, OBS-02, COM-08 | Actual admitted travel changes contacts; only supported channels respond to wind. Rhythms can remain ambiguously footsteps or machinery, and an agreed knock pattern does not prove identity or compel a turn. |
| [Adventure/discovery](../repertoires/adventure-discovery.md) | AD-046, AD-051 | Quiet-route/load choices support a real household hunt. A wounded quarry's new rustles can guide a listening/vantage choice while it seeks refuge; old sight is not live tracking. |
| [Bodies/species](../repertoires/bodies-species.md) | BSP-260; movement anatomy | Contact patterns fit walking, hopping, crawling or wing motion. The fleeing hare produces its own incomplete clues; native response remains a separate owner. |
| [Ecology/weather](../repertoires/ecology-weather.md) | ECW-027, ECW-102 | Seasonal waterfowl mask one another and receive alarms independently. Scree changes footing and sound for walkers or fleeing prey, including the route later travelers inherit. |
| [Materials/resources](../repertoires/materials-resources.md) | MAT-049, MAT-255 | Felt lining reduces supported rattle using space/fitting. Hobnails trade hard-surface quietness for traction; neither choice grants universal safety or silence. |
| [Objects](../repertoires/objects.md) | ITEM-231 | The actual jostled clapper makes carrying, securing, help and loot choices matter; its sound can celebrate the prize at home. |
| [Work/crafting](../repertoires/work-crafting.md) | WORK-084 | Compatible armor fit can reduce avoidable rattle while preserving coverage and real carried weight. |
| [Combinations](../repertoires/combinations.md) | “The quarry that learns” | The quarry's brush/scree sounds can renew a broad clue or disturb wildlife; listening, changing vantage and accepting escape remain choices. All 25 scene purposes remain. |

The other **33 files** are explicitly retained below. Grouping reflects their common disposition, not omitted review.

| Retained files | Reviewed relationship and reason to retain |
| --- | --- |
| [arts-leisure.md](../repertoires/arts-leisure.md), [languages-knowledge.md](../repertoires/languages-knowledge.md), [relationships.md](../repertoires/relationships.md), [needs.md](../repertoires/needs.md) | ARL-006/217/245, LKN-071/225/274, RSH-026/230/295 and ND-061/064/071 already connect sound, different bodies, voices, dated knowledge, companionship and sensory comfort. These purposes need no stealth-first rewrite or duplicate recognition rule. |
| [mechanics.md](../repertoires/mechanics.md), [psychology-behavior.md](../repertoires/psychology-behavior.md), [history-myth.md](../repertoires/history-myth.md), [traits.md](../repertoires/traits.md) | MEC-046/087/094/095/204 already cover rhythms, silence, decoys and fast/quiet choices; PB-002/010/083/241/325, HMY-086/124/145 and TR-145 preserve fallible interpretation, habituation, curiosity, historical meaning and patient conduct. No new stealth score or automatic emotion. |
| [combat-rescue.md](../repertoires/combat-rescue.md), [diplomacy-conflict.md](../repertoires/diplomacy-conflict.md), [institutions-politics.md](../repertoires/institutions-politics.md) | CR-077/079/084/168/256, DIP-021 and INS-173 already distinguish local cues, warnings, rescue, evidence and institutional authority. Combat and political response do not own physical hearing; institutional “hearings” do not justify acoustic edits. |
| [technology.md](../repertoires/technology.md), [magic.md](../repertoires/magic.md), [unusual-realities.md](../repertoires/unusual-realities.md) | TE-066/123/153/158/160/189/190/253/275, MG-025/035/122/123/253/285 and UNR-024/062/063/067/134 preserve directional/assistive sensing, tactile media, decoys, recording, hushing and alternate world laws. These remain explicitly supported extensions, not accidental initial implementation promises. |
| [settlements-architecture.md](../repertoires/settlements-architecture.md), [economy-logistics.md](../repertoires/economy-logistics.md) | ARC-006/014/058/179/239 already support spatial sound and overhearing; ECON-250 already makes quiet packing/cargo a useful service. Do not duplicate those entries or require detailed room simulation. |
| [automation-creators.md](../repertoires/automation-creators.md), [simulation-experiments.md](../repertoires/simulation-experiments.md) | ACR-093/147/151/271 separate sensing, automation purpose and action; SIM-072/094/149/206 already propose discriminating multimodal/silence/simultaneous-source comparisons. Their proposals are not measured results. |
| [characters-backstories.md](../repertoires/characters-backstories.md), [faith-ritual.md](../repertoires/faith-ritual.md) | CB-003/088/169/277 and FTH-046/227 give hunting, familiar gait, acoustic restoration, vigilance and a newly quiet place personal meaning. Biography or belief grants no mechanical identity/detection authority. |
| [README.md](../repertoires/README.md), [coverage.md](../repertoires/coverage.md), [design-foundation.md](../repertoires/design-foundation.md), [gameplay-priorities.md](../repertoires/gameplay-priorities.md), [selection-and-scale.md](../repertoires/selection-and-scale.md) | Whole-game priorities, existing counts and ownership remain useful. Shared SAD-I owns broad navigation/coverage/priority reconciliation after all specialists; acoustic design does not replace survival, camp, invention, cooperation or a persistent cast. |
| [source-atlas.md](../repertoires/source-atlas.md), [group-3-reading-progress.md](../repertoires/group-3-reading-progress.md), [group-6-reading-progress.md](../repertoires/group-6-reading-progress.md), [group-7-research-progress.md](../repertoires/group-7-research-progress.md) | Reviewed as supporting provenance and source-study ledgers. Historical read/checkmark state is unchanged; no original-source reread or new external research is claimed. |
| [worlds/living-fantasy.md](../repertoires/worlds/living-fantasy.md), [worlds/medieval-survival.md](../repertoires/worlds/medieval-survival.md), [worlds/modern-life.md](../repertoires/worlds/modern-life.md), [worlds/planetary-scifi.md](../repertoires/worlds/planetary-scifi.md) | All four remain optional profiles. Fantasy hearing accommodation and bounded charms, medieval hunting/households, modern rehearsal/nightlife/quiet needs, and sci-fi Hushmesh/body/sensor differences retain their scope. No new lore, space-audio rule or world adoption follows from this review. |

**Shared-integration follow-through:** SAD-I reconciles the central navigation, coverage and priorities when the A–G designs are combined. Preserve the reviewed source ledgers and optional profiles unless that integration makes a specific authored choice. This review closes the acoustic repertoire-design slice, not the broad shared reconciliation.

## Handoff and evidence requirements

ACS00 evidence consists of pinned source/design reading, documented scenario comparisons and static documentation review. **Executable tests, runtime play, performance, browser/provider behavior, balance and uncoached enjoyment were not exercised.** Every corresponding task above remains unchecked.

Before implementing, read the paired design, installed physical-sound policy, acoustic inventory and pinned A contracts together; recheck the actual code base and shared SA-D02 disposition. Implement a useful complete producer→physical reception→A evidence→consumer→safe projection slice. Record later results with the real revision, workload, source/receiver populations, clock settings and evidence limitations. Do not infer full delivery from new types, helpers or a single scripted hare encounter.

## Maintained records

- Product behavior and scenarios: [acoustic feature specification](../projects/acoustic-stealth-feature-spec.md).
- Technical contracts and verification cases: [acoustic technical design](../projects/acoustic-stealth-tech-design.md).
- Selected world behavior: [physical sound](../worlds/base/physical-sound.md), [animal sound responses](../worlds/base/animal-sound-responses.md), [A recognition policy][a-policy].
- Limits: [acoustic inventory](../limits/acoustic-stealth.md), unchanged [hearing inventory](../limits/hearing-and-speech.md), shared [stealth inventory](../limits/stealth-awareness.md).
- Cross-project work: [SAD-C / SAI-C / SAD-I](stealth-awareness.md), [PP00–PP07][a-work], [SPK](speech-and-social-perception.md), [HE](hearing-and-speech.md), [CTR](combat-and-threat-responses.md).
- Shared representation dependency: [SA-D02][sa-d02].

[a-feature]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-feature-spec.md
[a-tech]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md
[a-policy]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/worlds/base/perception-recognition.md
[a-work]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/maintainers/perspective-perception.md
[sa-d02]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/archive/05-project/open-decisions.md#sa-d02--evidence-source-revision-representation


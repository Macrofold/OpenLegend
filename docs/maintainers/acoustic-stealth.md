# Physical sound and acoustic stealth work

## Status and ownership

**Selected design complete; runtime implementation and qualification have not started.** ACS00 records the source-grounded design and repertoire review. ACS01–ACS08 are the remaining implementation, integration and acceptance work. This assignment is documentation only: no application code, executable tests, migrations, runtime measurements or player sessions were performed.

The [feature specification](../projects/acoustic-stealth-feature-spec.md) owns player/NPC/native behavior and the compared scenarios. The [technical design](../projects/acoustic-stealth-tech-design.md) owns contracts, exact integration points, algorithms, simulator ordering and verification cases. [Physical sound](../worlds/base/physical-sound.md) owns selected base-world emission, movement and received-signal policies; [the acoustic inventory](../limits/acoustic-stealth.md) owns their bounds, tradeoffs and overflow. Unchanged speech levels, intelligibility and current geometry remain under [hearing and speech](../hearing-and-speech.md) and [its limits](../limits/hearing-and-speech.md). Do not copy policy schemas, numeric tables or complete verification matrices into this tracker.

The shared [SC01–SC14 contracts](../projects/stealth-awareness-tech-design.md#shared-contracts) and [SAD-C / SAI-C coordination](stealth-awareness.md) remain authoritative. ACS IDs are local to this acoustic tracker; existing action-capability task IDs retain their owner. Module C supplies real emissions, physical reception and supported features/location uncertainty. Module A owns detection/accumulation, classification, recognition, association and retained observer facts. E owns chosen attention/investigation and native response; F owns warning/preparedness and surprise; D owns emotion and startle effects; G owns controls and authorized presentation. Acoustic delivery extends existing owners rather than introducing a footstep detector, second hearing engine, separate animal fleeing process or AI request for every sound.

## Source baseline, dependencies and design disposition

The [technical baseline](../projects/acoustic-stealth-tech-design.md#authority-and-inspected-baseline) retains the exact common-contract and completed A source pins used for the initial audit. The integrated A [feature][a-feature], [technical contract][a-tech], [world policy][a-policy] and [PP tracker][a-work] are canonical design dependencies; their implementation remains tracked separately.

The integrated [vision design](../projects/vision-and-gaze-tech-design.md) supplies the shared physical pose, explicit crouched optical fixture, minimum direction/quiet/posture speed caps and canonical visual sampling. C retains its independent .5 m acoustic anchor law and exact impulses. Recheck changed code at implementation time without reopening these settled design contracts.

**Exact source revisions are adopted.** SC02/A preserve each source owner’s actual version and storage role, including personal string digests; there is no universal numeric-native assumption or additional acoustic counter. ACS01/04/06 implement those adapters. SA-D01 remains the separate controlled-player psychological policy, including creation/review, retained-appraisal applicability, disclosure and control transfer.

This design completes only the physical-sound/quiet-movement and generalized-hearing portions of [ND13](needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization), [ND16](needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) and SAD-C. Broader controls, communication, attention, emotional behavior, surprise, hearing media and final shared integration retain their open owners.

- [EPR](events-perception-and-reactions.md), [PP01–PP06][a-work] and [SPK](speech-and-social-perception.md) retain acquisition, recognition, speech/addressing, experience and memory responsibilities. Acoustic tasks integrate their supported inputs and consumers without duplicating their delivery checklists.
- [HE01–HE05](hearing-and-speech.md) retain delivered speech/caption/history foundations and outstanding hearing qualification. This design changes selected physical-sound scope, not historical runtime evidence or unchanged speech thresholds.
- [CTR](combat-and-threat-responses.md) retains the existing native response/controller, contact and combat foundations. [Animal sound responses](../worlds/base/animal-sound-responses.md) owns the selected sound intake policy; acoustic integration does not claim that the existing controller itself is absent.
- [Action capabilities](action-capabilities.md), [spatial work](spatial-world.md), [simulation time](simulation-time.md), [save/load](save-and-load.md), [native/performance work](performance.md) and the shared A–G implementation graph retain their existing owners. New fields begin current-format persistence in their first implementation slice.
- `codex/design-stealth-05-attention` receives permitted anonymous sound evidence and meaningful-change notifications for choosing investigation or no action. `codex/design-stealth-06-surprise` receives already-acquired evidence with immutable time/support for deciding whether it warns the actual victim. Neither receives a hidden emitter target from C.

## Delivery order and completion boundaries

Dependencies below refer to the narrow implemented interface each slice needs, not reciprocal completion of entire sibling projects. Safe projection and current-format persistence accompany the first source; they are not postponed until a final polish phase.

| Work  | Status                  | Dependencies                                                                                    | Completion boundary                                                                                           |
| ----- | ----------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| ACS00 | Completed — design only | Exact common source; completed A design; shared B/C boundaries                                  | Selected pair, policy, limits, source/scenario/repertoire review and scoped handoffs.                         |
| ACS01 | Not started             | ACS00; SAI-C interface review; PP01–PP02 acquisition contract; integrated exact source adapters | One physical occurrence/hearing path with memory-independent receiver eligibility and exact owner revisions.  |
| ACS02 | Not started             | ACS01; joint B/C SC06–SC07 pose contract; existing action/motion owners                         | Admitted quiet gait/posture and body-appropriate contact emissions from actual traversal.                     |
| ACS03 | Not started             | ACS01; each supported activity's real occurrence/lifecycle owner                                | Other physical producers, persistent intervals and simultaneous sound/masking without synthetic duration.     |
| ACS04 | Not started             | ACS01–ACS03 supported inputs; PP01–PP04; relevant SPK interfaces                                | Received features, location uncertainty, classification/recognition and speech semantics compose end to end.  |
| ACS05 | Not started             | Actual ACS02–ACS04 reception; shared native controller; applicable E/F interfaces               | Eligible animal responses and voluntary attention/warning consumers use the same evidence.                    |
| ACS06 | Not started             | Starts with ACS01; A's PP06 and G projection; completes across ACS01–ACS05                      | Current-format restore, invalidation and every public/actor projection preserve the admitted meaning.         |
| ACS07 | Not started             | Staged with ACS01–ACS06; complete producer and consumer callers                                 | Mechanical, ordering, disclosure, recovery and full-path workload evidence on the implemented tree.           |
| ACS08 | Not started             | Relevant ACS02–ACS07 delivery; ordinary G controls and applicable E behavior                    | Uncoached play demonstrates useful decisions and acceptable burden; tuning changes follow their policy owner. |

## ACS00 — Complete the selected design and source-grounded review

**Completed — design only, 2026-10-21.**

- [x] Inspect required repository/design/documentation guidance, common contracts, the completed A design and available vision boundaries.
- [x] Trace current hearing/speech, actual action/movement/pose, event observation, native animal response, clock, dependency and persistence owners; distinguish delivered foundations from absent physical emissions.
- [x] Define one reusable source/reception path, body-aware physical contacts, permitted C→A evidence, deterministic ordering, meaningful invalidation and bounded complete work.
- [x] Compare quiet hare approach, armored pursuit, sound behind a wall, mistaken footsteps, a familiar unseen voice, simultaneous sources, dense animals and fleeing prey on noisy terrain.
- [x] Review all 42 repertoire files in context and improve the focused opportunities linked below while preserving existing IDs, priority metadata and source provenance.
- [x] Record implementation slices, future verification, current-format lifecycle, cross-module interfaces, selected limits and the adopted exact source adapters.

**Exit:** the selected acoustic design is concrete enough for implementation against its owning contracts. None of these checks establishes runtime correctness, physiological calibration, capacity, usability or enjoyment. Final branch/doc/link review and the pushed commit are delivery evidence for this documentation assignment; ACS01–ACS08 remain open.

## ACS01 — Shared physical sources and memory-independent hearing

**Primary integration:** existing `acoustics.ts`, `perception.ts`, `speech.ts`, `events.ts`, `event-observation.ts`, selected world definitions and their validators.

- [ ] Extend the existing installed acoustic/source and receiver families with the technical design's exact occurrence, physical origin, performer/cause distinction, real timestamp/interval, sound properties and dependency pins. Update strict definition validation, construction and current-format encoding together.
- [ ] Generalize current physical level/reach/geometry evaluation without duplicating the engine. Preserve speech's existing occurrence/word owner and the clear-speech meaning of `hearsEntity`; a clang is not an utterance with empty text.
- [ ] Decouple physical receiver discovery and compact native acquisition from autobiographical memory. Apply exact body life, participation, hearing capability and current awake/alive eligibility before acquisition; do not enable separately deferred sound waking accidentally.
- [ ] Prepare conservative source/receiver indexes once per valid phase, with exact fallback on cache overflow. Key geometric transfer by the actual emitted origin and receiver geometry, not merely a causal entity ID.
- [ ] Admit detached impacts through their actual surviving physical source even if the performer died or left. Keep private source/cause/position proof outside recipient-facing evidence.
- [ ] Route completed physical samples into A's single acquisition boundary and distinguish completed negative, unsupported and incomplete results. Use the integrated exact source-revision adapters; never use later storage insertion as the original hearing time.

**Exit:** an existing utterance and a supported nonlinguistic occurrence reach eligible humans and memoryless native animals through the same physical owner, with exact provenance and no duplicated observation.

## ACS02 — Admitted posture, quiet gait and actual contacts

**Primary integration:** `spatial-state.ts`, `kernel.ts` movement/action owners, base action/body definitions, `motion-boundaries.ts`, `temporal-boundaries.ts` and B's accepted pose.

- [ ] Install the selected supported posture/gait definitions through ordinary action admission. Validate the resulting body/support and actually supported equipment compatibility before a posture transition; refused admission changes no pose, resources, contact phase or random state. Revalidate at completion, preserve body capability identity, and keep committed evasion speed/end pinned. Accurate long-equipment extension clearance is outside current port geometry.
- [ ] Implement B/C’s minimum direction/quiet/posture caps and explicit standing/crouched optical/receptor fixtures together with body, route, prediction and held-action constraints through one owner. Independent supported looking and posture compose with movement; camera or animation updates are not physical writers.
- [ ] Generate contacts from accepted path segments, their actual distance/time and support/material crossings. Cover ordinary travel, follow, evasion, native wander/escape and supported landings. Attempted budget, blocked remainder, editor relocation, teleportation, endpoint chord distance and render ticks create no steps.
- [ ] Retain gait/contact phase and partial-contact peak/all-quiet fields by exact body life across compatible interruptions, pace/posture switches, partitioned native intervals and save/reload; last-moment quiet toggles cannot erase prior movement. Preserve existing movement-fidelity progress as a separate quantity.
- [ ] Resolve species/body contact patterns, actual posture/gait, terrain/material and equipment contributions from authored supported data. Prepare carrier equipment through custody/attachment invalidation rather than scanning inventories or world objects for every contact.
- [ ] Integrate the selected ordinary-cadence weak-cue example with A's accumulator and its real decay/correlation window. Quiet movement changes speed/contact properties without unconditional silence, invisibility, a universal stealth score or an unsupported fatigue mechanic.

**Exit:** the quiet hare approach and noisy armored pursuit differ for legible physical reasons; equivalent actual traversal produces equivalent contact occurrences despite command/simulation partitioning.

## ACS03 — Other producers, persistent sources and simultaneous sound

**Primary integration:** actual strike/contact, projectile, flight/landing, working/activity and installed environmental producer owners, plus shared native interval selection.

- [ ] Attach the designed source adapter to real supported impacts, equipment movement, foliage contact and work occurrences. Specify unsupported breaking/destruction instances honestly instead of introducing a full damage/physics subsystem by implication.
- [ ] Install persistent producer start/change/stop and actual finite interval spans with their own committed lifecycle and meaningful boundaries. Do not convert speech captions, provider tokens, text length, rendering or ordinary publication delay into physical sound duration.
- [ ] Collect the complete source batch and synchronized receiver state at the agreed simulator boundary. Settle the old interval before changed policy/geometry/producer state applies, preserving half-open endpoints and the declared same-time phase order.
- [ ] Mix actually overlapping sound in linear energy under the selected policy, excluding the candidate's own contribution where required. Preserve distinct consequential occurrences while sharing valid listener-local masking work and uncertainty.
- [ ] Retain all contributing weak maskers under conservative bounds; a fixed loudest-N list or late source cannot erase a legitimate earlier cue. Moving sources/receivers and entry/exit boundaries must produce the declared sampled coverage, with exact physical source lifetimes.
- [ ] Implement canonical sampled source/ear anchors and saved displacement progress through the existing motion-fidelity owner, including pursuit and falls. Update only due transfer rows/columns, preserve half-open source lifetime, and feed A the exact uncovered constant-rate spans. Point impulses use actual occurrence geometry and never persist their masking into an interval; cache/pruning/publication cannot add samples.
- [ ] Use existing required-work continuations, allowances and owed-time/backpressure. If exact work cannot finish, hold dependent progress or apply the specified coherent failure boundary; incomplete work is not silence and legitimate recipients are not truncated.

**Exit:** a physical impact, an active work/environment source and a moving group can overlap coherently without a separate per-frame all-pairs propagation loop.

## ACS04 — Perception, voice and observer-safe interpretation

**Primary integration:** A's received-feature/acquisition/retention interfaces, existing speech evidence, identity, knowledge, personal experience and all explicit evidence projections.

- [ ] Supply A only supported received feature intervals, physical level/clarity/fidelity, exact occurrence/coverage support, original observer-relative bearing and justified location uncertainty. Preserve both anchor measurement times and sampled-support limitations for intervals; a negative sample is no proof of continuously empty space. Preserve a missing or ambiguous location without a hidden point alongside it.
- [ ] Keep detection, classification, individual recognition and name knowledge separate. Source-kind hypotheses consume received discriminants, not private action names, species IDs, inventory or true emitter type. Footsteps must be able to remain ambiguous or be mistaken for another supported source.
- [ ] Integrate received voice fidelity with A's familiarity-plus-Perception law. Preserve existing word/intelligibility thresholds and speech propagation ownership; recognized voice does not refresh unseen body, equipment or exact location.
- [ ] Preserve one original utterance/sample root, continuous-source covered intervals and A's deterministic weak/pattern receipts. Repeated projections and duplicate reaction requests do not add recognition credit; hidden emitter equality alone cannot group ambiguous cues.
- [ ] Carry source-local anonymous subjects, exact role/time and A's facet ordering through speech/awareness, cold hydration, history, context and consolidation. A proper name or canonical association requires its owning evidence; an audible name remains a claim.
- [ ] Finalize discrete cue freshness and persistent live-lease loss correctly. Continued readability or retained correlation is not current physical permission; later turning cannot rotate an old observer-relative bearing.

**Exit:** a familiar unseen speaker can be recognized under A's policy without exact localization, and an unknown or misclassified physical sound stays useful without leaking its actual source.

## ACS05 — Native animal, attention and surprise consumers

**Primary integration:** existing `native-response-controller.ts`, refuge/navigation owners, native reception policy, E's ordinary work intake and F's actual-victim evidence cuts.

- [ ] Add the compact permitted acoustic intake to the existing native controller and selected species bindings. Keep independent recipients, current eligibility, cause/repetition support and actual route/refuge constraints; no human memory or provider call is required for the animal.
- [ ] Select voice response bands only from A-acquired voice-like classification or understood speech; route indistinct utterances through the same general filter as other identical received sounds. Apply the physical-sound-specific eligibility policy so ordinary herd contacts do not automatically create a self-sustaining universal alarm cascade. Any secondary alarm/movement is a new actual producer that other bodies must independently receive.
- [ ] Preserve blocked/proposal truth and nonwaking semantics in the shared alarm helper. Save the single pending acoustic refuge-leg obligation and retire it only through actual bound arrival/cancellation; empty known danger alone cannot settle the animal. Keep presence/rise baselines outside the optional alarm episode.
- [ ] Implement one permitted pattern map with independent alarm/curiosity slots and per-slot expiry. Evaluate alarm eligibility first even for suppressed repeats; retain consumed curiosity onset in the existing per-exposure record. Jointly qualify only E’s explicitly installed ground-bird contrast, with no blanket species curiosity.
- [ ] Supply D’s actual abrupt acquired cue qualifier/receipt through existing A/C state; distinguish real loud impulse/onset/rise from ordinary strong detection, coarse anchor resampling, bootstrap and restored confirmation.
- [ ] Suppress redundant response/intake work by the exact permitted cause/pattern and meaningful change rules while preserving distinct consequences and occurrences. Expired or invalid support cannot keep a response eligible after restore.
- [ ] Hand E a permitted historical bearing/region, quality and relevant change, allowing ignore, listen, investigate or another ordinary choice. Do not force every person to turn or route them to a live hidden entity.
- [ ] Hand F already-acquired facts and immutable support before its dependent cut. Preserve warning just before an attack, incomplete required work, nested callbacks and the exclusion of the same impact as its own advance warning.
- [ ] Leave fear/startle mechanics to D. Interruption, route failure, native settling and optional reasoning use their existing action/controller owners rather than another fleeing or emotional process.

**Exit:** the hare's response, a person's possible investigation and possible warning all use the same admitted hearing while retaining their separate decision owners.

## ACS06 — Current-format persistence, invalidation and privacy

**Primary integration:** existing source/body/activity encoders and validators; A's PP06; personal accounts, memory hydration, snapshots/patches/history and G's presentation.

- [ ] Save exact physical source/life, instantiated profiles, contact phase/partial-contact fields, producer state, sampled anchors/remaining displacement, consumed interval/sample roots, current policy pins and absolute simulation deadlines through their existing owners. Implement the current format together; add no legacy compatibility store or parallel acoustic autobiography.
- [ ] Separate compact actual-occurrence retention from audience-driven full narrative append. Preserve every acquired animal cue's own sensory lifetime and exact root, while A/native episodes/cuts retain required minimal support; a mixture adds no world event and an interval adds no row per evaluation.
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

## Repertoire relationships

The contextual review covers all 42 repertoire files. These existing opportunities connect the acoustic design to the broader game; catalogue entries remain proposals until their own delivery is selected.

| Repertoire                                                       | Relevant entries          | Design relationship                                                                                                                                              |
| ---------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Abilities/progression](../repertoires/abilities-progression.md) | AP-022, AP-044            | Quiet approach and armor technique make footing, fit, route, range and time useful choices; movement/acoustics and perception retain sound/detection ownership.  |
| [Actions](../repertoires/actions.md)                             | REL-12, OBS-02, COM-08    | Supported movement changes actual contacts. Ambiguous rhythms and agreed knocks provide evidence without proving identity or choosing another person's response. |
| [Adventure/discovery](../repertoires/adventure-discovery.md)     | AD-046, AD-051            | Route/load choices serve a household hunt; a fleeing quarry's fresh rustles can renew a broad clue after sight is lost.                                          |
| [Bodies/species](../repertoires/bodies-species.md)               | BSP-260; movement anatomy | Walking, hopping, crawling and wing motion need their actual supported contact patterns; a hare produces its own clues during escape.                            |
| [Ecology/weather](../repertoires/ecology-weather.md)             | ECW-027, ECW-102          | Congregating waterfowl receive and mask sounds independently; noisy scree affects walkers, prey and subsequent routes.                                           |
| [Materials/resources](../repertoires/materials-resources.md)     | MAT-049, MAT-255          | Supported lining and hobnails connect quietness to fitting, space and traction, without a universally superior material.                                         |
| [Objects](../repertoires/objects.md)                             | ITEM-231                  | A jostled clapper makes cargo choices matter during escape and can celebrate the prize at home.                                                                  |
| [Work/crafting](../repertoires/work-crafting.md)                 | WORK-084                  | Compatible armor fitting can reduce avoidable rattle while preserving real coverage and carried weight.                                                          |
| [Combinations](../repertoires/combinations.md)                   | “The quarry that learns”  | The quarry's new brush/scree sounds support listening, changing vantage or accepting escape rather than live hidden tracking.                                    |

SAD-I owns the broader repertoire navigation, coverage and priority synthesis when the A–G designs are combined. Existing source ledgers and optional world profiles retain their scope.

## Handoff and evidence requirements

ACS00 evidence consists of pinned source/design reading, documented scenario comparisons and static documentation review. **Executable tests, runtime play, performance, browser/provider behavior, balance and uncoached enjoyment were not exercised.** Every corresponding task above remains unchecked.

Before implementing, read the paired design, installed physical-sound policy, acoustic inventory and integrated A/B/E/F/D contracts together; recheck the actual implementation base. Implement a useful complete producer→physical reception→A evidence→consumer→safe projection slice. Record later results with the real revision, workload, source/receiver populations, clock settings and evidence limitations. Do not infer full delivery from new types, helpers or a single scripted hare encounter.

## Maintained records

- Product behavior and scenarios: [acoustic feature specification](../projects/acoustic-stealth-feature-spec.md).
- Technical contracts and verification cases: [acoustic technical design](../projects/acoustic-stealth-tech-design.md).
- Selected world behavior: [physical sound](../worlds/base/physical-sound.md), [animal sound responses](../worlds/base/animal-sound-responses.md), [A recognition policy][a-policy].
- Limits: [acoustic inventory](../limits/acoustic-stealth.md), existing [hearing inventory](../limits/hearing-and-speech.md), shared [stealth inventory](../limits/stealth-awareness.md).
- Cross-project work: [SAD-C / SAI-C / SAD-I](stealth-awareness.md), [PP00–PP07][a-work], [SPK](speech-and-social-perception.md), [HE](hearing-and-speech.md), [CTR](combat-and-threat-responses.md).
- Adopted shared representation: [SA-D02][sa-d02].

[a-feature]: ../projects/perspective-perception-feature-spec.md
[a-tech]: ../projects/perspective-perception-tech-design.md
[a-policy]: ../worlds/base/perception-recognition.md
[a-work]: perspective-perception.md
[sa-d02]: ../../archive/05-project/open-decisions.md#sa-d02--evidence-source-revision-representation

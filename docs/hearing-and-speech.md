# Hearing, speech evidence, and spatial captions

## Status and ownership

This document specifies the delivered finite audible-speech contract and explicitly named future extensions. The accepted [speech and social perception feature specification](projects/speech-and-social-perception-feature-spec.md) and [technical design](projects/speech-and-social-perception-tech-design.md) select the changes to direct addressing, reliable recognition and native sound reactions described below. The speech, recognition, memory, native sound and interface paths are installed; integrated and live qualification remains open in [SPK](maintainers/speech-and-social-perception.md). Numerical defaults are reversible gameplay tuning, owned by the [hearing limits inventory](limits/hearing-and-speech.md). [Architecture](architecture.md#hearing-captions-and-perceived-events), [integration evidence](verification/hearing-main-integration.md) and [the hearing tracker](maintainers/hearing-and-speech.md) distinguish delivered behavior and scoped checks from remaining full-scene, accessibility and live-provider qualification.

This document owns acoustic quantities, speech-perception tiers, volume, listener-specific linguistic evidence, and spatial speech-caption behavior. It specializes the [sensory design](../archive/07-technical-architecture/perception-and-attention.md). [EPR](events-perception-and-reactions.md) retains occurrence scope, acquisition episodes, reaction intake, and scheduling. [Narration and conversations](narration-and-conversations.md) retains ordinary speech interaction, source-linked history and Narrator authority, including the accepted removal of ordinary conversation membership. [Perceived World Events](perceived-world-events.md) owns the player-facing comprehensive event viewer. [Timed UI](timed-ui.md) owns reusable presentation lifetimes and progress rings. No second event bus, speech database, reaction scheduler, or writable copy of world truth is introduced.

**Accepted shared NPC streaming target; runtime implementation remains pending.** Mike selected immediate accepted text for all public NPC dialogue, with no naturally paced speaking or environmental progression. The [feature specification](projects/npc-speech-streaming-feature-spec.md) and [technical design](projects/npc-speech-streaming-tech-design.md) extend one ordinary instantaneous occurrence with an append-only body. [NST00–NST10](maintainers/npc-speech-streaming.md) owns design disposition, implementation and qualification; [streaming limits](limits/npc-speech-streaming.md) owns the new bounds. This target builds on SPK's ordinary speech/evidence contracts and does not claim the current finished-output runtime already streams.

**Selected recognition/acoustic extension; runtime pending.** The [shared stealth and awareness contract](projects/stealth-awareness-tech-design.md#shared-contracts) selects familiarity- and quality-dependent recognition, exposure continuity and per-fact freshness. It supersedes reliable first-hearing association only when the coordinated PP/SPK implementation lands; the installed recognition described below remains current. General acoustic design and shared design integration are complete under [ACS](maintainers/acoustic-stealth.md) and [stealth and awareness](maintainers/stealth-awareness.md).

The selected [general acoustic feature specification](projects/acoustic-stealth-feature-spec.md) and [technical design](projects/acoustic-stealth-tech-design.md) extend this same hearing owner with supported physical sound sources, displacement-driven contacts, quiet movement/posture, actual simultaneous and persistent sources, and observer-relative evidence. They do not install a separate footstep detector or hearing engine. Source-specific emitters are staged explicitly; an action name, animation, caption or movement intention is not proof that a physical sound occurred. The bundled [physical-sound policy](worlds/base/physical-sound.md) owns authored physical-source and nonlinguistic response choices.

Delivery dependencies and implementation stages belong in [the hearing tracker](maintainers/hearing-and-speech.md). Deferred automated coverage belongs in [maintainer TODO](maintainers/TODO.md#hearing-captions-and-perceived-events--deferred-validation).

## 1. Product behavior

Committed speech from any speech-capable entity, including the controlled character, can produce a caption. Caption content is what this listener perceived, not necessarily what the speaker actually said. Speech also appears in the player's Events history; its Speech filter is the world conversation log. The Speak bar sends words without opening a separate player conversation transcript.

A visible, associated speaker receives a plain caption above its head. Speech from an off-camera source uses the camera-centered presentation in section 8, with a precise direction only when its position is permitted and otherwise only admitted approximate bearing information. Missing bearing produces a neutral nearby-caption fallback. Identity, localization, and understanding are independent.

| Perception                                                    | Example presentation                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Clear words, visible associated speaker                       | Speech icon and `“Meet me behind the mill.”` above the speaker                                        |
| Clear words, unidentified source                              | `You hear someone talking nearby: “Meet me behind the mill.”` on the directional ring, when localized |
| Partial words, unidentified source                            | `You partly hear someone nearby: “Meet me […] mill.”`                                                 |
| Detected speech, no intelligible words                        | `You hear indistinct speech nearby.` No quotation                                                     |
| Recognized speaker and delivery, no words                     | `John is whispering something.` No quotation                                                          |
| No sound detected                                             | No auditory caption or heard evidence                                                                 |
| A separately permitted visible speaking action, without sound | `John appears to be speaking.` Visual evidence only                                                   |

“Faint talking” means audible sound with potentially unintelligible words, not clear words from an unknown source. Use **unintelligible speech** for that state. Reserve **inaudible** for no detected sound. A caption must never invent speech content, identity, recipient, delivery mode, or direction.

## 2. Continuous quantities, three thresholds

Use continuous decibel quantities internally, with three world-configurable thresholds producing four outcomes. Do not make a 1–10 hearing score, three radii, or a percentage the authoritative acoustic representation. Rounded labels and approximate overlays are presentations only.

Keep these quantities distinct:

- **Source level:** modeled broadband sound pressure level at one metre from an emitter, `sourceLevelDbSplAt1m`.
- **Received level:** modeled sound pressure level at a listener's ear, `receivedLevelDbSpl`.
- **Background level:** modeled competing acoustic energy at the listener, `backgroundLevelDbSpl`.
- **Listener floor:** the effective absolute audibility floor of this listener, `hearingFloorDbSpl`.
- **Clarity margin:** the game's measure of signal above the more restrictive floor, in dB.
- **Intelligibility:** none, partial, or clear; this is a world-policy outcome, not a measured clinical score.

Use sound pressure levels referenced to **20 micropascals in air**, not dBFS, audio playback gain, an unexplained “dB” score, or automatically dBA. A negative SPL value is valid; zero dB SPL is not silence. The source number represents an authored broadband level for the utterance, not an acoustic waveform or a measured peak. The model is deliberately approximate, with explicit reference and units.

The current spatial convention is one map unit per metre. A future world with another spatial scale must supply an explicit scale at the acoustic boundary. Other transmission media require a compatible provider/reference rather than silently reusing air parameters.

### Initial deterministic calculation

```text
r = max(distance3D(emissionOrigin, listenerEar), 0.25 metres)
received = sourceLevelAt1m - 20 * log10(r / 1 metre) - pathLossDb
floor = max(backgroundLevelDbSpl, hearingFloorDbSpl)
margin = received - floor
```

The quarter-metre clamp avoids singular/coincident positions; it is a v1 near-field approximation. Use existing body ears for listeners. Until a sound/mouth anchor exists, use the existing source ear-height anchor and document that approximation, rather than deriving emission from sprite artwork.

| Margin using provisional default thresholds | Outcome                  | Allowed words                                                |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| Below 0 dB                                  | Undetected               | None; no heard entry                                         |
| At least 0, below 6 dB                      | Detected, unintelligible | None; descriptive auditory evidence                          |
| At least 6, below 12 dB                     | Partial                  | Approximately 50% of words, as stable fragments              |
| At least 12 dB                              | Clear                    | Full linguistic content within supported language capability |

Boundary equality belongs to the higher tier. These thresholds are **gameplay choices**, not universal human intelligibility thresholds. Preserve the continuous measurements so future policies can use more bands, a different partial fraction, or a continuous intelligibility curve without changing event identity or caption contracts. No per-decibel awareness event is emitted.

Background noise matters: the same received level can be clear in a quiet room and unintelligible near machinery. The initial floor model is the maximum above, not a physical summation of an audiogram with external sound. Future frequency-dependent hearing, reverberation, directionality, and language comprehension must not be misrepresented as already simulated.

### Initial default-world tuning

Start with normal speech at 60 dB SPL at one metre, whispering at 40, shouting at 75, background at 28, and listener floor at 0. These are authored presets, not claims about every real person or environment.

With no barriers, these defaults imply approximately:

| Delivery | Clear words through | Some words through | Speech detection through |
| -------- | ------------------: | -----------------: | -----------------------: |
| Whisper  |               1.0 m |              2.0 m |                    4.0 m |
| Normal   |              10.0 m |             20.0 m |                   39.8 m |
| Shout    |              56.2 m |            112.2 m |                  223.9 m |

The normal clear boundary intentionally retains the existing unobstructed 10-unit baseline. This does **not** preserve the old obstruction gate or add an undocumented 10-unit hard cap. Shouting can reach an entire small map. Tune source presets or world acoustic policy if that is undesirable; never silently truncate an otherwise authorized audience as a performance optimization.

## 3. Geometry, attenuation, and noise

Reuse the native spatial provider and its ordered sound crossings. Sight blockers are not automatically soundproof; camera floor cutaways never remove physical slabs.

The installed acoustic policy interprets `acousticTransmission` as a **broadband energy/intensity transmission ratio**, in [0, 1]. The cutover replaced the earlier binary hearing gate; historical starter coefficients are not evidence of physical calibration. Further coefficient changes are authored-world tuning, not a missing acoustic integration.

For a nonzero ratio T, the corresponding loss is `-10 * log10(T)` dB. Ratios multiply across distinct crossed solids; losses add. T=1 is no attenuation; T=0 explicitly blocks this direct path. Return a blocked result instead of serializing Infinity or NaN. Do not use `-20 * log10(T)` unless a separate provider explicitly supplies a pressure-amplitude ratio. Do not store both independently editable loss and transmission for the same material.

Count a physical solid once, not once for each triangulated face or both its semantic rock-top support and underlying rock volume. Preserve the current canonical crossing order. Openings affect direct paths through geometry. Sound going around corners through rooms/portals, reflections, diffraction, and frequency-dependent filtering are deferred. A blocked direct path in v1 does not establish that a future propagation provider would find no indirect path.

The current speech implementation uses an authored uniform ambient background per acoustic policy. The selected [general acoustic target](projects/acoustic-stealth-tech-design.md) adds supported physical background/persistent producers and listener-local masking through this same owner. It does not require a room/portal simulation, and its new source work is not current runtime.

The selected general acoustic design introduces actual overlap for supported physical sources. Add their **linear energies**, excluding the evaluated source, and convert back: `10 * log10(sum(10 ** (Li / 10)))`, preferably with a numerically stable maximum-offset formulation. Never add dB values arithmetically. Instantaneous speech events in v1 do not have physical durations, so simultaneous-looking captions must not be treated as overlapping acoustic emitters. Caption lifetime is never a noise duration.

The generic acoustic result supports the accepted SPK target for native animal sound reactions described in section 5. Installed world behavior determines whether a detected sound causes attention, fleeing, continued activity or another supported response. Loudness alone does not introduce hearing injury, waking, glass-breaking, or other mechanics. Those remain separate world laws requiring duration where relevant and ordinary native admission.

## 4. Speech volume and admission

The [shared speech-composition contract](narration-and-conversations.md#admission-ordering-and-memory) brings human-entered, authored-choice and generated utterances through this same native boundary. Selecting or generating words grants neither additional hearing reach nor different audience authority.

Use `whisper | normal | shout` as the initial player/agent delivery modes. They resolve through an installed source profile; an LLM may choose a supported mode, not an arbitrary source level, listener list, range, or private scope.

Volume is already part of the existing talk operation and native speech admission, not another command family. The current runtime has one nullable addressee; null means ambient speech. The [SPK technical design](projects/speech-and-social-perception-tech-design.md) owns that contract and its coordinated callers. The strict model operation also supplies nullable `selfIntroduction` under [the naming contract](entity-names.md), while native callers may omit that optional claim:

```ts
type SpeechVolume = 'whisper' | 'normal' | 'shout';

// Current speech fields within the existing agent talk operation.
talk: {
  text: string;
  addresseeEntityId: string | null;
  volume: SpeechVolume;
  selfIntroduction: string | null;
}
```

The compact player Speak bar has an explicitly labeled volume selector, default Normal. A client omission may normalize to Normal at input admission for ergonomic callers; strict model schemas must match their declared required/nullable-field contract. Propagate the selected mode through commands, response adapters, receipts, retry digests, committed speech metadata, and projections. Do not infer physical delivery from “I whisper” written in dialogue or change it from text styling.

An addressed utterance is still external sound. Conversation membership, intended addressee, importance, and request priority never grant acoustic access. A whisper is not an access-control private message. The speaker receives self-expression evidence for its own accepted words, distinct from proof of hearing its own voice; this also accommodates a speaking actor without hearing.

### Received direct addressing — accepted target

Every committed utterance has its speaker and either one intended addressee or none. The target is communicative intent, not a list of listeners, accepted social membership or a required reply. For a listener using the selected linguistic social-perception policy, detecting an utterance unambiguously establishes whether it was ambient or directed. If that listener is the actual addressee, its permitted experience records that the speaker addressed it. Sight and intelligible words are not additional prerequisites for knowing this role: the interaction carries the equivalent of an explicit audible address. If the sound is undetected, the marker creates no heard experience and does not deliver a message through a wall or beyond range. A sound-only animal detector retains its separate nonlinguistic projection below.

The address cue grants no missing words, canonical name, exact location, full delivery classification or extra acoustic reach. Detection, intelligibility, source association, recognition, a known name and being addressed remain separate facts. Being addressed does not establish the speaker's canonical identity. The recipient can know that an unidentified voice addressed it while retaining only indistinct sound or partial words. A sufficiently familiar voice can support recognition when current evidence quality and the selected base-world Perception rule permit it, independently of intelligibility; the source may otherwise remain anonymous or tentative. Another linguistic listener obtains the third-party recipient's identity only through permitted sight of that recipient at the occurrence; seeing the speaker is unnecessary. Prior familiarity with a currently unseen recipient does not grant that fact. Otherwise retain directed-to-someone-else without a target binding, never ambient speech or an unobserved raw target. The speaker preserves its own selected target, and the actual hearing addressee always knows its own addressed role. Speaker and optional known addressee use the one source/target role contract in the [technical design](projects/speech-and-social-perception-tech-design.md#4-listener-evidence-and-sound-detection); no parallel intended-recipient identity is stored.

The target actor may answer, act, think, defer or continue without responding under its existing cognition and native behavior policies. Ambient and overheard speech may also prompt a voluntary response when the content, situation and character warrant it. No ordinary speech field enrolls a social group or purchases a mandatory reply. [SSP-H01](limits/hearing-and-speech.md#ssp-h01--received-direct-addressing) owns the restriction and its current-runtime gap. Player composition availability is the separate [Speak/Act admission policy](narration-and-conversations.md#player-speak-and-descriptive-act).

An out-of-range addressed reply may still be spoken aloud. The accepted one-target contract records its original intended recipient directly, using the same optional target rather than a second recipient field or fallback. Preserve whisper/shout mode and all emission semantics; never escalate volume or teleport words to the recipient. Revalidate the speaker's capability, life/sleep state and event-time geometry when committing a generated reply. For NST, first publication owns that hearing snapshot; later appends retain current actor/request authority checks without rerunning geometry. A valid intended recipient need not possess memory, speech or effective hearing. The actual dispatch guards must admit a heard direct call with no understood words so clarification is possible; an undetected or seen-only cue creates no directed reply request. Use the existing independent component-outcome and paid-execution boundaries.

The speaker does not receive an omniscient list of listeners. Likewise, an actual recipient ID is not automatically a _perceived_ recipient identity for an eavesdropper. Addressed/overheard reaction cues must be derived from evidence available to that listener, without exposing hidden communicative intent.

## 5. One occurrence, listener-specific evidence

Speech remains `WorldEvent.type === 'speech'`. The world event contains actual utterance data and the existing immutable event-time origin, identity, order, and scope. Add resolved volume, source profile/version and source level to its typed speech data; do not duplicate common event-envelope fields or create a parallel speech log.

For each eligible listener, native perception produces one actor/event awareness result, with different fields permitted for different listeners. Hearing detection is not the same as speaker recognition, spatial localization, or intelligibility. Omitting the linguistic social policy preserves actually detected acoustic evidence without words, addressing or inferred recognition. A sound-only record uses the same sound projection and retention owner as other nonlinguistic detections. Memory, model input and history/display classification use the acquired payload; the private source event being speech does not turn sound-only evidence into language.

The following is a conceptual **safe projection**, not a second persisted event schema:

```ts
type SpeechSegment = { kind: 'heard'; text: string } | { kind: 'unintelligible' };

type PerceivedSpeech = {
  // The full current type distinguishes seen-only from self/heard acquisition.
  perception: 'heard' | 'seen' | 'self';
  addressing: 'ambient' | 'directed' | null; // null only for seen-only
  intelligibility: 'none' | 'partial' | 'clear';
  segments: SpeechSegment[];
  speaker: { nameAtTime: string /* permitted grammar */ } | null;
  addressee: { nameAtTime: string /* permitted grammar */ } | null;
  delivery: SpeechVolume | null;
  direction: { sector: number; elevation: 'above' | 'level' | 'below' } | null;
  listenerPosition: Position;
};
```

The host stores sufficient immutable observer-local facts to reproduce that projection: permitted fragments, recognition/association, permitted delivery, coarse bearing, listener pose at acquisition if needed, and policy version. The current record includes permitted speaker/addressee roles and identity/name distinctions. Speaker and addressee IDs live only in the owning source/target fields; labels carry no second identity. Seen-only speech has null addressing, no recipient and no heard words. A shared selector derives the retained wording and references. Reuse the existing awareness/perspective persistence boundary. The raw occurrence may keep private source/target metadata; safe DTOs and model references may not simply spread that metadata. The full structured permitted experience survives memory hydration and consolidation under the [memory contract](memory-architecture.md#structured-permitted-experience); a colloquial caption or memory sentence is a reusable rendering of that evidence, never its sole semantic source.

Exact dB measurements, source level, exact hidden coordinates, hidden source/target IDs, original word offsets/counts, mask seed and full unredacted text are not required in the public projection. Ordinary hearing does not become a rangefinder or a technical inspection tool. Administrative diagnostics remain separately authorized and never teach an actor.

The controlled actor, NPCs, context builders, attention, recall, embeddings, summaries, Narrator, event history, and UI all consume compatible listener-specific evidence. Perceived speech is evidence that words were spoken, not that a speaker's claim is true.

### Native ordinary-warning testimony — accepted target

The [A/SPK warning producer](projects/perspective-perception-tech-design.md#native-ordinary-warning-testimony) can acquire a possible attributed danger claim from an actual complete understood “Look out at the doorway now” clause. The [world policy](worlds/base/perception-recognition.md#ordinary-spoken-warning-policy) owns its exact known-place matching and approximate interval. The listener’s source-complete permitted place capsules/index must be prepared before native intake; incomplete preparation holds, while an unknown or ambiguous place supplies no current claim. Preserve original place precision, utterance time and actual complete claim admission. F receives grounded testimony and applies its own relevance/retention without parsing text. Captions, history and optional audio cannot reset the interval or create another warning. SPK01/02/PP delivery remains open.

### Source and delivery recognition

The installed [base-world stable recognition policy](worlds/base/knowledge.md#identity-and-recognition) establishes or reuses a stable individual speaker identity for every actual ordinary linguistic hearing detector, including first encounter, unseen speech and zero intelligible words. Neither previous familiarity nor visual association is a prerequisite. The identity means the same individual can be distinguished later; it supplies no proper name, location, inventory or other hidden facts. The native selected policy grants this association explicitly, and generic projections still cannot spread raw source IDs as a fallback. A nonlinguistic animal or a world selecting a different supported policy can retain an unidentified source. Physical face/voice analysis, disguise and mistaken-identity simulation remain separate extensions.

**Selected recognition target; runtime pending.** The selected [shared recognition contract](projects/stealth-awareness-tech-design.md#shared-contracts) and [base-world policy](worlds/base/knowledge.md#identity-and-recognition) instead require prior familiarity, sufficient current evidence quality and the selected Perception rule for reliable voice association. An unfamiliar first hearing can support an anonymous exposure, words, classification or direction without a canonical speaker binding. A familiar voice can sometimes be recognized without sight or intelligible words, but acoustic detection alone never guarantees it. Supported recognition reuses the existing observer identity owner and grants no proper name, exact location, inventory or unseen activity. Anonymous and suspected associations remain distinct from verified current-body references; generic projections cannot spread raw source IDs as a fallback. Other worlds select their own supported recognition rules. Detailed disguise, mistaken-identity simulation and biometric analysis remain separate extensions.

Delivery labels require a permitted delivery cue. A faint ordinary voice is not a whisper. Current v1 exposes the authored delivery mode for the speaker’s own utterance, or when another listener visually associates the source and detects its speech; otherwise delivery is absent. Clear words alone do not grant hidden-speaker identity or delivery mode. Visual-only detection does not justify “John is whispering.” A later acoustic delivery-recognition rule needs its own supported policy; a model cannot supply another listener’s recognition result.

A later identification is new evidence. It does not rewrite the original utterance's fragments or retroactively convert all unknown historical voices to a currently visible actor. Initialization must preserve deliberately absent source/target roles rather than treating them as missing data to repair. The selected shared contract preserves exposure continuity separately from live authorization: a reconnectable episode does not keep current detail visible during a gap. Continued real exposure may strengthen evidence; rereading, replaying or republishing the same account adds no physical exposure or familiarity. Later recognition updates only supported facts, leaving earlier position, equipment and activity observations historical.

The [observer-specific perception design](projects/perspective-perception-tech-design.md) owns native recognition, familiarity and contact association. Speech supplies the acoustic quality actually available to the listener; private emitter identity, an unattenuated source signature or a guessed name cannot substitute. Ordinary classification and evidence recording require no AI request; optional interpretation consumes the permitted result.

### Editing committed speech

Generic event and awareness editors must not rewrite committed speech text or content independently of the listener capsule. Reject such rewrites clearly; existing guarded deletion and awareness-importance edits remain permitted. A correction spoken in the world is a new event, not a retroactive hearing upgrade. A dedicated administrative re-authoring operation needs explicit semantics for already-perceived fragments and their dependents; that unresolved extension is recorded in [D66](maintainers/decisions/characters-and-evidence.md#d66--re-authoring-committed-speech).

### Selected attributed correction proposal

[DG25](projects/corrections-and-shared-restoration-feature-spec.md) proposes ordinary new-event correction as the first consumer of D66. The optional Correct what you said control prepares an unsent new utterance by the currently controlled speaker; normal current speaking/hearing applies. Its first history links are private to that speaker. Other listeners obtain actual new words, with no retrospective fragment, identity, relationship or hearing upgrade. An ordinary clarification does not automatically invoke the existing administrative memory-correction operation or repair appraisals, agreements and later choices.

The accepted [creator-edit policy](projects/creator-edit-propagation-feature-spec.md#accepted-policy) forbids automatic semantic memory cascades after ordinary creator edits. Existing explicit dependencies, selected forgetting and guarded administrative memory operations retain their distinct authority. [HE06](maintainers/hearing-and-speech.md#he06--attributed-correction) owns the proposed optional consumer; [HC-L01–HC-L05](limits/hearing-and-speech.md#hc-l01--correction-through-actual-speech) records its constraints. Administrative inline retcon remains unselected; a deliberately different whole fictional history uses an actually supported retained-world restore under SL, independently of ordinary speech.

### Native behavior and sleep

Retain applicable sleep/life/sense gates for conscious acquisition. An asleep listener does not receive full speech simply because a level crossed a threshold. Loud-sound waking remains a future native policy.

The current ordinary native animal constructor disables cognition, autobiographical memory, inner-world writing and speech; current speech audience/evidence selection also requires memory capability. Its existing attack escape therefore does not establish a sound-reaction implementation. [SPK07–SPK08](maintainers/speech-and-social-perception.md) removes memory-based acoustic eligibility and connects permitted sound to the selected native response owner while leaving cognitive capabilities disabled; this is not delivered runtime behavior.

### Selected animal hearing and choices — accepted target

**Runtime checkpoint:** memory-independent hearing, typed sound-only observer records,
current-format storage, shared generic presentation, recall exclusion and exact
sensory expiry are installed. Core acoustic reaction patterns and their integration with
the existing combat animal controller are installed; the new A/ACS extension and
remaining qualification stay in SPK08. See the
[verification record](verification/speech-and-social-perception.md#sound-only-hearing-checkpoint).

Physical acoustic eligibility is independent of autobiographical memory, linguistic understanding, cognition and speech capability. Reuse one physical exposure calculation and the existing actor/event awareness owner. Speech is the first production emitter: the same occurrence supplies linguistic evidence where supported and an animal's sound-only evidence. A native non-speech fixture proves the generic contract; other production noises remain separately selected emitter work. [SSP-H02](limits/hearing-and-speech.md#ssp-h02--sound-reactions-without-autobiographical-memory) owns this distinction.

**Selected shared acquisition target; runtime pending.** Physical acoustic eligibility is independent of autobiographical memory, linguistic understanding, cognition and speech capability. Reuse one physical exposure calculation and the existing native observation boundary. Its compact permitted result can reach a native receptor/controller without creating autobiographical `Awareness`; memory-capable actors retain appropriate experience through the existing awareness owner, while a native animal retains only the sensory/exposure and controller continuation its policy needs. The [shared emission/acquisition/storage contract](projects/stealth-awareness-tech-design.md#shared-contracts) owns this separation. Speech is the first production emitter: the same occurrence supplies linguistic evidence where supported and an animal's sound-only evidence. A native non-speech fixture proves the generic contract; [ACS](maintainers/acoustic-stealth.md) owns the selected supported production emitters and their explicit stages. This does not make every action emit sound. [SSP-H02](limits/hearing-and-speech.md#ssp-h02--sound-reactions-without-autobiographical-memory) owns this distinction.

A bundled ordinary animal receives actual intensity/margins, coarse direction or null and any legitimately associated visible source. It receives no words, intended addressee, proper human name, hidden source ID/coordinates or inferred source distance/delivery. Identical supported acoustics/visible facts cannot make it distinguish a spoken threat from a greeting. A sound-only observer result remains valid when the source occurrence is speech. Any admitted retention, validation, public projection or rendering of that result must preserve its nonlinguistic meaning without fabricating a linguistic payload or substituting raw world-event text; native reception is not conditional on autobiographical storage. The shared sound renderer presents only permitted acoustic meaning.

Ordinary animals keep native control and disabled cognition, autobiographical memory, inner-world writing, language and speech. The [bundled animal acoustic policy](worlds/base/animal-sound-responses.md) extends the single selected native response profile with exact hearing/reaction bindings. The [CTR03–CTR04 native animal design](projects/combat-and-threat-responses-tech-design.md#native-animal-execution-ctr03ctr04) owns the shared alarm, complete perceived danger set, reachable refuges, speeds, continuous-safe settling and movement/flight continuation. Its native controller and speech acoustic intake are installed; the new acquired-evidence/acoustic extension and remaining qualification are unfinished. SPK supplies its now-selected ordinary-speech trigger without importing unrelated combat work.

**Selected acoustic extension:** SPK consumes evidence-qualified voice reactions and ACS adds the general received-sound filter through that same controller. Their new acquisition/classification and curiosity contracts remain pending; they do not erase the installed speech-alarm foundation or its recorded evidence.

Initial outcomes are continue current behavior or enter/update that shared alarm. The existing voice-response bands apply only when perspective perception actually acquires a voice-like classification or supported understood-speech facts; ordinary language-disabled animals need the voice-like classification. A masked or unclassified utterance uses the general received-sound filter. Private source-event type and unheard words cannot select a more permissive reaction law. A qualifying cue can make a skittish profile flee while a calmer profile continues until its applicable threshold is met. Native policy can produce actual retreat, alert settling or blocked behavior without narrating human thoughts. E’s explicitly installed ground-bird curiosity contrast shares this native controller and the independent curiosity slot; it is not a blanket animal response. Richer listening/curiosity and exceptional cognitive creatures retain their separately documented scope.

Every acquired occurrence keeps its own permitted meaning; where the selected native profile retains a short sensory record, that record has its own absolute expiry and is not an autobiographical prerequisite for receiving the cue. The native owner separately groups qualifying source-or-anonymous/direction/intensity patterns under the exact [world repetition algorithm](worlds/base/animal-sound-responses.md#repeated-sound-without-repeated-behavior-work). After recording actual exposure, exclude self/null-response-profile cues from response retention and alarm-ineligible cues from alarm slots. E’s separately installed curiosity branch may retain only its own slot after alarm eligibility fails. Repeated active patterns do not reset safe time, replace routes or draw randomness; a new qualifying pattern can update the one alarm. A/B/A/B is retained as two patterns instead of repeated alternation work. Each pattern has independent optional alarm and curiosity slots; C/SPK consumes only alarm, E only curiosity, with alarm eligibility checked first even on repeat suppression. Expire slots independently, and retain E’s consumed onset in the existing per-exposure receipt. No hidden source IDs, paid opportunity revisions, actor model ticket or human new-memory wake route is introduced. [SSP-H03](limits/hearing-and-speech.md#ssp-h03--short-sensory-retention-and-complete-detection) and [SSP-H04](limits/hearing-and-speech.md#ssp-h04--acoustic-scene-coalescing) record the separate lifetimes and growth limits.

A heard bearing supplies a route preference, never a guessed source point or distance. All actually perceived dangerous bodies constrain the same refuge selection; a second human can make the apparent away direction unsafe. Null direction still permits an admitted route under existing heading/order, without claiming localization. Use the native owner's actual safety, blocked and settling conditions. [SSP-H05](limits/hearing-and-speech.md#ssp-h05--admitted-animal-choice-bounds), [SSP-H06](limits/hearing-and-speech.md#ssp-h06--animal-profiles-and-native-continuation) and the [technical integration](projects/speech-and-social-perception-tech-design.md#10-animal-sound-and-cognition-integration) own the relevant implementation boundaries.

Native detection and reactions require no AI calls and continue through provider outage. The separate player freeform availability gate remains enforced. Busy, moving, perched and airborne animals can still sense; life, sleep and other perception-blocking capabilities remain authoritative, and this slice adds no sound waking. Save sensory expiry, native pattern state and the existing alarm/cause/refuge/movement relationships coherently. Restore does not replay sound, reset settling or draw again. An active episode's minimal permitted cue may outlive optional sensory retention without creating permanent animal memory.

## 6. Partial text and privacy

The [bundled speech policy](worlds/base/speech.md) owns the selected approximately-half partial-word rule and its fictional wording; the engine supplies reusable preparation and preserves the resulting evidence. Retain original order and opaque unintelligible segments without generating replacement words or guessing missing grammar. Clearly mark the overall sentence as partial. In particular, a missing negation must not turn the remaining fragment into an authoritative promise, threat, teaching result, or commitment.

The current mask is chosen once at commitment by a versioned event/listener-local deterministic stream, keyed from the world seed and occurrence/listener identity without consuming the shared simulation RNG. Persist the projected result. Rendering, history reloads, reconnects, reflections, camera motion and later policy changes never reroll it. Do not persist a bare seed and later retokenize historical speech under a different algorithm.

For the accepted NST target, the installed speech/perception selection binds the bundled world's paired-unit disclosure policy through the existing world-definition and pin owners. Atomic and streamed speech use the same selected rule, shared Unicode preparation and saved fragments under the [technical design's exact mask contract](projects/npc-speech-streaming-tech-design.md#stream-stable-partial-mask). A partial listener may wait for a safe boundary or the terminal tail while clear listeners already receive text. Never rerun the current complete-string mask on growing prefixes. Physical partial clarity and source/address roles remain fixed even if no readable word has emerged; a terminal zero-word projection remains an indistinct speech account without a quotation. Observer revisions change only when permitted content or lifecycle changes, never to report hidden source length, part count or activity.

The [world-owned pair/singleton rule](worlds/base/speech.md#the-bundled-partial-word-choice) retains the partial tier even when only one word exists. Preparation must handle Unicode and non-space-delimited scripts through a pinned segmentation policy or deterministic documented fallback; do not assume ASCII words. Avoid unbounded span counts by coalescing neighboring gaps/runs under existing speech-byte limits.

Use the [selected world's partial-quotation wording](worlds/base/speech.md#wording-from-permitted-evidence) through shared participant grammar. Never place missing original words in CSS-blurred spans, tooltips, ARIA labels, alternate chat fields or client caches. Placeholder size and caption timing must not disclose the exact hidden text length. Heard fragments stay readable.

Different listeners may legitimately retain different fragments. Their later sharing can reveal more information through ordinary new speech. Merely opening two tabs as the same listener may not.

## 7. Caption component and lifetime

The delivered lightweight speech captions are separate from work/progress notices on the React-over-PlayCanvas world overlay. Reuse projection/anchor utilities and curated semantic icons. Use the normal UI font, white text, quotation marks for actual heard speech, a small outline speech icon, and a restrained contrast backing/outline. No decorative font, italics, typewriter animation, speech-dependent tiny text, or all-caps shouting.

Current directed captions already add a small **To <perceived name>:** line only when the original listener evidence admitted the recipient; sender intent does not disclose a hidden addressee. The accepted SPK presentation reuses that quiet cue with the selected source/target contract, such as `to Ada`, `to you` or a permitted descriptive label. It derives from that observer's stored speech evidence and event-time label, never the current selected Speak target or a global entity name. Ambient speech has no invented recipient. The cue remains distinct from quoted words and has equivalent accessible text; new presentation uses no middle-dot separator. Caption priority may use direct addressing and the player's current reading focus without creating social membership or changing whose speech was perceived.

Initial presentation constants: about 16–18 CSS px before HUD scaling, 280–360 px preferred width constrained to the viewport, two or three visible lines, and a 12–14 px remaining-time ring beside the last line. Move the ring below on narrow layouts. These are layout defaults, not world quantities. The ring counts down, not up, and does not imply a cooldown.

Use [Timed UI](timed-ui.md) for lifetime ownership and [HR04](limits/hearing-and-speech.md#hr04--caption-density-and-lifetime) for the current numerical reading/queue policy. Reading time uses the greater of word-based and character-based estimates for the displayed chunk, plus orientation time, clamped before the user’s reading-time multiplier. Count only display-permitted content, not hidden original words. Labels without linguistic fragments use their permitted display text; they are not forced to a separate duration formula. Split longer permitted utterances into reading chunks without modifying the stored utterance; the ring indicates the current chunk and an unobtrusive continuation cue indicates more. History retains the complete permitted content.

The current overlay allows one active utterance/chunk per identified source presentation, with the per-speaker and overlay active/pending bounds in HR04. Unknown sources must not be grouped using hidden speaker IDs. Use deterministic stable order and active-conversation/direct-address priority for presentation only. Overflow is retained in World Events; it must not suppress evidence, native behavior, or cognition. The caption overlay counts perceived speech from other characters that it dropped or never showed (per-speaker or overlay queue overflow, pending or hidden-by-layout expiry, speech arriving while the tab is hidden, and speech skipped by a reset or reconnect snapshot). A small persistent HUD notice reports that count, for example “3 speech captions weren’t shown”, with **Read speech history**, which opens World Events on the Speech filter, and a dismiss control. The count is a lower bound (“possibly more” when the bounded live event window turned over), excludes the player's own speech, is local to the tab and caption scope, contains no speech text and never replays captions. Speech captions are always enabled; only their reading duration and pause behavior are adjustable. Do not require a sophisticated optimal label-placement solver.

The client measures the condition card, clock and its settings popup, quick actions, camera controls, the Speak/Act text bar and open panels when layout changes. `observeHudLayout` owns those measurements and the condition-card docking height; it publishes only changed rectangles and removes observers/listeners on cleanup. Caption preferences and rectangle updates do not rerun the full scene update. Existing caption nodes retain their measurements when another caption arrives or expires. These rectangles participate in the existing caption placement: try a permitted direction before a neutral fallback when the overhead anchor cannot fit, and preserve reading time while hidden. The scene does not read HUD layout every frame. Broader popup/modal obstruction and assistive-device qualification remain HE05.

Bound deferred presentation by age as well as count. Discard a pending caption or an active caption that has remained layout-hidden for the HR04 unpaused residence window; it remains in World Events. This is a stale-queue rule, not depletion of the reading ring: a visible caption keeps its full reading policy, and manual/presentation pause or a hidden document freezes both clocks. The same overlay clock supplies the comparison; add no interval or world-state timer. This prevents never-fitting old captions from permanently occupying all slots. A shorter delay or promotion of pending urgent speech is later layout tuning, not authority over evidence.

The underlying speech occurrence is instantaneous in v1 and in the accepted NST target. Caption reading duration is not a physical speaking process, action duration, acoustic persistence, or permission to eavesdrop later. Speech captions are displayed only after successful commitment, not on a provider token stream that may be rejected. NST commits approved prefixes before displaying them, then amends the same caption and Events row. An open caption preserves reading progress and receives the selected continuation/lifetime treatment; an append does not allocate another caption, replay earlier words or count as a missed utterance. The [streaming design](projects/npc-speech-streaming-tech-design.md) owns those changes to the current finished-utterance reader.

The previous [NP05 Talk preview](projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md#np05--read-npc-replies-before-generation-finishes) belonged to the removed player transcript. The compact Speak bar does not display provisional speech. Actual audible captions always wait for native commitment; pending reply feedback contains no uncommitted words. The retained provider/preview service contract does not authorize copying provisional text into Events or overhead captions. Historical [verification](verification/npc-reply-preview.md) describes the earlier UI, not current player presentation. The accepted SPK replacement keeps any retained service/request ownership and cancellation tied to permitted source evidence, authority and current state rather than ordinary membership; it does not restore a provisional player transcript.

## 8. Camera-centered directional captions

The player camera determines caption placement; the controlled character’s senses determine whether any text is available. A currently permitted speaker position projects above that person even when the camera is away from the controlled character. If that head cannot fit on screen, use a bounded screen-space ring around the camera viewport center, with an arrow pointing toward the permitted source. After avoiding an open panel or another caption, calculate that arrow from the caption's final position toward the permitted source; the camera-center bearing can point the wrong way when the card moves past an onscreen speaker. Knowing the speaker's name is not required to associate speech with a visible person. This is a reading aid, never a hearing radius or permission to access off-screen world truth. Text remains upright and screen-sized.

An unidentified voice currently supplies eight-sector event-time bearing information, not an exact source position. Preserve that limit: show **Approximate direction heard** when using the admitted bearing and use a neutral readable caption if no trustworthy direction is available. The product question about granting an acoustic location to reproject unknown voices after arbitrary camera translation remains open in the [current feature specification](projects/player-experience-overhaul-feature-spec.md). Until resolved, do not manufacture a camera-relative location from a listener-relative bearing. The accepted SPK stable-identity target does not resolve this location question or grant a source position: a recognized but unlocalized voice retains the same spatial restriction.

Above/Below labels require the sensory policy’s corresponding evidence. Primarily vertical/ambiguous sounds use neutral placement instead of a fabricated horizontal direction. Fit readable text within the viewport and avoid HUD rectangles. Presentation overflow remains recoverable in Events; moving the camera never loses the character’s retained permitted words.

### Historical bearings do not track hidden sources

The bearing belongs to the listener position at event time. Rotating the camera is safe; translating the listener is not permission to recompute the bearing from a hidden source's current or historical exact coordinates. Once the listener moves materially (initial display tolerance 0.5 m), remove the directional arrow and use a neutral recent-speech caption for the remaining reading lifetime. This threshold only affects presentation; no new evidence is granted.

Under the [observer-specific evidence target](projects/perspective-perception-tech-design.md), the saved reference frame also preserves the listener's orientation at acquisition. Turning now cannot change whether an earlier sound was heard on the left. A later view may describe an already permitted fixed world bearing in a new presentation frame only when its precision supports that conversion; it cannot consult the hidden source or turn an old bearing into a current source location. The player-experience designer owns that presentation, with the existing neutral fallback remaining valid.

An overhead caption can follow a speaker only while its current pose remains authorized and its source association was established. On loss of visibility, detach from the live head. Use only previously permitted bearing information from the same event-time frame, or a neutral fallback. Never attach to a last-seen ghost that is secretly moving. An unknown voice must not automatically become identified just because a person enters view during the lingering caption.

## 9. Event-time semantics and delivery

Evaluate each utterance once, inside its native commit, using then-current source/listener pose, physical geometry, sense bindings, acoustic policy and ambient state. Freeze that evidence atomically with the occurrence and dependent mutations. Do not reconstruct historic audiences from current distance, room state, group membership or camera position.

For NST, that commit is the first accepted public prefix. It fixes event identity, original time/order, origin, complete audience, each observer's physical tier, permitted roles/labels and policy pins. Later approved appends preserve that snapshot: original listeners retain the suffix after moving away, while newcomers acquire none of this utterance. A listener's later sleep, incapacity, death, loss of hearing, ordinary departure or replacement body likewise does not recalculate this historical acquisition or create a new account. Current access, control, forgetting, actual account/source retirement and generation checks retain their separate owners; append cannot recreate suppressed evidence. Sensory expiry remains absolute despite an open publication. Current effect eligibility still governs whether a listener can learn or respond at closure. Existing actor/request cancellation remains effective; movement, doors and elapsed generation time introduce no new mechanical speech interruption or per-part geometry check.

The accepted [shared evidence-cut contract](projects/stealth-awareness-tech-design.md#threat-preparedness-and-surprise) also distinguishes source occurrence order from when this observer actually acquired the evidence. A source recorded earlier but acquired after a native decision's cut cannot retroactively warn that decision. Use the existing observation/encounter boundary to expose already acquired support; later awareness insertion, history hydration or model interpretation cannot backfill the cut.

The existing scope model remains authoritative: outward speech is external; private thoughts are owner-private; provider status is system-only. Local observations and model memory tools do not gain raw-event access merely by knowing an event ID.

Use existing post-commit publication and reaction intake. One delivered event can update a caption, history and cognition without committing three copies or admitting two AI responses. A detected murmur is a possible attention cue, not mandatory semantic work. Semantic attention, embedding and Narrator inputs must already be redacted; “ignore the hidden words” in a privileged prompt is insufficient.

NST separates public growth from semantic eligibility. Only human presentation reads accepted open words. When native sound responses are installed, the already-complete permitted acoustic cue reaches their existing native owner once in the first speech transition; append, closure and recovery never repeat that intake or renew sensory expiry. This path receives no open quotation and adds no waking rule. Closure as complete or interrupted makes the retained prefix eligible once for attention, word-derived reactions, every model/context path, recall, embedding and summaries. A durable terminal readiness order uses the existing native order domain while preserving original occurrence chronology; the [reaction owner](events-perception-and-reactions.md#progressive-speech-readiness--accepted-target) governs consumption. Introduction learning uses that exact terminal observer/event capsule and its actually heard complete name, never newest awareness, current sight or a header-only claim. Interrupted accepted words remain evidence; consumers preserve the missing-ending qualification.

Keep the hot bootstrap/SSE feed bounded. It is not the comprehensive historical archive. Prefer an existing committed-event update list or a lightweight addition to its normal patch envelope for new perceived events; do not introduce a speech-only transport. A patch gap triggers scoped history recovery and an honest missed-caption notification, not blind replay of every historical row as a new overhead utterance. The current gap signal is the existing SSE `reset` snapshot (and reconnect bootstrap): the overlay counts permitted speech in that snapshot that it never captioned; no speech-only transport or server-side delivery counter is added.

Deduplicate transient captions by world, controlled actor, save timeline/generation, event ID and chunk index. Clear local queues and clocks on a scope/timeline change. Initial loading, opening World Events, older-page reads and ordinary reconnect history recovery do not replay old captions. Background-tab new events remain in permitted history but do not form a large delayed caption queue on return.

## 10. Persistence, cutover, and integration boundaries

Store speech metadata and event-time projections through existing event/awareness/perspective transactions and current-format saves. Policy pins and privacy fields participate in validation and snapshot capture. Development compatibility follows the [root policy](../AGENTS.md#development-save-policy). Current-format restart/restore preserves listener evidence. A clear-hearing record cannot contain an unintelligible segment; rebuilding its displayed text does not make that contradictory claim valid. Never recompute historical audiences, remask stored utterances or silently reset unsupported state; no parallel legacy runtime or hearing-specific format is introduced.

The accepted NST path saves every approved prefix synchronously before publication, using a trusted native speech amendment that preserves one history identity. Generic text editing remains prohibited. Captures retain lifecycle, exact accepted text, frozen observer segments, mask continuation and terminal readiness through the same owners, including any native acoustic consequences committed at begin. [Save/load](save-and-load.md#progressive-public-speech--accepted-target) closes a captured open utterance as interrupted without replaying generation or native acoustic intake; it does not restore an unscreened suffix or live provider session.

The delivered rich hearing queries distinguish physical exposure, detection and intelligible speech. Preserve that distinction in callers: do not redefine a full-speech eligibility check to mean merely “detected something” while callers still assume full quotes and identity. Audit `say`, teaching eligibility, conversation joins, action catalogue, response fallback, direct-response dispatch, autonomous reaction intake, observation and every context/history projection. A person can be physically present and within detection range without understanding a teaching action. Preserve the owning mechanic's supported requirements; do not grant a recipe from partial words.

Selecting an awareness-qualified event and then rendering `event.text` or `event.data.text` remains a regression hazard, not the intended rich-speech projection. Consumers must project the listener’s stored evidence in the hot view, paginated history, Talk, World Events, narration, cognition, embedding, summaries, social appraisal and promise/commitment handling. The delivered HE02–HE04 integrations are not a requirement to rebuild these paths; remaining coverage belongs to HE05. Shared privileged indexes cannot rank or describe secret words for a listener.

Use one native structured speech-evidence projection and reusable formatters for permitted linguistic content, attribution and recipient roles, with UI-specific formatting outside the domain. Cognition, retrieval, consolidation and human-facing display consume the same permitted facts through their appropriate adapters; do not reconstruct typed roles or quantities by parsing a display sentence. Do not copy schemas/formulas between client and server or add a renderer import to domain code. Brief why-comments should link to the relevant privacy, clock, or event-time section.

## 11. Performance contract

The initial acoustic path is inexpensive scalar math plus existing geometry queries per plausible listener. Use a conservative candidate bound computed from the strongest relevant emission and most sensitive supported listener/floor; include all eligible listeners when no tighter bound can be proved. Source-specific reach replaces the old fixed 10-unit candidate cutoff. High background or barriers may reject candidates later; a conservative broad phase must never miss quiet-region or unusually sensitive listeners.

Reject outside the conservative bound before barrier work. Reuse a valid phase-local spatial index and immutable geometry; never reuse it after unaccounted movement, spawn/removal, sense/profile or relevant geometry changes. Do not cache across arbitrary mutable draft lifetimes. The current [HR03](limits/hearing-and-speech.md#hr03--geometry-reuse) receiver-volume index and finite geometric transfer cache already reuse immutable inputs. They do not cache permission, intelligibility or identity. Further retention/churn optimizations require measured need; a cache miss or retention bound takes the exact path rather than shrinking the audience.

Resolve/tokenize the source once, then mask once per listener. The accepted NST implementation incrementally seals each lexical island once and extends existing masks; it does not rescan sealed text or recalculate hearing on every provider chunk. Perform no geometry, persistence, randomness, model call or history scan per caption animation frame. Reuse the scene's existing update loop for projection and one overlay-level presentation clock. Animate small ring/position properties without rerendering the entire HUD every frame.

Store only perception outcomes required for history/cognition, not every continuous reading. No new distributed cache, queue service, room graph, physics dependency, audio synthesis service, or vector search is needed for this release. Dense acoustic fan-out is real required work; if authority cannot commit within its supported bounds, use explicit admission/backpressure, never silent audience sampling.

### Performance and invalidation

Immutable manifest/sense resolution, per-volume receiver bounds and bounded geometric transfer caches reuse only validated inputs. Receiver IDs rebind to current entities. Speech admission still reads live participation, perception capability and recognition. Cache overflow evaluates the complete query; it never prunes listeners. Main's elapsed-time phases and contribution indexes remain authoritative. Owned append buffers seal at fork/edit/publication boundaries; prepared status predicates cache operators, never live outcomes. Native supply IDs follow the participant roster's invalidation boundaries and read current quantity and visibility.

## Product-scalability attention target

[Attention and scenes](product-scalability/attention-and-scenes.md) adds proposed acoustic competition, stable focus and aggregate commotion through this hearing owner. [PS04](maintainers/product-scalability.md) and [PS-D02](maintainers/decisions/world-and-play.md#product-scalability-integration-choices) own integration and residual choices. Physical overlap needs utterance durations or an explicitly authored alternate rule; caption reading time is not sound duration. Current instantaneous speech, thresholds and listener-specific fragments remain unchanged until the new policy is delivered.

Grouping changes what is distinguishable prospectively, not what a listener already understood. Preserve existing exact speech and permitted fragments; later focus cannot recover unheard words. A coarse background scene may establish gist without an exhaustive ambient transcript, but exact-language mechanics must retain their actual words and source/audience evidence. This does not authorize replacing accepted human messages or foreground NPC utterances with generic chatter.

[DG18's detailed product proposal](projects/attention-and-scenes-feature-spec.md) starts a worthwhile attended gathering using this current exact-speech contract, then specifies a separately admitted prospective gist/aggregate family. [The authored gathering](worlds/base/social-gatherings.md) is a qualification workload, not a new complete-audience cap. HE02/HE04 listener evidence, HR02 audience completeness and HR04 caption overflow/history behavior remain foundations; new focus or scene membership cannot suppress a currently entitled exact fragment. PS04 owns the proposed integration, and actual timed speech remains separate DG26 work.

## 12. Deliberate extension boundaries

Deferred capabilities include timed/streamed physical speech, listening to only a later part of an ongoing sentence, room/portal propagation, reflections/diffraction, frequency bands and audiograms, detailed biometric face/voice analysis, learned or multiple-language competence, lip-reading, speaker amplification, sound-triggered waking/damage, and richer sound-duration/masking models beyond the selected general acoustic contract. Familiarity- and quality-dependent recognition and physical looking/orientation remain selected [stealth and awareness](projects/stealth-awareness-tech-design.md) work. Supported physical sound occurrences, actual movement/posture policies, persistent producers and simultaneous-source masking have a completed [acoustic design](projects/acoustic-stealth-tech-design.md), with implementation and qualification open in ACS. This physical-source selection does not assign acoustic duration to current instantaneous speech. Sight-independent received direct addressing, basic linguistic versus sound-only evidence and memory-independent animal sound intake remain selected SPK integration. Immediate progressive public NPC text is separately selected NST design work, with fixed first-publication hearing and no physical duration; it remains unimplemented. The installed reliable-recognition and sound-only foundations remain current until their coordinated extensions land. These targets are not deferred behind the broader media or physiology features. Animal habituation, trained words, species calls, pack behavior, scent and long-range refuge selection are outside the first response repertoire. Future additions preserve the event/evidence/caption boundaries above.

Presentation choices and acoustic defaults are reversible. No unresolved product choice blocks this specified v1. Unsupported mechanisms remain absent rather than simulated through prose, hidden heuristics, or an LLM.

## Reference basis

These sources support acoustic and accessibility concepts, not the proposed game thresholds or claims of simulation fidelity:

- [NIST SI guide, chapter 8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-8): logarithmic field versus power quantities and explicit references.
- [OSHA technical manual, noise](https://www.osha.gov/otm/section-3-health-hazards/chapter-5): free-field distance attenuation and sound-level combination.
- [ASHA classroom acoustics](https://www.asha.org/public/hearing/classroom-acoustics/): background noise and reverberation affect speech understanding.
- [W3C timing-adjustable guidance](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html): a persistent untimed alternative to transient information.

## Maintained records

- Implementation and acceptance: [HE01–HE05](maintainers/hearing-and-speech.md).
- Accepted speech and social perception target: [feature specification](projects/speech-and-social-perception-feature-spec.md), [technical design](projects/speech-and-social-perception-tech-design.md) and [SPK implementation tracker](maintainers/speech-and-social-perception.md).
- Accepted shared NPC streaming target: [feature specification](projects/npc-speech-streaming-feature-spec.md), [technical design](projects/npc-speech-streaming-tech-design.md), [NST implementation tracker](maintainers/npc-speech-streaming.md) and [streaming limits](limits/npc-speech-streaming.md).
- Shared recognition, exposure and native acquisition target: [stealth and awareness technical design](projects/stealth-awareness-tech-design.md#shared-contracts) and [delivery tracker](maintainers/stealth-awareness.md).
- General physical-sound target: [feature specification](projects/acoustic-stealth-feature-spec.md), [technical design](projects/acoustic-stealth-tech-design.md) and [ACS implementation tracker](maintainers/acoustic-stealth.md).
- Limits and constraints: [hearing, captions and perceived history](limits/hearing-and-speech.md); [selected physical-sound constraints](limits/acoustic-stealth.md).
- Related contracts: [Timed UI](timed-ui.md) and [perceived history](perceived-world-events.md).
- Current integration evidence: [combined verification](verification/hearing-main-integration.md).

## Optional media product proposal

[DG26's voice and call specification](projects/voice-and-calls-feature-spec.md) proposes optional synthesis of exactly the listener's already committed evidence and private reviewed microphone composition. It does not change this document's instantaneous speech, partial words, identity, full audible audience, caption clocks or retained provider/preview-service commitment boundary. A quiet or unidentified rendering never contains hidden original words or a secretly identifying voice.

[HE07](maintainers/hearing-and-speech.md#he07--optional-speech-media-and-selected-hearing-extensions) owns the independently useful media/input stages; a later actual timed doorway exchange consumes PS04's existing time/overlap owner. [NC23](maintainers/narration-and-conversations.md#nc23--consented-private-slate-calls) owns the separately enabled private slate conversation. These are product proposals with adoption, technical/runtime and qualification still open, not delivered media. [VO constraints](limits/hearing-and-speech.md#vo-l01--optional-committed-speech-playback) retain the selected restrictions and unresolved aggregate media bounds.

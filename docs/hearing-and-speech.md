# Hearing, speech evidence, and spatial captions

## Status and ownership

This document specifies the delivered finite audible-speech contract and explicitly named future extensions. The accepted [speech and social perception feature specification](projects/speech-and-social-perception-feature-spec.md) and [technical design](projects/speech-and-social-perception-tech-design.md) select the changes to direct addressing, reliable recognition and native sound reactions described below; those changes remain implementation work in [SPK](maintainers/speech-and-social-perception.md). Numerical defaults are reversible gameplay tuning, owned by the [hearing limits inventory](limits/hearing-and-speech.md). [Architecture](architecture.md#hearing-captions-and-perceived-events), [integration evidence](verification/hearing-main-integration.md) and [the hearing tracker](maintainers/hearing-and-speech.md) distinguish delivered behavior and scoped checks from remaining full-scene, accessibility and live-provider qualification.

This document owns acoustic quantities, speech-perception tiers, volume, listener-specific linguistic evidence, and spatial speech-caption behavior. It specializes the [sensory design](../archive/07-technical-architecture/perception-and-attention.md). [EPR](events-perception-and-reactions.md) retains occurrence scope, acquisition episodes, reaction intake, and scheduling. [Narration and conversations](narration-and-conversations.md) retains ordinary speech interaction, source-linked history and Narrator authority, including the accepted removal of ordinary conversation membership. [Perceived World Events](perceived-world-events.md) owns the player-facing comprehensive event viewer. [Timed UI](timed-ui.md) owns reusable presentation lifetimes and progress rings. No second event bus, speech database, reaction scheduler, or writable copy of world truth is introduced.

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

The first implementation uses an authored uniform ambient background per acoustic policy. Do not invent a world noise-source subsystem just to fill this field. A later bounded room/region/provider can supply the same listener-local value.

When actual overlapping sustained sources are introduced, add their **linear energies**, excluding the evaluated source, and convert back: `10 * log10(sum(10 ** (Li / 10)))`, preferably with a numerically stable maximum-offset formulation. Never add dB values arithmetically. Instantaneous speech events in v1 do not have physical durations, so simultaneous-looking captions must not be treated as overlapping acoustic emitters. Caption lifetime is never a noise duration.

The generic acoustic result supports the accepted SPK target for native animal sound reactions described in section 5. Installed world behavior determines whether a detected sound causes attention, fleeing, continued activity or another supported response. Loudness alone does not introduce hearing injury, waking, glass-breaking, or other mechanics. Those remain separate world laws requiring duration where relevant and ordinary native admission.

## 4. Speech volume and admission

Use `whisper | normal | shout` as the initial player/agent delivery modes. They resolve through an installed source profile; an LLM may choose a supported mode, not an arbitrary source level, listener list, range, or private scope.

Volume is already part of the existing talk operation and native speech admission, not another command family. The following describes the **current runtime fields**, before the SPK cutover to one optional addressee and ambient NPC speech. The [SPK technical design](projects/speech-and-social-perception-tech-design.md) owns that accepted contract and coordinated caller changes. The strict model operation also supplies nullable `selfIntroduction` under [the naming contract](entity-names.md), while native callers may omit that optional claim:

```ts
type SpeechVolume = 'whisper' | 'normal' | 'shout';

// Current speech fields within the existing agent talk operation.
talk: {
  text: string;
  addresseeEntityId: string;
  volume: SpeechVolume;
  selfIntroduction: string | null;
}
```

The compact player Speak bar has an explicitly labeled volume selector, default Normal. A client omission may normalize to Normal at input admission for ergonomic callers; strict model schemas must match their declared required/nullable-field contract. Propagate the selected mode through commands, response adapters, receipts, retry digests, committed speech metadata, and projections. Do not infer physical delivery from “I whisper” written in dialogue or change it from text styling.

An addressed utterance is still external sound. Conversation membership, intended addressee, importance, and request priority never grant acoustic access. A whisper is not an access-control private message. The speaker receives self-expression evidence for its own accepted words, distinct from proof of hearing its own voice; this also accommodates a speaking actor without hearing.

### Received direct addressing — accepted target

Every committed utterance has its speaker and either one intended addressee or none. The target is communicative intent, not a list of listeners, accepted social membership or a required reply. For a listener using the selected linguistic social-perception policy, detecting an utterance unambiguously establishes whether it was ambient or directed. If that listener is the actual addressee, its permitted experience records that the speaker addressed it. Sight and intelligible words are not additional prerequisites for knowing this role: the interaction carries the equivalent of an explicit audible address. If the sound is undetected, the marker creates no heard experience and does not deliver a message through a wall or beyond range. A sound-only animal detector retains its separate nonlinguistic projection below.

The address cue grants no missing words, canonical name, exact location, full delivery classification or extra acoustic reach. Detection, intelligibility, source association, recognition, a known name and being addressed remain separate facts. The selected ordinary linguistic policy establishes or reuses the speaker's stable individual identity on first audible detection, even unseen and without intelligible words; prior familiarity is not required. A recipient can therefore know that the same unnamed individual addressed it while retaining only indistinct sound or partial words. Another linguistic listener obtains the third-party recipient's identity only through permitted sight of that recipient at the occurrence; seeing the speaker is unnecessary. Prior familiarity with a currently unseen recipient does not grant that fact. Otherwise retain directed-to-someone-else without a target binding, never ambient speech or an unobserved raw target. The speaker preserves its own selected target, and the actual hearing addressee always knows its own addressed role. Speaker and optional known addressee use the one source/target role contract in the [technical design](projects/speech-and-social-perception-tech-design.md#4-listener-evidence-and-sound-detection); no parallel intended-recipient identity is stored.

The target actor may answer, act, think, defer or continue without responding under its existing cognition and native behavior policies. Ambient and overheard speech may also prompt a voluntary response when the content, situation and character warrant it. No ordinary speech field enrolls a social group or purchases a mandatory reply. [SSP-H01](limits/hearing-and-speech.md#ssp-h01--received-direct-addressing) owns the restriction and its current-runtime gap. Player composition availability is the separate [Speak/Act admission policy](narration-and-conversations.md#player-speak-and-descriptive-act).

An out-of-range addressed reply may still be spoken aloud. The accepted one-target contract records its original intended recipient directly, removing the current not-heard/intendedRecipientId fallback rather than renaming it. Preserve whisper/shout mode and all emission semantics; never escalate volume or teleport words to the recipient. Revalidate the speaker's capability, life/sleep state and event-time geometry when committing a generated reply. A valid intended recipient need not possess memory, speech or effective hearing. The actual dispatch guards must admit a heard direct call with no understood words so clarification is possible; an undetected or seen-only cue creates no directed reply request. Use the existing independent component-outcome and paid-execution boundaries.

The speaker does not receive an omniscient list of listeners. Likewise, an actual recipient ID is not automatically a _perceived_ recipient identity for an eavesdropper. Addressed/overheard reaction cues must be derived from evidence available to that listener, without exposing hidden communicative intent.

## 5. One occurrence, listener-specific evidence

Speech remains `WorldEvent.type === 'speech'`. The world event contains actual utterance data and the existing immutable event-time origin, identity, order, and scope. Add resolved volume, source profile/version and source level to its typed speech data; do not duplicate common event-envelope fields or create a parallel speech log.

For each eligible listener, native perception produces one actor/event awareness result, with different fields permitted for different listeners. Hearing detection is not the same as speaker recognition, spatial localization, or intelligibility.

The following is a conceptual **safe projection**, not a second persisted event schema:

```ts
type SpeechSegment = { kind: 'heard'; text: string } | { kind: 'unintelligible' };

type PerceivedSpeech = {
  intelligibility: 'none' | 'partial' | 'clear';
  segments: SpeechSegment[];
  speaker: { entityId: string; nameAtTime: string } | null;
  delivery: SpeechVolume | null;
  direction: {
    sector: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
    elevation: 'above' | 'level' | 'below' | 'unknown';
  } | null;
};
```

The host stores sufficient immutable observer-local facts to reproduce that projection: permitted fragments, recognition/association, permitted delivery, coarse bearing, listener pose at acquisition if needed, and policy version. Under the accepted SPK target this includes the observer's permitted speaker/addressee roles and identity/name distinctions; the example above is the current projection, not the complete target schema. Reuse the existing awareness/perspective persistence boundary. The raw occurrence may keep private source/target metadata; safe DTOs and model references may not simply spread that metadata. The full structured permitted experience survives memory hydration and consolidation under the [memory contract](memory-architecture.md#structured-permitted-experience); a colloquial caption or memory sentence is a reusable rendering of that evidence, never its sole semantic source.

Exact dB measurements, source level, exact hidden coordinates, hidden source/target IDs, original word offsets/counts, mask seed and full unredacted text are not required in the public projection. Ordinary hearing does not become a rangefinder or a technical inspection tool. Administrative diagnostics remain separately authorized and never teach an actor.

The controlled actor, NPCs, context builders, attention, recall, embeddings, summaries, Narrator, event history, and UI all consume compatible listener-specific evidence. Perceived speech is evidence that words were spoken, not that a speaker's claim is true.

### Source and delivery recognition

The **current runtime** associates an utterance with a speaker when permitted visual evidence at emission establishes that source, or an already-supported recognition mechanism does so. The accepted SPK target's [base-world stable recognition policy](worlds/base/knowledge.md#identity-and-recognition) establishes or reuses a stable individual speaker identity for every actual ordinary linguistic hearing detector, including first encounter, unseen speech and zero intelligible words. Neither previous familiarity nor visual association is a prerequisite. The identity means the same individual can be distinguished later; it supplies no proper name, location, inventory or other hidden facts. The native selected policy grants this association explicitly, and generic projections still cannot spread raw source IDs as a fallback. A nonlinguistic animal or a world selecting a different supported policy can retain an unidentified source. Physical face/voice analysis, disguise and mistaken-identity simulation remain separate extensions.

Delivery labels require a permitted delivery cue. A faint ordinary voice is not a whisper. Current v1 exposes the authored delivery mode for the speaker’s own utterance, or when another listener visually associates the source and detects its speech; otherwise delivery is absent. Clear words alone do not grant hidden-speaker identity or delivery mode. Visual-only detection does not justify “John is whispering.” A later acoustic delivery-recognition rule needs its own supported policy; a model cannot supply another listener’s recognition result.

A later identification under a policy that originally withheld identity is new evidence. It does not rewrite the original utterance's fragments or retroactively convert all unknown historical voices to a currently visible actor. Initialization must preserve deliberately absent source/target roles rather than treating them as missing data to repair. The selected ordinary linguistic rule instead records its granted speaker identity at acquisition.

### Editing committed speech

Generic event and awareness editors must not rewrite committed speech text or content independently of the listener capsule. Reject such rewrites clearly; existing guarded deletion and awareness-importance edits remain permitted. A correction spoken in the world is a new event, not a retroactive hearing upgrade. A dedicated administrative re-authoring operation needs explicit semantics for already-perceived fragments and their dependents; that unresolved extension is recorded in [D66](../archive/05-project/open-decisions.md#d66--re-authoring-committed-speech).

### Selected attributed correction proposal

[DG25](projects/corrections-and-shared-restoration-feature-spec.md) proposes ordinary new-event correction as the first consumer of D66. The optional Correct what you said control prepares an unsent new utterance by the currently controlled speaker; normal current speaking/hearing applies. Its first history links are private to that speaker. Other listeners obtain actual new words, with no retrospective fragment, identity, relationship or hearing upgrade. An ordinary clarification does not automatically invoke the existing administrative memory-correction operation or repair appraisals, agreements and later choices.

The accepted [creator-edit policy](projects/creator-edit-propagation-feature-spec.md#accepted-policy) forbids automatic semantic memory cascades after ordinary creator edits. Existing explicit dependencies, selected forgetting and guarded administrative memory operations retain their distinct authority. [HE06](maintainers/hearing-and-speech.md#he06--attributed-correction) owns the proposed optional consumer; [HC-L01–HC-L05](limits/hearing-and-speech.md#hc-l01--correction-through-actual-speech) records its constraints. Administrative inline retcon remains unselected; a deliberately different whole fictional history uses an actually supported retained-world restore under SL, independently of ordinary speech.

### Native behavior and sleep

Retain applicable sleep/life/sense gates for conscious acquisition. An asleep listener does not receive full speech simply because a level crossed a threshold. Loud-sound waking remains a future native policy.

The current ordinary native animal constructor disables cognition, autobiographical memory, inner-world writing and speech; current speech audience/evidence selection also requires memory capability. Its existing attack escape therefore does not establish a sound-reaction implementation. [SPK07–SPK08](maintainers/speech-and-social-perception.md) removes memory-based acoustic eligibility and connects permitted sound to the selected native response owner while leaving cognitive capabilities disabled; this is not delivered runtime behavior.

### Selected animal hearing and choices — accepted target

Physical acoustic eligibility is independent of autobiographical memory, linguistic understanding, cognition and speech capability. Reuse one physical exposure calculation and the existing actor/event awareness owner. Speech is the first production emitter: the same occurrence supplies linguistic evidence where supported and an animal's sound-only evidence. A native non-speech fixture proves the generic contract; other production noises remain separately selected emitter work. [SSP-H02](limits/hearing-and-speech.md#ssp-h02--sound-reactions-without-autobiographical-memory) owns this distinction.

A bundled ordinary animal receives actual intensity/margins, coarse direction or null and any legitimately associated visible source. It receives no words, intended addressee, proper human name, hidden source ID/coordinates or inferred source distance/delivery. Identical supported acoustics/visible facts cannot make it distinguish a spoken threat from a greeting. One sound-only awareness record remains valid when the source occurrence is speech. Validators, SQL, public projection and rendering must admit this representation without fabricating a linguistic payload or substituting raw world-event text. The shared sound renderer presents only permitted acoustic meaning.

Ordinary animals keep native control and disabled cognition, autobiographical memory, inner-world writing, language and speech. The [bundled animal acoustic policy](worlds/base/animal-sound-responses.md) extends the single selected native response profile with exact hearing/reaction bindings. The separate [CTR03–CTR04 native animal design](https://github.com/Macrofold/OpenLegend/blob/ff68a9b4035bff08025af7b0b579fe2316ed1263/docs/projects/combat-and-threat-responses-tech-design.md#native-animal-execution-ctr03ctr04) owns the shared alarm, complete perceived danger set, reachable refuges, speeds, continuous-safe settling and movement/flight continuation. It is a pinned unmerged design dependency, not delivered runtime. SPK supplies its now-selected ordinary-speech trigger without importing unrelated combat work.

Initial outcomes are continue current behavior or enter/update that shared alarm. A skittish profile can flee from detected speech while a calmer profile continues until its acoustic threshold is met. Native policy can produce actual retreat, alert settling or blocked behavior without narrating human thoughts. This replaces the earlier SPK animal AI/independent hold/approach/flight plan. Distinct curiosity approaches, listening holds and exceptional cognitive creatures remain documented future repertoire.

Every acquired occurrence retains its own sensory record and absolute expiry. The native owner separately groups qualifying source-or-anonymous/direction/intensity patterns under the exact [world repetition algorithm](worlds/base/animal-sound-responses.md#repeated-sound-without-repeated-behavior-work). Exclude self, subthreshold and null-response-profile cues from pattern retention after recording their actual exposure. Repeated active patterns do not reset safe time, replace routes or draw randomness; a new qualifying pattern can update the one alarm. A/B/A/B is retained as two patterns instead of repeated alternation work. No hidden source IDs, paid opportunity revisions, actor model ticket or human new-memory wake route is introduced. [SSP-H03](limits/hearing-and-speech.md#ssp-h03--short-sensory-retention-and-complete-detection) and [SSP-H04](limits/hearing-and-speech.md#ssp-h04--acoustic-scene-coalescing) record the separate lifetimes and growth limits.

A heard bearing supplies a route preference, never a guessed source point or distance. All actually perceived dangerous bodies constrain the same refuge selection; a second human can make the apparent away direction unsafe. Null direction still permits an admitted route under existing heading/order, without claiming localization. Reuse the native owner's actual safety/blocked/settling conditions instead of the superseded fixed sound-flight stop. [SSP-H05](limits/hearing-and-speech.md#ssp-h05--admitted-animal-choice-bounds), [SSP-H06](limits/hearing-and-speech.md#ssp-h06--animal-profiles-and-native-continuation) and the [technical integration](projects/speech-and-social-perception-tech-design.md#10-animal-sound-and-cognition-integration) own the relevant implementation boundaries.

Native detection and reactions require no AI calls and continue through provider outage. The separate player freeform availability gate remains enforced. Busy, moving, perched and airborne animals can still sense; life, sleep and other perception-blocking capabilities remain authoritative, and this slice adds no sound waking. Save sensory expiry, native pattern state and the existing alarm/cause/refuge/movement relationships coherently. Restore does not replay sound, reset settling or draw again. An active episode's minimal permitted cue may outlive optional sensory retention without creating permanent animal memory.

## 6. Partial text and privacy

For the partial tier, reveal approximately half the words in short contiguous runs, retaining original order. Replace missing runs with opaque unintelligible segments; never generate replacement words or guess missing grammar. Clearly mark the overall sentence as partial. In particular, a missing negation must not turn the remaining fragment into an authoritative promise, threat, teaching result, or commitment.

The current mask is chosen once at commitment by a versioned event/listener-local deterministic stream, keyed from the world seed and occurrence/listener identity without consuming the shared simulation RNG. Persist the projected result. Rendering, history reloads, reconnects, reflections, camera motion and later policy changes never reroll it. Do not persist a bare seed and later retokenize historical speech under a different algorithm.

For two or more lexical units, expose a bounded count near 50%, while retaining at least one hidden unit. A one-word utterance cannot be half readable: use a stable approximately 50% reveal-or-gap decision, still flagged partial. Tokenization must handle Unicode and non-space-delimited scripts through a pinned segmentation policy or deterministic documented fallback; do not assume ASCII words. Avoid unbounded span counts by coalescing neighboring gaps/runs under existing speech-byte limits.

Render missing segments as `[…]` by default, or blur neutral placeholder glyphs for the requested visual effect. Never place missing original words in CSS-blurred spans, tooltips, ARIA labels, alternate chat fields or client caches. Placeholder size and caption timing must not disclose the exact hidden text length. Heard fragments stay readable.

Different listeners may legitimately retain different fragments. Their later sharing can reveal more information through ordinary new speech. Merely opening two tabs as the same listener may not.

## 7. Caption component and lifetime

The delivered lightweight speech captions are separate from work/progress notices on the React-over-PlayCanvas world overlay. Reuse projection/anchor utilities and curated semantic icons. Use the normal UI font, white text, quotation marks for actual heard speech, a small outline speech icon, and a restrained contrast backing/outline. No decorative font, italics, typewriter animation, speech-dependent tiny text, or all-caps shouting.

Current directed captions already add a small **To <perceived name>:** line only when the original listener evidence admitted the recipient; sender intent does not disclose a hidden addressee. The accepted SPK presentation reuses that quiet cue with the selected source/target contract, such as `to Ada`, `to you` or a permitted descriptive label. It derives from that observer's stored speech evidence and event-time label, never the current selected Speak target or a global entity name. Ambient speech has no invented recipient. The cue remains distinct from quoted words and has equivalent accessible text; new presentation uses no middle-dot separator. Caption priority may use direct addressing and the player's current reading focus without creating social membership or changing whose speech was perceived.

Initial presentation constants: about 16–18 CSS px before HUD scaling, 280–360 px preferred width constrained to the viewport, two or three visible lines, and a 12–14 px remaining-time ring beside the last line. Move the ring below on narrow layouts. These are layout defaults, not world quantities. The ring counts down, not up, and does not imply a cooldown.

Use [Timed UI](timed-ui.md) for lifetime ownership and [HR04](limits/hearing-and-speech.md#hr04--caption-density-and-lifetime) for the current numerical reading/queue policy. Reading time uses the greater of word-based and character-based estimates for the displayed chunk, plus orientation time, clamped before the user’s reading-time multiplier. Count only display-permitted content, not hidden original words. Labels without linguistic fragments use their permitted display text; they are not forced to a separate duration formula. Split longer permitted utterances into reading chunks without modifying the stored utterance; the ring indicates the current chunk and an unobtrusive continuation cue indicates more. History retains the complete permitted content.

The current overlay allows one active utterance/chunk per identified source presentation, with the per-speaker and overlay active/pending bounds in HR04. Unknown sources must not be grouped using hidden speaker IDs. Use deterministic stable order and active-conversation/direct-address priority for presentation only. Overflow is retained in World Events; it must not suppress evidence, native behavior, or cognition. The caption overlay counts perceived speech from other characters that it dropped or never showed (per-speaker or overlay queue overflow, pending or hidden-by-layout expiry, speech arriving while the tab is hidden, and speech skipped by a reset or reconnect snapshot). A small persistent HUD notice reports that count, for example “3 speech captions weren’t shown”, with **Read speech history**, which opens World Events on the Speech filter, and a dismiss control. The count is a lower bound (“possibly more” when the bounded live event window turned over), excludes the player's own speech, is local to the tab and caption scope, contains no speech text and never replays captions. Speech captions are always enabled; only their reading duration and pause behavior are adjustable. Do not require a sophisticated optimal label-placement solver.

The client measures the condition card, clock and its settings popup, quick actions, camera controls, the Speak/Act text bar and open panels when layout changes. `observeHudLayout` owns those measurements and the condition-card docking height; it publishes only changed rectangles and removes observers/listeners on cleanup. Caption preferences and rectangle updates do not rerun the full scene update. Existing caption nodes retain their measurements when another caption arrives or expires. These rectangles participate in the existing caption placement: try a permitted direction before a neutral fallback when the overhead anchor cannot fit, and preserve reading time while hidden. The scene does not read HUD layout every frame. Broader popup/modal obstruction and assistive-device qualification remain HE05.

Bound deferred presentation by age as well as count. Discard a pending caption or an active caption that has remained layout-hidden for the HR04 unpaused residence window; it remains in World Events. This is a stale-queue rule, not depletion of the reading ring: a visible caption keeps its full reading policy, and manual/presentation pause or a hidden document freezes both clocks. The same overlay clock supplies the comparison; add no interval or world-state timer. This prevents never-fitting old captions from permanently occupying all slots. A shorter delay or promotion of pending urgent speech is later layout tuning, not authority over evidence.

The underlying speech occurrence is instantaneous in v1. Caption reading duration is not a physical speaking process, action duration, acoustic persistence, or permission to eavesdrop later. Speech captions are displayed only after successful commitment, not on a provider token stream that may be rejected.

The previous [NP05 Talk preview](projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md#np05--read-npc-replies-before-generation-finishes) belonged to the removed player transcript. The compact Speak bar does not display provisional speech. Actual audible captions always wait for native commitment; pending reply feedback contains no uncommitted words. The retained provider/preview service contract does not authorize copying provisional text into Events or overhead captions. Historical [verification](verification/npc-reply-preview.md) describes the earlier UI, not current player presentation. The accepted SPK replacement keeps any retained service/request ownership and cancellation tied to permitted source evidence, authority and current state rather than ordinary membership; it does not restore a provisional player transcript.

## 8. Camera-centered directional captions

The player camera determines caption placement; the controlled character’s senses determine whether any text is available. A currently permitted speaker position projects above that person even when the camera is away from the controlled character. If that head cannot fit on screen, use a bounded screen-space ring around the camera viewport center, with an arrow pointing toward the permitted source. After avoiding an open panel or another caption, calculate that arrow from the caption's final position toward the permitted source; the camera-center bearing can point the wrong way when the card moves past an onscreen speaker. Knowing the speaker's name is not required to associate speech with a visible person. This is a reading aid, never a hearing radius or permission to access off-screen world truth. Text remains upright and screen-sized.

An unidentified voice currently supplies eight-sector event-time bearing information, not an exact source position. Preserve that limit: show **Approximate direction heard** when using the admitted bearing and use a neutral readable caption if no trustworthy direction is available. The product question about granting an acoustic location to reproject unknown voices after arbitrary camera translation remains open in the [current feature specification](projects/player-experience-overhaul-feature-spec.md). Until resolved, do not manufacture a camera-relative location from a listener-relative bearing. The accepted SPK stable-identity target does not resolve this location question or grant a source position: a recognized but unlocalized voice retains the same spatial restriction.

Above/Below labels require the sensory policy’s corresponding evidence. Primarily vertical/ambiguous sounds use neutral placement instead of a fabricated horizontal direction. Fit readable text within the viewport and avoid HUD rectangles. Presentation overflow remains recoverable in Events; moving the camera never loses the character’s retained permitted words.

### Historical bearings do not track hidden sources

The bearing belongs to the listener position at event time. Rotating the camera is safe; translating the listener is not permission to recompute the bearing from a hidden source's current or historical exact coordinates. Once the listener moves materially (initial display tolerance 0.5 m), remove the directional arrow and use a neutral recent-speech caption for the remaining reading lifetime. This threshold only affects presentation; no new evidence is granted.

An overhead caption can follow a speaker only while its current pose remains authorized and its source association was established. On loss of visibility, detach from the live head. Use only previously permitted bearing information from the same event-time frame, or a neutral fallback. Never attach to a last-seen ghost that is secretly moving. An unknown voice must not automatically become identified just because a person enters view during the lingering caption.

## 9. Event-time semantics and delivery

Evaluate each utterance once, inside its native commit, using then-current source/listener pose, physical geometry, sense bindings, acoustic policy and ambient state. Freeze that evidence atomically with the occurrence and dependent mutations. Do not reconstruct historic audiences from current distance, room state, group membership or camera position.

The existing scope model remains authoritative: outward speech is external; private thoughts are owner-private; provider status is system-only. Local observations and model memory tools do not gain raw-event access merely by knowing an event ID.

Use existing post-commit publication and reaction intake. One delivered event can update a caption, history and cognition without committing three copies or admitting two AI responses. A detected murmur is a possible attention cue, not mandatory semantic work. Semantic attention, embedding and Narrator inputs must already be redacted; “ignore the hidden words” in a privileged prompt is insufficient.

Keep the hot bootstrap/SSE feed bounded. It is not the comprehensive historical archive. Prefer an existing committed-event update list or a lightweight addition to its normal patch envelope for new perceived events; do not introduce a speech-only transport. A patch gap triggers scoped history recovery and an honest missed-caption notification, not blind replay of every historical row as a new overhead utterance. The current gap signal is the existing SSE `reset` snapshot (and reconnect bootstrap): the overlay counts permitted speech in that snapshot that it never captioned; no speech-only transport or server-side delivery counter is added.

Deduplicate transient captions by world, controlled actor, save timeline/generation, event ID and chunk index. Clear local queues and clocks on a scope/timeline change. Initial loading, opening World Events, older-page reads and ordinary reconnect history recovery do not replay old captions. Background-tab new events remain in permitted history but do not form a large delayed caption queue on return.

## 10. Persistence, cutover, and integration boundaries

Store speech metadata and event-time projections through existing event/awareness/perspective transactions and current-format saves. Policy pins and privacy fields participate in validation and snapshot capture. Development compatibility follows the [root policy](../AGENTS.md#development-save-policy). Current-format restart/restore preserves listener evidence. Never recompute historical audiences, remask stored utterances or silently reset unsupported state; no parallel legacy runtime or hearing-specific format is introduced.

The delivered rich hearing queries distinguish physical exposure, detection and intelligible speech. Preserve that distinction in callers: do not redefine a full-speech eligibility check to mean merely “detected something” while callers still assume full quotes and identity. Audit `say`, teaching eligibility, conversation joins, action catalogue, response fallback, direct-response dispatch, autonomous reaction intake, observation and every context/history projection. A person can be physically present and within detection range without understanding a teaching action. Preserve the owning mechanic's supported requirements; do not grant a recipe from partial words.

Selecting an awareness-qualified event and then rendering `event.text` or `event.data.text` remains a regression hazard, not the intended rich-speech projection. Consumers must project the listener’s stored evidence in the hot view, paginated history, Talk, World Events, narration, cognition, embedding, summaries, social appraisal and promise/commitment handling. The delivered HE02–HE04 integrations are not a requirement to rebuild these paths; remaining coverage belongs to HE05. Shared privileged indexes cannot rank or describe secret words for a listener.

Use one native structured speech-evidence projection and reusable formatters for permitted linguistic content, attribution and recipient roles, with UI-specific formatting outside the domain. Cognition, retrieval, consolidation and human-facing display consume the same permitted facts through their appropriate adapters; do not reconstruct typed roles or quantities by parsing a display sentence. Do not copy schemas/formulas between client and server or add a renderer import to domain code. Brief why-comments should link to the relevant privacy, clock, or event-time section.

## 11. Performance contract

The initial acoustic path is inexpensive scalar math plus existing geometry queries per plausible listener. Use a conservative candidate bound computed from the strongest relevant emission and most sensitive supported listener/floor; include all eligible listeners when no tighter bound can be proved. Source-specific reach replaces the old fixed 10-unit candidate cutoff. High background or barriers may reject candidates later; a conservative broad phase must never miss quiet-region or unusually sensitive listeners.

Reject outside the conservative bound before barrier work. Reuse a valid phase-local spatial index and immutable geometry; never reuse it after unaccounted movement, spawn/removal, sense/profile or relevant geometry changes. Do not cache across arbitrary mutable draft lifetimes. The current [HR03](limits/hearing-and-speech.md#hr03--geometry-reuse) receiver-volume index and finite geometric transfer cache already reuse immutable inputs. They do not cache permission, intelligibility or identity. Further retention/churn optimizations require measured need; a cache miss or retention bound takes the exact path rather than shrinking the audience.

Resolve/tokenize the source once, then mask once per listener. Perform no geometry, persistence, randomness, model call or history scan per caption animation frame. Reuse the scene's existing update loop for projection and one overlay-level presentation clock. Animate small ring/position properties without rerendering the entire HUD every frame.

Store only perception outcomes required for history/cognition, not every continuous reading. No new distributed cache, queue service, room graph, physics dependency, audio synthesis service, or vector search is needed for this release. Dense acoustic fan-out is real required work; if authority cannot commit within its supported bounds, use explicit admission/backpressure, never silent audience sampling.

### Performance and invalidation

Immutable manifest/sense resolution, per-volume receiver bounds and bounded geometric transfer caches reuse only validated inputs. Receiver IDs rebind to current entities. Speech admission still reads live participation, perception capability and recognition. Cache overflow evaluates the complete query; it never prunes listeners. Main's elapsed-time phases and contribution indexes remain authoritative. Owned append buffers seal at fork/edit/publication boundaries; prepared status predicates cache operators, never live outcomes. Native supply IDs follow the participant roster's invalidation boundaries and read current quantity and visibility.

## Product-scalability attention target

[Attention and scenes](product-scalability/attention-and-scenes.md) adds proposed acoustic competition, stable focus and aggregate commotion through this hearing owner. [PS04](maintainers/product-scalability.md) and [PS-D02](../archive/05-project/open-decisions.md#product-scalability-integration-choices) own integration and residual choices. Physical overlap needs utterance durations or an explicitly authored alternate rule; caption reading time is not sound duration. Current instantaneous speech, thresholds and listener-specific fragments remain unchanged until the new policy is delivered.

Grouping changes what is distinguishable prospectively, not what a listener already understood. Preserve existing exact speech and permitted fragments; later focus cannot recover unheard words. A coarse background scene may establish gist without an exhaustive ambient transcript, but exact-language mechanics must retain their actual words and source/audience evidence. This does not authorize replacing accepted human messages or foreground NPC utterances with generic chatter.

[DG18's detailed product proposal](projects/attention-and-scenes-feature-spec.md) starts a worthwhile attended gathering using this current exact-speech contract, then specifies a separately admitted prospective gist/aggregate family. [The authored gathering](worlds/base/social-gatherings.md) is a qualification workload, not a new complete-audience cap. HE02/HE04 listener evidence, HR02 audience completeness and HR04 caption overflow/history behavior remain foundations; new focus or scene membership cannot suppress a currently entitled exact fragment. PS04 owns the proposed integration, and actual timed speech remains separate DG26 work.

## 12. Deliberate extension boundaries

Deferred capabilities include timed/streamed physical speech, listening to only a later part of an ongoing sentence, room/portal propagation, reflections/diffraction, frequency bands and audiograms, physical voice-recognition analysis, learned or multiple-language competence, head orientation, lip-reading, speaker amplification, sound-triggered waking/damage, and accurate sound-duration/masking processes. Stable recognition, sight-independent received direct addressing, basic separation of linguistic versus sound-only evidence, and memory-independent animal sound intake and decisions are selected SPK work, not deferred behind those media or physiology features. Animal habituation, trained words, species calls, pack behavior, scent and long-range refuge selection are outside the first response repertoire. Future additions preserve the event/evidence/caption boundaries above.

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
- Limits and constraints: [hearing, captions and perceived history](limits/hearing-and-speech.md).
- Related contracts: [Timed UI](timed-ui.md) and [perceived history](perceived-world-events.md).
- Current integration evidence: [combined verification](verification/hearing-main-integration.md).

## Optional media product proposal

[DG26's voice and call specification](projects/voice-and-calls-feature-spec.md) proposes optional synthesis of exactly the listener's already committed evidence and private reviewed microphone composition. It does not change this document's instantaneous speech, partial words, identity, full audible audience, caption clocks or retained provider/preview-service commitment boundary. A quiet or unidentified rendering never contains hidden original words or a secretly identifying voice.

[HE07](maintainers/hearing-and-speech.md#he07--optional-speech-media-and-selected-hearing-extensions) owns the independently useful media/input stages; a later actual timed doorway exchange consumes PS04's existing time/overlap owner. [NC23](maintainers/narration-and-conversations.md#nc23--consented-private-slate-calls) owns the separately enabled private slate conversation. These are product proposals with adoption, technical/runtime and qualification still open, not delivered media. [VO constraints](limits/hearing-and-speech.md#vo-l01--optional-committed-speech-playback) retain the selected restrictions and unresolved aggregate media bounds.

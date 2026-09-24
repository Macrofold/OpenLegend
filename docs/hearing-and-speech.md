# Hearing, speech evidence, and spatial captions

## Status and ownership

This is the accepted target design for the audible-speech feature. Numerical defaults are explicit, reversible gameplay tuning. The delivered slice and remaining limits are documented in [Architecture](architecture.md#hearing-captions-and-perceived-events); [Verification](verification.md#hearing-runtime-and-performance) distinguishes native/offline DOM evidence from pending full-scene and live-provider qualification.

This document owns acoustic quantities, speech-perception tiers, volume, listener-specific linguistic evidence, and spatial speech-caption behavior. It specializes the [sensory design](../archive/07-technical-architecture/perception-and-attention.md). [EPR](events-perception-and-reactions.md) retains occurrence scope, acquisition episodes, reaction intake, and scheduling. [Narration and conversations](narration-and-conversations.md) retains conversation membership, event retention, and Narrator authority. [Perceived World Events](perceived-world-events.md) owns the player-facing comprehensive event viewer. [Timed UI](timed-ui.md) owns reusable presentation lifetimes and progress rings. No second event bus, speech database, reaction scheduler, or writable copy of world truth is introduced.

Delivery dependencies and implementation stages belong in [the hearing tracker](maintainers/hearing-and-speech.md). Deferred automated coverage belongs in [maintainer TODO](maintainers/TODO.md#hearing-captions-and-perceived-events--deferred-validation).

## 1. Product behavior

Committed speech from any speech-capable entity, including the controlled character, can produce a caption. Caption content is what this listener perceived, not necessarily what the speaker actually said. Speech also appears in the player's World Events history; its Speech filter is the world conversation log. A conversation's Talk panel is a narrower view of the same permitted evidence.

A visible, associated speaker receives a plain caption above its head. Speech from an unseen, unrecognized, or off-camera source uses the listener-centered directional presentation in section 8 when a bearing is available. Missing bearing produces a neutral nearby-caption fallback. Identity, localization, and understanding are independent.

| Perception | Example presentation |
| --- | --- |
| Clear words, visible associated speaker | Speech icon and `“Meet me behind the mill.”` above the speaker |
| Clear words, unidentified source | `You hear someone talking nearby: “Meet me behind the mill.”` on the directional ring, when localized |
| Partial words, unidentified source | `You partly hear someone nearby: “Meet me […] mill.”` |
| Detected speech, no intelligible words | `You hear indistinct speech nearby.` No quotation |
| Recognized speaker and delivery, no words | `John is whispering something.` No quotation |
| No sound detected | No auditory caption or heard evidence |
| A separately permitted visible speaking action, without sound | `John appears to be speaking.` Visual evidence only |

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

| Margin using provisional default thresholds | Outcome | Allowed words |
| --- | --- | --- |
| Below 0 dB | Undetected | None; no heard entry |
| At least 0, below 6 dB | Detected, unintelligible | None; descriptive auditory evidence |
| At least 6, below 12 dB | Partial | Approximately 50% of words, as stable fragments |
| At least 12 dB | Clear | Full linguistic content within supported language capability |

Boundary equality belongs to the higher tier. These thresholds are **gameplay choices**, not universal human intelligibility thresholds. Preserve the continuous measurements so future policies can use more bands, a different partial fraction, or a continuous intelligibility curve without changing event identity or caption contracts. No per-decibel awareness event is emitted.

Background noise matters: the same received level can be clear in a quiet room and unintelligible near machinery. The initial floor model is the maximum above, not a physical summation of an audiogram with external sound. Future frequency-dependent hearing, reverberation, directionality, and language comprehension must not be misrepresented as already simulated.

### Initial default-world tuning

Start with normal speech at 60 dB SPL at one metre, whispering at 40, shouting at 75, background at 28, and listener floor at 0. These are authored presets, not claims about every real person or environment.

With no barriers, these defaults imply approximately:

| Delivery | Clear words through | Some words through | Speech detection through |
| --- | ---: | ---: | ---: |
| Whisper | 1.0 m | 2.0 m | 4.0 m |
| Normal | 10.0 m | 20.0 m | 39.8 m |
| Shout | 56.2 m | 112.2 m | 223.9 m |

The normal clear boundary intentionally retains the existing unobstructed 10-unit baseline. This does **not** preserve the old obstruction gate or add an undocumented 10-unit hard cap. Shouting can reach an entire small map. Tune source presets or world acoustic policy if that is undesirable; never silently truncate an otherwise authorized audience as a performance optimization.

## 3. Geometry, attenuation, and noise

Reuse the native spatial provider and its ordered sound crossings. Sight blockers are not automatically soundproof; camera floor cutaways never remove physical slabs.

For the new pinned acoustic policy, define the existing `acousticTransmission` coefficient explicitly as a **broadband energy/intensity transmission ratio**, in [0, 1]. This is a new documented interpretation of an authored coefficient, not proof that the older coefficient had physical calibration. Review/re-author the starter coefficients during the cutover rather than treating the old binary behavior as an acoustics measurement.

For a nonzero ratio T, the corresponding loss is `-10 * log10(T)` dB. Ratios multiply across distinct crossed solids; losses add. T=1 is no attenuation; T=0 explicitly blocks this direct path. Return a blocked result instead of serializing Infinity or NaN. Do not use `-20 * log10(T)` unless a separate provider explicitly supplies a pressure-amplitude ratio. Do not store both independently editable loss and transmission for the same material.

Count a physical solid once, not once for each triangulated face or both its semantic rock-top support and underlying rock volume. Preserve the current canonical crossing order. Openings affect direct paths through geometry. Sound going around corners through rooms/portals, reflections, diffraction, and frequency-dependent filtering are deferred. A blocked direct path in v1 does not establish that a future propagation provider would find no indirect path.

The first implementation uses an authored uniform ambient background per acoustic policy. Do not invent a world noise-source subsystem just to fill this field. A later bounded room/region/provider can supply the same listener-local value.

When actual overlapping sustained sources are introduced, add their **linear energies**, excluding the evaluated source, and convert back: `10 * log10(sum(10 ** (Li / 10)))`, preferably with a numerically stable maximum-offset formulation. Never add dB values arithmetically. Instantaneous speech events in v1 do not have physical durations, so simultaneous-looking captions must not be treated as overlapping acoustic emitters. Caption lifetime is never a noise duration.

The generic acoustic result may later support native danger, startle, stealth, sleep, or environmental policies. Loudness alone does not introduce hearing injury, waking, glass-breaking, or other mechanics. Those require supported world laws, duration where relevant, and ordinary native admission.

## 4. Speech volume and admission

Use `whisper | normal | shout` as the initial player/agent delivery modes. They resolve through an installed source profile; an LLM may choose a supported mode, not an arbitrary source level, listener list, range, or private scope.

Extend the existing talk payload rather than adding another command family:

```ts
type SpeechVolume = 'whisper' | 'normal' | 'shout';

// Target extension to the existing agent talk operation.
talk: {
  text: string;
  addresseeEntityId: string;
  volume: SpeechVolume;
}
```

The player Talk composer gets an explicitly labeled volume selector, default Normal. A client omission may normalize to Normal at input admission for ergonomic callers; strict model schemas must match their declared required/nullable-field contract. Propagate the selected mode through commands, response adapters, receipts, retry digests, committed speech metadata, and projections. Do not infer physical delivery from “I whisper” written in dialogue or change it from text styling.

An addressed utterance is still external sound. Conversation membership, intended addressee, importance, and request priority never grant acoustic access. A whisper is not an access-control private message. The speaker receives self-expression evidence for its own accepted words, distinct from proof of hearing its own voice; this also accommodates a speaking actor without hearing.

An out-of-range addressed reply may still be spoken aloud under the existing response policy. Its fallback must preserve whisper/shout mode and all other emission semantics. Never escalate volume or teleport words to the intended recipient. Revalidate source capability, life/sleep state and event-time geometry when committing a generated reply. Use the existing independent component-outcome and paid-execution boundaries.

The speaker does not receive an omniscient list of listeners. Likewise, an actual recipient ID is not automatically a *perceived* recipient identity for an eavesdropper. Addressed/overheard reaction cues must be derived from evidence available to that listener, without exposing hidden communicative intent.

## 5. One occurrence, listener-specific evidence

Speech remains `WorldEvent.type === 'speech'`. The world event contains actual utterance data and the existing immutable event-time origin, identity, order, and scope. Add resolved volume, source profile/version and source level to its typed speech data; do not duplicate common event-envelope fields or create a parallel speech log.

For each eligible listener, native perception produces one actor/event awareness result, with different fields permitted for different listeners. Hearing detection is not the same as speaker recognition, spatial localization, or intelligibility.

The following is a conceptual **safe projection**, not a second persisted event schema:

```ts
type SpeechSegment =
  | { kind: 'heard'; text: string }
  | { kind: 'unintelligible' };

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

The host stores sufficient immutable observer-local facts to reproduce that projection: permitted fragments, recognition/association, permitted delivery, coarse bearing, listener pose at acquisition if needed, and policy version. Reuse the existing awareness/perspective persistence boundary. The raw occurrence may keep private source/target metadata; safe DTOs and model references may not simply spread that metadata.

Exact dB measurements, source level, exact hidden coordinates, hidden source/target IDs, original word offsets/counts, mask seed and full unredacted text are not required in the public projection. Ordinary hearing does not become a rangefinder or a technical inspection tool. Administrative diagnostics remain separately authorized and never teach an actor.

The controlled actor, NPCs, context builders, attention, recall, embeddings, summaries, Narrator, event history, and UI all consume compatible listener-specific evidence. Perceived speech is evidence that words were spoken, not that a speaker's claim is true.

### Source and delivery recognition

For v1, associate an utterance with a speaker only when current permitted visual evidence at emission establishes that speaker as the source, or an already-supported recognition mechanism does so. Do not introduce unimplemented familiar-voice recognition by reading the raw actor ID. An unidentified source stays unidentified even if the words are clear.

Delivery labels require a permitted delivery cue. A faint ordinary voice is not a whisper. The initial policy may expose the authored delivery mode when the speaker is visually associated and speech is detected, or when clear/partial linguistic exposure includes a trusted delivery cue; this is an explicit coarse game interpretation. Visual-only detection without a supported speaking/whispering cue does not justify “John is whispering.” A model cannot supply another listener's recognition result.

A later identification is new evidence. It does not rewrite the original utterance's fragments or retroactively convert all unknown historical voices to a currently visible actor. Initialization must preserve deliberately absent source/target roles rather than treating them as missing data to repair.

### Editing committed speech

Generic event and awareness editors must not rewrite committed speech text or content independently of the listener capsule. Reject such rewrites clearly; existing guarded deletion and awareness-importance edits remain permitted. A correction spoken in the world is a new event, not a retroactive hearing upgrade. A dedicated administrative re-authoring operation needs explicit semantics for already-perceived fragments and their dependents; that unresolved extension is recorded in [D61](../archive/05-project/open-decisions.md#d61--re-authoring-committed-speech).

### Native behavior and sleep

Retain current sleep/life/capability gates for conscious acquisition. An asleep listener does not receive full speech simply because a level crossed a threshold. Loud-sound waking is a future native policy. Acoustic exposure computation need not require human-style memory or cognition: a future native animal reaction can use exposure without allocating an LLM job or a transcript. Do not attach cognition to ordinary animals as part of this feature.

## 6. Partial text and privacy

For the partial tier, reveal approximately half the words in short contiguous runs, retaining original order. Replace missing runs with opaque unintelligible segments; never generate replacement words or guess missing grammar. Clearly mark the overall sentence as partial. In particular, a missing negation must not turn the remaining fragment into an authoritative promise, threat, teaching result, or commitment.

Choose the mask once at commitment from the existing deterministic world randomness, or a versioned event/listener-local deterministic stream that does not perturb unrelated simulation randomness. Persist the projected result. Rendering, history reloads, reconnects, reflections, camera motion and later policy changes never reroll it. Do not persist a bare seed and later retokenize historical speech under a different algorithm.

For two or more lexical units, expose a bounded count near 50%, while retaining at least one hidden unit. A one-word utterance cannot be half readable: use a stable approximately 50% reveal-or-gap decision, still flagged partial. Tokenization must handle Unicode and non-space-delimited scripts through a pinned segmentation policy or deterministic documented fallback; do not assume ASCII words. Avoid unbounded span counts by coalescing neighboring gaps/runs under existing speech-byte limits.

Render missing segments as `[…]` by default, or blur neutral placeholder glyphs for the requested visual effect. Never place missing original words in CSS-blurred spans, tooltips, ARIA labels, alternate chat fields or client caches. Placeholder size and caption timing must not disclose the exact hidden text length. Heard fragments stay readable.

Different listeners may legitimately retain different fragments. Their later sharing can reveal more information through ordinary new speech. Merely opening two tabs as the same listener may not.

## 7. Caption component and lifetime

Implement a lightweight `SpeechCaption`, separate from work/progress notices, on the existing React-over-PlayCanvas world overlay. Reuse projection/anchor utilities and curated semantic icons. Use the normal UI font, white text, quotation marks for actual heard speech, a small outline speech icon, and a restrained contrast backing/outline. No decorative font, italics, typewriter animation, speech-dependent tiny text, or all-caps shouting.

Initial presentation constants: about 16–18 CSS px before HUD scaling, 280–360 px preferred width constrained to the viewport, two or three visible lines, and a 12–14 px remaining-time ring beside the last line. Move the ring below on narrow layouts. These are layout defaults, not world quantities. The ring counts down, not up, and does not imply a cooldown.

Use [Timed UI](timed-ui.md) for lifetime ownership. A suggested reading duration is `clamp(1000 + displayedWordCount / 3 * 1000, 4000, 12000)` milliseconds, then the user's reading-time multiplier. Count only display-permitted content, not hidden original words. Narration labels without linguistic fragments receive the minimum. Split longer permitted utterances into reading chunks without modifying the stored utterance; the ring indicates the current chunk and an unobtrusive continuation cue indicates more. History retains the complete permitted content.

One active utterance/chunk per source presentation plus up to two queued utterances is the initial default. Across the overlay, start with at most eight active captions. Use deterministic stable order and active-conversation/direct-address priority for presentation only. Overflow is retained in World Events and signaled there; it must not suppress evidence, native behavior, or cognition. Do not require a sophisticated optimal label-placement solver.

Bound deferred presentation by age as well as count. Initially, discard a pending caption or an active caption that has remained layout-hidden for 60 unpaused presentation seconds; it remains in World Events. This is a stale-queue rule, not depletion of the reading ring: a visible caption keeps its full reading policy, and manual/presentation pause or a hidden document freezes both clocks. The same overlay clock supplies the comparison; add no interval or world-state timer. This prevents never-fitting old captions from permanently occupying all slots. A shorter delay or promotion of pending urgent speech is later layout tuning, not authority over evidence.

The underlying speech occurrence is instantaneous in v1. Caption reading duration is not a physical speaking process, action duration, acoustic persistence, or permission to eavesdrop later. Speech is displayed only after successful commitment, not on a provider token stream that may be rejected.

## 8. Listener-centered directional captions

Do not anchor unidentified voices at their hidden exact positions or automatically at the viewport edge. Use an invisible presentation ring centered on the controlled character, well inside the normal reference speech radius. This is a label-placement aid, not an actual hearing boundary or estimate of the speaker's distance.

For the starter world, use a preferred world-space ring radius of 3 m, further limited to about 30% of the listener's current unobstructed normal-speech clear radius. Projection can shrink this radius for viewport fit; never enlarge sensory reach to fit UI. There is no need to create ring geometry or a simulated entity.

At emission, the server supplies only an authorized coarse bearing. Start with eight horizontal sectors (45-degree sectors). Do not jitter the sector on each render or reveal an exact vector underneath a coarse label. Vertical information is separate: use Above/Below only when the sensory policy supports it, otherwise Unknown. In v1, a primarily vertical/ambiguous source can use the neutral caption rather than a fabricated horizontal arrow.

Given the stored permitted sector direction `d` and presentation radius `r`, project a proxy point near `listenerAnchor + r * d` using the same camera as the player anchor. Attach a small arrow showing the **coarse direction**, not an exact source location. Preserve the sector when stacking nearby captions. Camera orbit/projection changes transform the same world bearing; they do not acquire new acoustic evidence. Keep text upright and screen-sized.

Fit captions by shortening their radial offset and wrapping, not by moving them to an unrelated bearing or assuming screen-right means world-east. Use existing CSS-pixel projection conventions and handle behind-camera and off-screen anchors explicitly. If the controlled character is off-screen or no directional label fits, fall back to a neutral readable caption/World Events notification without a false arrow. A normal caption must not reveal hidden geometry or relocate the camera.

### Historical bearings do not track hidden sources

The bearing belongs to the listener position at event time. Rotating the camera is safe; translating the listener is not permission to recompute the bearing from a hidden source's current or historical exact coordinates. Once the listener moves materially (initial display tolerance 0.5 m), remove the directional arrow and use a neutral recent-speech caption for the remaining reading lifetime. This threshold only affects presentation; no new evidence is granted.

An overhead caption can follow a speaker only while its current pose remains authorized and its source association was established. On loss of visibility, detach from the live head. Use only previously permitted bearing information from the same event-time frame, or a neutral fallback. Never attach to a last-seen ghost that is secretly moving. An unknown voice must not automatically become identified just because a person enters view during the lingering caption.

## 9. Event-time semantics and delivery

Evaluate each utterance once, inside its native commit, using then-current source/listener pose, physical geometry, sense bindings, acoustic policy and ambient state. Freeze that evidence atomically with the occurrence and dependent mutations. Do not reconstruct historic audiences from current distance, room state, group membership or camera position.

The existing scope model remains authoritative: outward speech is external; private thoughts are owner-private; provider status is system-only. Local observations and model memory tools do not gain raw-event access merely by knowing an event ID.

Use existing post-commit publication and reaction intake. One delivered event can update a caption, history and cognition without committing three copies or admitting two AI responses. A detected murmur is a possible attention cue, not mandatory semantic work. Semantic attention, embedding and Narrator inputs must already be redacted; “ignore the hidden words” in a privileged prompt is insufficient.

Keep the hot bootstrap/SSE feed bounded. It is not the comprehensive historical archive. Prefer an existing committed-event update list or a lightweight addition to its normal patch envelope for new perceived events; do not introduce a speech-only transport. A patch gap triggers scoped history recovery and an honest missed-caption notification, not blind replay of every historical row as a new overhead utterance.

Deduplicate transient captions by world, controlled actor, save timeline/generation, event ID and chunk index. Clear local queues and clocks on a scope/timeline change. Initial loading, opening World Events, older-page reads and ordinary reconnect history recovery do not replay old captions. Background-tab new events remain in permitted history but do not form a large delayed caption queue on return.

## 10. Persistence, cutover, and integration boundaries

Store new speech metadata and event-time projections through existing event/awareness/perspective transactions and same-version saves. Include any new policy pins and privacy-relevant fields in validation and snapshot capture. Resolve the next development schema version at implementation time; do not add old-save migrations or compatibility readers. Explicitly reject incompatible saves without altering them, per the active development policy.

Do not redefine `hearsEntity()` from “eligible for full speech” to “detected something” while callers still assume full quotes and identity. Introduce a rich hearing query and migrate callers coherently. Audit `say`, teaching eligibility, conversation joins, action catalogue, response fallback, direct-response dispatch, autonomous reaction intake, observation and every context/history projection. A person can be physically present and within detection range without understanding a teaching action. Preserve the owning mechanic's supported requirements; do not grant a recipe from partial words.

The important current projection hazard is selecting an awareness-qualified event and then rendering `event.text` or `event.data.text`. Replace that pattern with projection from the listener's stored evidence in the hot view, paginated history, Talk, World Events, narration, cognition, embedding, summaries, social appraisal and promise/commitment consumers. Shared privileged indexes cannot rank or describe secret words for a listener.

Use one native speech-evidence formatter for permitted linguistic content and attribution, with UI-specific formatting outside the domain. Do not copy schemas/formulas between client and server or add a renderer import to domain code. Brief why-comments should link to the relevant privacy, clock, or event-time section.

## 11. Performance contract

The initial acoustic path is inexpensive scalar math plus existing geometry queries per plausible listener. Use a conservative candidate bound computed from the strongest relevant emission and most sensitive supported listener/floor; include all eligible listeners when no tighter bound can be proved. Source-specific reach replaces the old fixed 10-unit candidate cutoff. High background or barriers may reject candidates later; a conservative broad phase must never miss quiet-region or unusually sensitive listeners.

Reject outside the conservative bound before barrier work. Reuse a valid phase-local spatial index and immutable geometry; never reuse it after unaccounted movement, spawn/removal, sense/profile or relevant geometry changes. Do not cache across arbitrary mutable draft lifetimes. Add longer-lived caches only after measured need.

Resolve/tokenize the source once, then mask once per listener. Perform no geometry, persistence, randomness, model call or history scan per caption animation frame. Reuse the scene's existing update loop for projection and one overlay-level presentation clock. Animate small ring/position properties without rerendering the entire HUD every frame.

Store only perception outcomes required for history/cognition, not every continuous reading. No new distributed cache, queue service, room graph, physics dependency, audio synthesis service, or vector search is needed for this release. Dense acoustic fan-out is real required work; if authority cannot commit within its supported bounds, use explicit admission/backpressure, never silent audience sampling.

## 12. Deliberate extension boundaries

Deferred capabilities include timed/streamed physical speech, listening to only a later part of an ongoing sentence, room/portal propagation, reflections/diffraction, frequency bands and audiograms, voice recognition, language competence, head orientation, lip-reading, speaker amplification, sound-triggered waking/damage, and accurate sound-duration/masking processes. Their future additions should preserve the event/evidence/caption boundaries above.

Presentation choices and acoustic defaults are reversible. No unresolved product choice blocks this specified v1. Unsupported mechanisms remain absent rather than simulated through prose, hidden heuristics, or an LLM.

## Reference basis

These sources support acoustic and accessibility concepts, not the proposed game thresholds or claims of simulation fidelity:

- [NIST SI guide, chapter 8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-8): logarithmic field versus power quantities and explicit references.
- [OSHA technical manual, noise](https://www.osha.gov/otm/section-3-health-hazards/chapter-5): free-field distance attenuation and sound-level combination.
- [ASHA classroom acoustics](https://www.asha.org/public/hearing/classroom-acoustics/): background noise and reverberation affect speech understanding.
- [W3C timing-adjustable guidance](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html): a persistent untimed alternative to transient information.

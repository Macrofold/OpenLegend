# Animal reactions to sound

**Selected design, runtime pending — 2026-10-17.** This is the bundled world's acoustic policy for [speech and social perception](../../projects/speech-and-social-perception-feature-spec.md). Ordinary animals use native rules and saved randomness. They require no Decision API, thought, reflection, narration-generation or memory-consolidation calls.

## One existing animal controller

This extends the selected [native animal response owner](https://github.com/Macrofold/OpenLegend/blob/ff68a9b4035bff08025af7b0b579fe2316ed1263/docs/worlds/base/animal-responses.md) and its [CTR03–CTR04 execution design](https://github.com/Macrofold/OpenLegend/blob/ff68a9b4035bff08025af7b0b579fe2316ed1263/docs/projects/combat-and-threat-responses-tech-design.md#native-animal-execution-ctr03ctr04). Those exact sources are on the separate documentation branch `codex/combat-reactions-and-animal-escape-20261017`; they are a design dependency, not a claim of integrated runtime. The generic-noise exclusion in that design is narrowed here: personally detected ordinary speech now supplies a selected native alarm input. Other noises require an actual admitted emitter; this does not silently enable footsteps or impact sound.

SPK08 depends on the relevant CTR03–CTR04 installed controller, perception, movement, species-profile and continuation seams. If that implementation is unavailable, the acoustic adapter remains pending. Do not introduce temporary duplicate escape state or import unrelated combat/PvP/appraisal work to satisfy the dependency. Reconcile this reference to the canonical owner when the designs integrate.

The installed native response profile remains the single policy selection. Its controller owns routine, escaping, settling and blocked behavior, permitted danger estimates, current cue/cause, refuge, pending proposal generation and exact movement reference. Navigation, flight, body, status and lifecycle keep their existing authority. This acoustic extension adds no second controller, action family, path, fear meter or model scheduler.

## Initial outcomes and deliberate simplification

An animal either continues its current behavior or enters/updates that shared alarm. Alarm produces actual escape movement, alert settling or a truthful blocked condition. A skittish deer can flee when it hears you; a calmer animal can continue. Sound does not automatically classify its speaker as an attacker, change relationships or supply a psychological feeling.

This replaces the earlier SPK design for model-selected animal hold, approach, retreat and separate sound flight. Mike's later native-animal decision favors efficient simulation with many animals. Distinct curiosity approaches, deliberate listening holds, hiding, richer instincts and exceptional cognitive creatures remain future repertoire. The ordinary alert settling already provides a stationary aftermath without another timed hold action. Do not describe continued activity as an investigation that never happened.

## Profile values and consumers

Extend the animal's existing installed response profile with `soundAlarmMinimumBand`, a nonnegative integer or null. Null means the animal can hear but this acoustic policy does not initiate alarm. A threshold selects native reaction only; the installed hearing sense independently determines detection.

| Authored binding | Initial value | Meaning |
| --- | --- | --- |
| Ordinary hare, deer and bird | 0 | Any actually detected external sound can startle a skittish animal. |
| Ordinary wolf and bear | 2 | Modest detected sound can be ignored; a sufficiently stronger cue can startle. |
| Territorial stag | null | Hearing does not replace the existing territorial warning/attack/withdrawal decision. |
| Explicit nonreactive contrast fixture | null | Detection remains independent of whether a native response is installed. |

Use `acousticChangeBandDb = 6`, `sensoryLifetimeSeconds = 900` and `acousticPatternIdleSeconds = 900` as the initial authored acoustic values. Raw evidence lifetime and pattern idle lifetime are separate meanings even though their initial durations match. Starting species retain the current 0 dB SPL hearing floor and applicable 28-metre sight baseline through their actual sense definitions. These are provisional game settings, not biological calibration.

Starting-world creation, creator spawning, body/profile construction, world-definition admission, native response, inspection and current-format restoration must read these same definitions. The engine does not switch on species names. A materially different installed hearing floor and reaction threshold must reach actual detection and response; changing only a fixture's description is insufficient. Missing native response installation means no such response, not a bundled fallback. Ordinary animal cognition, autobiographical memory, inner-world writing, language understanding and speech remain disabled.

## Evidence and intensity

The native input is the observer's exact permitted sound experience: occurrence identity/order/time, receiver physical life, listener pose, received level/margin, supported coarse bearing/elevation or null, and a visible-source observation association only when actually acquired. It contains no words, addressee, proper human name, hidden source identity/coordinates, inferred source distance or guessed emitted volume. The physical emitter being the receiver's own body is known self-acquisition; historical authorship of a detached impact does not make that impact a self-emitted voice.

Reuse the shared direction projection under [hearing localization](../../limits/hearing-and-speech.md#hr05--localization-and-association); do not give animals a second direction algorithm. A null bearing remains unknown.

For an actually detected finite acoustic result, compute:

`band = floor((clarityMarginDb - installedDetectThresholdDb) / acousticChangeBandDb)`

Use the native clarity margin, with no extra rounding, inferred distance or language-dependent adjustment. At the base detection threshold, the bands are [0, 6), [6, 12), and so on; exact upper boundaries enter the next band. A width must be finite and positive; a reaction threshold must be null or a nonnegative integer. Detection still precedes response. Identical permitted acoustics/visible facts, profile and saved RNG produce the same outcome regardless of the words or intended addressee.

## Repeated sound without repeated behavior work

Every actual eligible exposure receives its own sensory record before response selection. Self, subthreshold and nonreactive-profile records are not erased merely because they cause no startle. Raw event expiry is fixed at acquisition plus the sensory lifetime; a later repetition never extends an older event.

Keep a small acoustic-pattern map on the one native response owner. Its canonical key is `(permitted visible-source observation episode or anonymous, permitted direction/elevation or unlocalized, band)`. Include the complete permitted association identity using the shared structured-key encoder. Never distinguish anonymous keys using hidden emitter IDs. A map value needs only its absolute idle expiry and latest exact permitted cue reference. Count/first-seen history, paid opportunity revisions, considered watermarks and a second transcript are unnecessary. The map survives return to routine until its entries expire; ending an alarm must not reset repeat suppression. Controller removal or a new body life retires the map through that same owner without replaying old observations.

Process each newly committed sound once in canonical native occurrence order:

1. Record the exact permitted exposure through the shared awareness owner. If acquisition is self, the selected threshold is null, or the detected band is below the threshold, stop response processing **before inserting or refreshing a pattern**. Hearing/life/perception ineligibility already prevents acquisition.
2. Remove expired patterns whose idle expiry is at or before this acquisition time. Expiry itself starts no reaction.
3. Compute the qualifying pattern. If already active, refresh its latest cue and idle expiry to acquisition plus the profile's idle duration, then stop. Do not reset safe time, replace movement, request a new refuge, consume randomness or emit another alarm-start event.
4. For an absent qualifying pattern, insert it with that expiry and pass this exact cue once to the existing alarm intake. The same domain transition owns the record, map change and alarm consequence; no SQL callback or display read may replay intake.

Independent expiry housekeeping may remove stale map entries without scheduling behavior. At the exact idle-expiry boundary, a newly heard matching pattern is new. Save/load preserves absolute times and does not recreate onset.

A/B/A/B from two visible sources or anonymous intensity bands inserts A and B once, then refreshes them. A newly qualifying louder band or supported direction/source pattern can matter. A new lower band that still meets the threshold is also a changed pattern; changes in attenuation or relative position can therefore produce an extra review. This finite policy deliberately coalesces a previously encountered pattern throughout its still-active idle window. It is simple repetition suppression, not established learning or habituation. Qualify both missed useful changes and excess reviews.

Current bodily danger checks remain independent. A still-visible person cannot disappear from the danger set because their voice is familiar, and actual attack evidence is not suppressed by an acoustic pattern. Do not route animal sensory insertion through human new-memory/new-speech cognition or add paid work.

## One alarm and actual movement

A fresh qualifying cue starts escaping from routine or resumes escaping from settling. During an existing escape it updates the latest cause and requests meaningful route review; while blocked it retains the actual physical block and makes the new cue available to the existing review owner. In every case it resets the continuous-clearance clock through that one episode. It cannot create another physical lane or cancel protected work outside ordinary interruption rules. An admitted bodily-attack response, flight, incapacity or the territorial owner's current action retains its actual priority.

A visible source contributes a bodily danger estimate only when its observed body/life meets the installed danger-class rule. Consider every other locally perceived potential danger too. An unarmed human can matter to an already alarmed animal without becoming an attacker.

An unseen sound supplies an optional direction preference, **not a geometric danger region**. Do not project a ray into a guessed source point, place a fictional attacker at the listener's position, or fetch a hidden source. Opposite the permitted heard bearing supplies the away unit vector. Null direction uses the shared controller's current-heading/canonical candidate ordering; the animal may choose a valid escape route without claiming to know which direction contains the sound.

The shared refuge selector owns candidates, visual planning scope, support, full-route clearance and all-danger safety. Merely rotating its evenly spaced bearings does not ensure selection away from a sound. Apply this narrow addition inside its existing comparator:

1. Form the existing eligible tie set after support/collision, no-avoidable-worsening, safe-arrival and best-danger-margin comparisons. Acoustic preference never outranks those safeguards.
2. Preserve an existing admissible refuge under the ordinary continuity rule when its directional preference has not changed. A fresh cue with the same bearing does not invalidate a useful route merely because its occurrence ID or intensity changed.
3. For a new selection with a heard bearing, compute `awayProgressMetres = dot(candidateDestination - currentAnimalPosition, awayUnitVector)`. Keep the greatest value, comparing equality with the existing spatial tolerance. For null bearing, omit this rank.
4. Apply the existing saved weighted tie selection to remaining interchangeable candidates. No new tuning constant, random stream or path search is introduced.

The most recent qualifying acoustic cue in native occurrence order supplies this optional preference. Real observed dangers always constrain safety, including a second human on the away side. This first policy does not reconstruct several unseen sources from competing sound bearings; richer acoustic source reasoning is deferred.

With no locatable danger, entering escaping still chooses one ordinary finite local refuge leg. On reaching its supported destination, the controller can begin settling against the currently known danger set. It does not certify that an unseen sound source is harmless or far away. A reached unsafe refuge leads to another ordinary leg. Unsupported terrain/flight preparation remains explicit; absence of a route is not successful escape.

## Stopping, restoration and failures

Use the native animal owner's complete danger set, species speeds, reachable refuges, repeated-leg selection, flight/territorial integration, exact physical safety crossings, blocked retries and continuous-safe duration. That owner remains the only source of escape distances and timers; speech does not copy or redefine them.

A duplicate acoustic pattern does not renew settling. A genuinely new qualifying cue can reset it through ordinary intake. A trapped animal remains truthfully blocked and follows that owner's bounded review rules; a fixed elapsed speech-flight timer cannot declare it calm while unsafe. The previous SPK separate 128.755-second sound-flight stop and 120-second hold with a 1–300-second range are superseded design proposals, never delivered behavior.

Busy, moving, perched and airborne animals can acquire sound. Their actual movement owner decides when an admissible change can occur. Dead or perception-blocked bodies acquire no new conscious sound. This slice adds no sound waking or sound damage; existing bodily-contact and rest interruption rules remain authoritative.

Save sensory records/absolute expiry, the pattern map, selected profile/life, minimal active cue, alarm/refuge/proposal and movement relationship in one coherent cut. Active cue meaning belongs to the existing episode and can outlive optional raw sensory retention. Historical source removal does not invalidate an already admitted safe route or reveal new source facts. Profile/controller removal, body replacement and incompatible continuation use the native owner's existing cancellation and validation rules, with no legacy format.

Provider availability has no bearing on native reactions to already committed sound or existing movement. The separate application rule still disables new player freeform Speak/Speak-to/Act when AI is unavailable.

## Qualification and expansion

SPK07–SPK08 must show actual acoustic acquisition, both threshold outcomes, text/addressee invariance, unseen/null-bearing privacy, real away preference with second-human safety, repeat/expiry behavior, movement/flight/territorial priority, safe-duration completion, trapped behavior and save/load with unchanged RNG. Measure detection/recording and native route preparation through dense real callers; no audible recipient may be dropped to make a benchmark pass. Zero animal model calls is a required result, not a native CPU capacity claim.

Distinct listening/curiosity/hiding choices, richer animal recognition, learning, offspring, packs, scent, tone and language remain future native repertoire. A rare deliberately selected cognitive creature would require separate capability design and spending admission; naming an ordinary animal does not enable it.

## Maintained records

- Implementation and dependencies: [SPK07–SPK08](../../maintainers/speech-and-social-perception.md) and the pinned [CTR03–CTR04 tracker](https://github.com/Macrofold/OpenLegend/blob/ff68a9b4035bff08025af7b0b579fe2316ed1263/docs/maintainers/combat-and-threat-responses.md#ctr03--one-native-animal-response-owner).
- Limits: [hearing and animal response inventory](../../limits/hearing-and-speech.md#ssp-h02--sound-reactions-without-autobiographical-memory).
- Integration: [speech technical design](../../projects/speech-and-social-perception-tech-design.md#10-animal-sound-and-cognition-integration) and [hearing contract](../../hearing-and-speech.md#selected-animal-hearing-and-choices--accepted-target).


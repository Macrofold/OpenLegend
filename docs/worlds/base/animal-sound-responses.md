# Animal reactions to sound

**Core implementation installed; qualification incomplete — 2026-10-18.** This is the bundled world's acoustic policy for [speech and social perception](../../projects/speech-and-social-perception-feature-spec.md). Ordinary animals use native rules and saved randomness. They require no Decision API, thought, reflection, narration-generation or memory-consolidation calls.

## One existing animal controller

This extends the selected [native animal response owner](animal-responses.md) and its [CTR03–CTR04 execution design](../../projects/combat-and-threat-responses-tech-design.md#native-animal-execution-ctr03ctr04). The combat phase supplies the installed controller; this acoustic extension uses that same owner. The generic-noise exclusion in that design is narrowed here: personally detected ordinary speech now supplies a selected native alarm input. Other noises require an actual admitted emitter; this does not silently enable footsteps or impact sound.

SPK08 depends on the relevant CTR03–CTR04 installed controller, perception, movement, species-profile and continuation seams. The installed acoustic intake has focused native/SQL evidence; flight, dense and combined acceptance remains open in SPK08/SPK11. Do not introduce temporary duplicate escape state or import unrelated combat/PvP/appraisal work to satisfy the dependency.

### Current speech-alarm foundation

The installed route records each permitted speech-derived sound exposure with its absolute sensory expiry, independently of memory capability. Self, subthreshold and null-profile cues stay recorded but do not insert or refresh an alarm pattern. Its pattern key combines the permitted visible-source episode or anonymous source, acquired direction/elevation or null, and intensity band. Before intake, remove patterns whose idle expiry is at or before acquisition time. A repeat refreshes only its latest cue and idle expiry; it does not reset safety, change movement, allocate navigation or draw randomness. A new qualifying pattern enters the existing alarm once. Expiry and restoration alone never replay intake. Real danger safety outranks the heard-away preference, and an unseen sound supplies no fabricated source position. The unchanged authored values below remain the current tuning.

**Selected acoustic extension; not yet installed.** The integrated [physical-sound policy](physical-sound.md) owns physical classification, received onset/rise eligibility and the separate abrupt-sound qualifier for D. This policy retains animal alarm bands, repetition and native continuation. [E’s finite ground-curiosity method](../../projects/attention-and-investigation-tech-design.md#6-native-animal-methods) shares that same controller and pattern owner; it does not replace alarm eligibility.

The following A/ACS/E integration rules are selected targets until explicitly implemented; the current speech-alarm representation above remains installed. Once the coordinated A/ACS extension lands, the existing voice bands apply only when A actually acquires voice-like classification or understood speech facts. Other received cues, including masked/unclassified utterances, use the general physical-sound filter. Private occurrence type or hidden lexical payload cannot select the new reaction law. Every production noise still needs an admitted emitter; no footsteps or impact sound is claimed as installed.

The installed native response profile remains the single policy selection. Its controller owns routine, escaping, settling and blocked behavior, permitted danger estimates, current cue/cause, refuge, pending proposal generation and exact movement reference. Navigation, flight, body, status and lifecycle keep their existing authority. This acoustic extension adds no second controller, action family, path, fear meter or model scheduler.

## Initial outcomes and deliberate simplification

An alarm-only profile either continues its current behavior or enters/updates that shared alarm; the selected finite curiosity extension below will add its own admitted choice. Alarm produces actual escape movement, alert settling or a truthful blocked condition. A skittish deer can flee when it hears a qualifying cue; a calmer animal can continue. Detecting a routine physical noise does not by itself establish alarm eligibility. Sound does not automatically classify its speaker as an attacker, change relationships or supply a psychological feeling.

The [attention design](../../projects/attention-and-investigation-tech-design.md#6-native-animal-methods) selects an opt-in finite observation/ground-curiosity extension under this same controller, with independent alarm/curiosity dispositions and no hidden source pursuit; [ATI05](../../maintainers/attention-and-investigation.md#ati05--native-choices-through-one-controller) owns its unimplemented delivery. Hiding, richer instincts and exceptional cognitive creatures remain future repertoire. Ordinary alert settling provides a stationary aftermath without another timed hold action. Continued activity must not be described as an investigation that never happened.

## Profile values and consumers

The installed response profile has `soundAlarmMinimumBand`, a nonnegative integer or null; the new evidence-qualified dispatch reuses it. Null means the animal can hear but this acoustic policy does not initiate alarm. The table below preserves voice-policy reaction bindings; the installed hearing sense independently determines detection. Use those bands only for an actually acquired A voice-like classification or understood speech facts. Ordinary language-disabled animals cannot supply the latter and rely on the acquired classification. All other received cues use the eligibility rule owned by [physical sound](physical-sound.md), through this same response-pattern/alarm intake.

| Authored binding                      | Initial value | Meaning                                                                               |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| Ordinary hare, deer and bird          | 0             | An acquired voice-like cue or understood speech can qualify from band 0.              |
| Ordinary wolf and bear                | 2             | A sufficiently strong acquired voice/speech cue can qualify from band 2.              |
| Territorial stag                      | null          | Hearing does not replace the existing territorial warning/attack/withdrawal decision. |
| Explicit nonreactive contrast fixture | null          | Detection remains independent of whether a native response is installed.              |

Other received cues—including masked/unclassified utterances, quiet routine locomotion and low rough rustle—do not automatically alarm the animal. Sufficiently intense abrupt impacts and received sharp/ringing patterns can qualify under the physical-sound policy. Its filter uses the listener's permitted acoustic evidence, never private emitter species IDs, occurrence type or unheard words. Nearby animals acquire actual emitted sounds independently; no group-alarm broadcast or automatic shared knowledge is introduced. Received voice/speech evidence retains the bands above; an indistinct sound does not acquire that exception from its source's private speech payload.

Use `acousticChangeBandDb = 6`, `sensoryLifetimeSeconds = 900` and `acousticPatternIdleSeconds = 900` as the initial authored acoustic values. Raw evidence lifetime and pattern idle lifetime are separate meanings even though their initial durations match. Starting species retain the current 0 dB SPL hearing floor and applicable 28-metre sight baseline through their actual sense definitions. These are provisional game settings, not biological calibration.

Starting-world creation, creator spawning, body/profile construction, world-definition admission, native response, inspection and current-format restoration must read these same definitions. The engine does not switch on species names. A materially different installed hearing floor and reaction threshold must reach actual detection and response; changing only a fixture's description is insufficient. Missing native response installation means no such response, not a bundled fallback. Ordinary animal cognition, autobiographical memory, inner-world writing, language understanding and speech remain disabled.

## Evidence and intensity

The native input is the observer's exact permitted sound experience: occurrence identity/order/time, receiver physical life, listener pose, received level/margin, supported coarse bearing/elevation or null, acoustic descriptors/patterns disclosed by the perspective owner, and a visible-source observation association only when actually acquired. It contains no words, addressee, proper human name, hidden source identity/coordinates, inferred source distance or guessed emitted volume. The physical emitter being the receiver's own body is known self-acquisition; historical authorship of a detached impact does not make that impact a self-emitted voice.

The eight-sector/fixed two-metre elevation projection described by [hearing localization](../../limits/hearing-and-speech.md#hr05--localization-and-association) is the current speech-runtime baseline. The selected [physical-sound policy](physical-sound.md) and [general acoustic design](../../projects/acoustic-stealth-tech-design.md) own the replacement quality-dependent bearing, angular uncertainty and elevation facets shared by speech and physical sound. Consume the actually acquired facets; do not give animals a second direction algorithm, narrow uncertainty or recompute hidden source geometry. Historical evidence keeps its original precision, and a null bearing remains unknown.

For a **strong** acquired finite acoustic result, compute:

`band = floor((clarityMarginDb - installedDetectThresholdDb) / acousticChangeBandDb)`

Use the native clarity margin, with no extra rounding, inferred distance or language-dependent adjustment. At the base detection threshold, the bands are [0, 6), [6, 12), and so on; exact upper boundaries enter the next band. A width must be finite and positive; a reaction threshold must be null or a nonnegative integer. Detection still precedes response. Given the same acquired acoustic/classification and supported speech facts, profile and saved RNG, changing private event type, unheard words or intended addressee cannot change the outcome.

For a cue acquired only through weak accumulation, use **band 0** for response bookkeeping. This does not convert its actual below-threshold margin into strong reception or satisfy a physical intensity minimum. Apply the rule selected by its actual acquired classification/speech evidence and retain its original acoustic quality; never recover a voice exception from the hidden source.

## Repeated sound without repeated behavior work

Every actual eligible exposure receives its own sensory record before response selection. Self, subthreshold and nonreactive-profile records are not erased merely because they cause no alarm. Raw event expiry is fixed at acquisition plus the sensory lifetime; a later repetition never extends an older event.

Keep one acoustic-pattern map on the existing native response owner. Its key is the ordered permitted acoustic class set, permitted observed association-or-anonymous, original direction/elevation-or-unlocalized, and intensity band. Use the shared structured-key encoder; hidden emitter IDs never distinguish anonymous keys. Each value has independent optional `alarm {latestCue,idleExpiry}` and `curiosity {latestCue,idleExpiry}` slots. C uses alarm only; E uses curiosity only. Retain each slot’s exact cue and absolute expiry, with no count history, transcript or second map. Returning to routine preserves suppression; controller removal/new body life retires it without replay. Count both optional slots and retained support in native byte reservations.

Process each newly acquired sound once in canonical native acquisition order, retaining original occurrence order separately:

1. Record the exact A-permitted exposure/receipt. Receiver eligibility is independent of memory. Self acquisition remains evidence but supplies neither this alarm nor curiosity. Evaluate voice-band eligibility only from acquired voice-like classification/understood speech; other cues use C’s received filter. Hidden source/event type and unheard text never select a rule.
2. Settle the existing per-ExposureRef presence/rise baseline and original onset receipt. Confirmation, routine return, bootstrap and restoration create no new onset. E stores its consumed-curiosity-onset receipt here until actual loss; do not add a presence map.
3. Prune each disposition slot whose expiry is at or before this acquisition. Expiry alone schedules no behavior. Delete a map key only if both slots are absent.
4. Evaluate alarm eligibility **before** curiosity. An alarm-eligible cue always takes C’s branch, even if its alarm slot suppresses repetition. An active alarm slot refreshes only its cue/expiry: no safe-time reset, route, RNG or movement restart. An absent alarm slot inserts the actual cue and admits one shared alarm transition. A curiosity-only slot cannot suppress it.
5. Only a cue that fails alarm eligibility may enter E’s independently installed finite curiosity rule. That rule uses only its curiosity slot, original onset receipt, remaining extent and ordinary action/controller priorities. It does not interpret a suppressed alarm as harmlessness. The selected contrast is explicitly authored ground-bird configuration with curiosity; ordinary hare/deer/bird profiles do not inherit it by name.

The same native transition owns acquisition, slot change and response. No SQL callback, renderer or model replays intake. Independent expiry housekeeping may reclaim slots without scheduling behavior. Save absolute expiries and original receipts; a matching actual cue at exact expiry can be new only under its ordinary occurrence/onset rules.

For alarm-eligible cues, A/B/A/B from two permitted observed associations or anonymous intensity bands inserts alarm slots A and B once, then refreshes them. A newly qualifying louder band or supported direction/source pattern can matter. A new lower band that still meets the threshold is also a changed pattern; changes in attenuation or relative position can therefore produce an extra review. This finite policy deliberately coalesces a previously encountered pattern throughout its still-active idle window. It is simple repetition suppression, not established learning or habituation. Qualify both missed useful changes and excess reviews.

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

The most recently acquired qualifying acoustic cue in native acquisition order supplies this optional preference. Real observed dangers always constrain safety, including a second human on the away side. This first policy does not reconstruct several unseen sources from competing sound bearings; richer acoustic source reasoning is deferred.

With no locatable danger, entering escaping still chooses one ordinary finite local refuge leg. On reaching its supported destination, the controller can begin settling against the currently known danger set. It does not certify that an unseen sound source is harmless or far away. A reached unsafe refuge leads to another ordinary leg. Unsupported terrain/flight preparation remains explicit; absence of a route is not successful escape.

## Stopping, restoration and failures

Use the native animal owner's complete danger set, species speeds, reachable refuges, repeated-leg selection, flight/territorial integration, exact physical safety crossings, blocked retries and continuous-safe duration. That owner remains the only source of escape distances and timers; speech does not copy or redefine them.

A duplicate acoustic pattern does not renew settling. A genuinely new qualifying cue can reset it through ordinary intake. A trapped animal remains truthfully blocked and follows that owner's bounded review rules; a fixed elapsed speech-flight timer cannot declare it calm while unsafe.

Busy, moving, perched and airborne animals can acquire sound. Their actual movement owner decides when an admissible change can occur. Dead or perception-blocked bodies acquire no new conscious sound. This slice adds no sound waking or sound damage; existing bodily-contact and rest interruption rules remain authoritative.

Save sensory records/absolute expiry, the one pattern map with independently expiring alarm/curiosity slots and existing per-exposure consumed-onset receipts, selected profile/life, minimal active cue, alarm/refuge/proposal and movement relationship in one coherent cut. Active cue meaning belongs to the existing episode and can outlive optional raw sensory retention. Historical source removal does not invalidate an already admitted safe route or reveal new source facts. Profile/controller removal, body replacement and incompatible continuation use the native owner's existing cancellation and validation rules, with no legacy format.

Provider availability has no bearing on native reactions to already committed sound or existing movement. The separate application rule still disables new player freeform Speak/Speak-to/Act when AI is unavailable.

## Qualification and expansion

SPK07–SPK08/ACS/ATI05 must jointly distinguish alarm-eligible repeats from curiosity candidates, curiosity-only versus alarm-only slots, per-slot expiry and no rearming on restore, alongside actual acoustic acquisition, both threshold outcomes, acquired voice versus indistinct/masked speech, strong versus weak-band bookkeeping, and identical outcomes for identical permitted cues despite different private speech/physical occurrence types or unheard words/addressees, unseen/null-bearing privacy, real away preference with second-human safety, repeat/expiry behavior, movement/flight/territorial priority, safe-duration completion, trapped behavior and save/load with unchanged RNG. Measure detection/recording and native route preparation through dense real callers; no audible recipient may be dropped to make a benchmark pass. Zero animal model calls is a required result, not a native CPU capacity claim.

Beyond the selected finite ATI05 method, hiding, richer animal recognition, learning, offspring, packs, scent, tone and language remain future native repertoire. A rare deliberately selected cognitive creature would require separate capability design and spending admission; naming an ordinary animal does not enable it.

## Maintained records

- Implementation and dependencies: [SPK07–SPK08](../../maintainers/speech-and-social-perception.md), [ACS](../../maintainers/acoustic-stealth.md) and the [CTR03–CTR04 tracker](../../maintainers/combat-and-threat-responses.md#ctr03--one-native-animal-response-owner).
- Limits: [hearing and animal response inventory](../../limits/hearing-and-speech.md#ssp-h02--sound-reactions-without-autobiographical-memory) and [physical-sound constraints](../../limits/acoustic-stealth.md).
- Physical-sound target: [feature specification](../../projects/acoustic-stealth-feature-spec.md), [technical design](../../projects/acoustic-stealth-tech-design.md) and [bundled policy](physical-sound.md).
- Integration: [speech technical design](../../projects/speech-and-social-perception-tech-design.md#10-animal-sound-and-cognition-integration) and [hearing contract](../../hearing-and-speech.md#selected-animal-hearing-and-choices--accepted-target).

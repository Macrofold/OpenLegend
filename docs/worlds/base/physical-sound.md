# Physical sound, deliberate movement and hearing — selected world policy

**Selected design; not implemented or qualified.** This is the bundled policy for [acoustic stealth](../../projects/acoustic-stealth-feature-spec.md). The [technical design](../../projects/acoustic-stealth-tech-design.md) owns its reusable mechanisms. Values below are fictional gameplay settings, not calibrated sound measurements, biological claims or engine requirements. [ACS](../../maintainers/acoustic-stealth.md) owns delivery; [the inventory](../../limits/acoustic-stealth.md) records restrictiveness and qualification.

## Installation, units and source meaning

Extend the installed base acoustic, body, sense, action, item and material definitions. Their ordinary creation, availability, execution, prediction, inspection and restoration consumers must read the same values. Missing required bindings refuse installation or report unsupported capability; names, meshes and prose never choose a fallback profile. Existing speech delivery levels and word thresholds remain owned by [hearing and speech](../../hearing-and-speech.md#2-continuous-quantities-three-thresholds).

Use metres, the existing world simulation clock, broadband SPL referenced to 20 micropascals in air and intensity transmission ratios. Convert a normal-speed duration once using the admitted normal clock rate `r`; the inspected base has `r = 60` simulation seconds per normal-speed second. For motion, `vNormal = vSimulation × r`. Runtime 3×/8× settings change clock advancement, not authored speed, contact frequency per metre or the conversion a second time. Pause freezes physical progress.

There are two supported source envelopes:

1. **Impulse:** one actual contact or committed utterance at its original time/order, with an authored reference level. It has no invented duration. Independent impulses in one sealed native physical phase use the peak/coincidence mixing rule below. An impulse does not mask a later instant merely because its description remains visible.
2. **Interval:** a real active process over `[start, end)`, or an active process whose next actual change/ending is owned by its action, body or environment. The owner supplies piecewise physical position, level and features and settles the old segment before any change. Starting/ending the interval is not permission to invent repeated world events or words.

A resonant sound with a meaningful decay must be an explicitly admitted interval profile under its physical owner; the initial contact adapter does not synthesize a ringing tail. Source level is the selected model's strength, not browser gain, a recording waveform or hearing injury. Air propagation has no travel-time delay in this slice. Other media require their own supported provider/reference.

## Posture and movement policy

The existing ordinary movement speed remains the underlying travel rate. For a supported human body, select these controls through ordinary action admission:

| Setting | Selected effect |
| --- | --- |
| Ordinary travel | Existing effective movement rate, including existing injury/condition rules; no new fatigue or speed change. |
| Deliberate quiet pace | Cap at `0.25 ×` that underlying rate; deliberate foot-contact technique contributes the sound adjustment below. |
| Crouched posture | Human supported body height/ear/eye/interaction anchors described below; movement capped at `0.15 ×` underlying rate. |
| Quiet plus crouched | Minimum of the two speed caps, with the one deliberate-contact adjustment; do not multiply caps or grant another acoustic bonus. |
| Posture transition | `0.4` normal-speed seconds of stationary ordinary physical work; revalidate final support/body/attachments at completion. |

The inspected human rate is `.11 m/simulation-second`, or `6.6 m/normal-speed-second`. Quiet travel is therefore `1.65 m/normal-speed-second`, and crouched travel at most `.99`. Traversing 6 metres takes approximately `.91`, `3.64` or `6.06` normal-speed seconds respectively before route/condition effects. This preserves the already-capable ordinary route; it does not disguise a global movement rebalance as stealth work. Check those actual burdens with players before retuning them. Player-selected sprint is not added here; actual native fast escape and any separately admitted sprint use their own resulting speed/contact profile.

Posture is selected only for a body with an admitted posture family. The human standing body is the actor's saved numeric living profile. Its crouched variant retains radius and slope limit, uses `0.60 ×` living height, `0.55 ×` standing eye/ear heights and `0.60 ×` standing interaction height, all anchored to the same actual support. Preserve the existing body capability identity (`person`) across posture so changing numeric shape does not remove item-handling eligibility. Validate these numeric variants at construction, including anchors within the body. Revalidate attachments through their existing compatibility/fit rules. Current equipment ports do not provide local geometric coordinates, so this slice does not claim accurate clearance for the ends of long carried objects. Body collision remains authoritative; equipment extension clearance requires an installed attachment envelope in its owning spatial/equipment design before it can be enforced. This first approximation has no arbitrary limb articulation, prone movement or universal animal crouch.

The transition keeps the old accepted body until its completion boundary. Completion atomically changes posture/profile and related geometry; there is no partially blended mechanical body. Interrupted/refused transitions keep the old posture. An accepted posture change can produce the handling contact below; a request or failed availability check cannot. Preserve gaze's accepted relative transform where the new body supports it; otherwise the joint pose owner applies B's admitted clamp/refusal once. Standing does not reset body life, learned identity, guard recovery or stride phase.

Quiet pace is a movement constraint carried by the body's admitted locomotion policy and the ordinary movement action. Changing it while compatible travel continues settles the travelled prefix, validates the new constraint and invalidates future speed/prediction; it does not create another action lane. Resting, falling, airborne travel, incapacity and actions that lock the relevant stance use their existing refusal/interruption policy. Pace/posture changes are refused during committed evasion, whose speed/end remain pinned. Quiet preference does not slow a newly admitted standing human evade, which uses the ordinary 2.20-metre travel cycle at its actual pinned speed with no deliberate-contact adjustment; crouched evade is initially unsupported and refuses rather than silently standing. A posture action can replace ordinary travel through normal admission; attack/guard work is not silently canceled by a UI toggle. Offers explain the actual interruption. No new crouch stamina drain, trained stealth statistic or chance roll is selected.

## Contact cycles and physical production

The locomotion owner retains normalized cycle phase and an integer contact ordinal per exact body life. For a path piece of actual distance `ds`, advance phase by `ds / cycleDistance`. Emit at each crossed installed contact offset and retain the fractional remainder. Split at route turns, material/support changes, pace/body changes and actual stopping. Time and origin interpolate along the accepted piece, never its endpoint chord or attempted distance. Each new body starts just after its first contact; merely entering movement produces none. Compatible stops, repeated commands and route replacement preserve phase. Teleport/editor relocation suspends motion without earning distance or resetting phase; a genuine new body gets new phase under construction.

For the initial profiles below, one cycle has one contact group at its end. A hare's group represents its bounding contact, not two fictitious human feet. The reusable family also admits ordered offsets in `(0,1]`, with stable contact labels; simultaneous offsets form one physical group. It is bounded to eight offsets per admitted cycle. A larger limb count can use grouped actual contacts or a separately supported profile rather than silently dropping contacts.

| Body | Travel cycle metres | Quiet cycle metres | Crouched cycle metres | Escape cycle metres | Bare body contact level at ordinary reference speed | Foliage coupling adjustment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Human | 2.20 | .66 | .50 | Standing evade uses 2.20; another fast profile requires separate admission | 52 dB SPL at 1 m | 0 dB |
| Hare | .55 | Not installed | Not installed | 1.80 | 30 | −10 |
| Deer | 1.20 | Not installed | Not installed | 2.40 | 46 | −4 |
| Wolf | .90 | Not installed | Not installed | 1.80 | 42 | −6 |
| Bear | 1.00 | Not installed | Not installed | 1.60 | 54 | 0 |
| Small bird on ground | .25 | Not installed | Not installed | .60 | 24 | −14 |

These distances reflect game travel rates rather than an animation rig. Native escape keeps the existing species speed; each body pins a positive finite reference speed from its unmodified ordinary locomotion definition at the admitted clock conversion. Actual speed includes current pace, injury and other movement restrictions; do not recompute the reference from that modified speed. Foliage coupling is a separate authored body/contact property because moving vegetation is different from bearing weight on a foot; changing a foot-impact level does not retune rustling. Wing motion is a separate supported profile, never a foot contact during flight. A crawling contrast can install an interval scrape instead of cyclic impacts; it must provide actual contact/motion coverage.

Initialize the partial-contact fields to peak `0` and all-quiet `true`. For each accepted nonzero travel piece, read the movement owner’s admitted actual rate (never distance divided by an arbitrary callback duration) and retain `peakMovementFactor = max(previousPeak, max(vNormal / vReferenceNormal, .10))` and whether **all** of that travel used the deliberate quiet technique. At the actual contact:

`Lcontact = Lbody + surfaceAdjustment + 10 × log10(peakMovementFactor) + techniqueAdjustment`

`techniqueAdjustment = −4 dB` only when all accepted travel since the preceding contact used the deliberate technique, otherwise `0`. Crouch adds no separate modifier. Reset those fields only when the locomotion contact ordinal advances, after the whole contact group emits, or on genuine new-body construction. Posture, handling, impact and separate landing sounds do not clear an unfinished contact. Preserve both alongside phase across stops, command replacement, pace/posture changes and save/load. A last-moment toggle cannot erase fast travel: the next contact can still be loud, and subsequent fully quiet contacts gain the benefit. This conservative grouped-contact law needs two scalars, is independent of interval partitioning, and adds no acceleration or fatigue simulation.

For unchanged pace this equals `10 log10(max(vNormal / vReferenceNormal, .10))` plus its technique adjustment. The floor keeps a complete load-bearing contact from becoming infinitely quiet; zero actual travel emits none. Preserve the unrounded native level. Body differences come from authored profiles, not inferred health or inventory mass.

| Actual support/contact material | Level adjustment | Physical contact feature class |
| --- | ---: | --- |
| Short grass/soft vegetation support | −6 dB | soft |
| Firm earth | 0 | soft |
| Sand | −4 | soft |
| Timber | +2 | hard |
| Stone | +6 | hard |
| Loose gravel/scree | +10 | granular |
| Shallow water with admitted wading support | +8 | granular |
| Dry leaf litter | +8 | granular |

These are bindings on real support/contact definitions. A nonwalkable water cell does not become walkable to produce a splash. Existing heterogeneous support selection decides which material is touched. At a seam contact, use the support accepted for the landing/contact point under that owner's deterministic tie rule. Independent body contact with a brush volume can coexist with a ground contact.

### Carried equipment

An installed moving component supplies reference rattle level, coupling to its carrier's movement and a transmission factor through each admitted enclosing/fastening relationship. Sum their **linear energies**, including actual quantities, into a derived per-carrier profile. Contributions of no installed acoustic component are absent, not classified by item name. The profile retains no second writable inventory and invalidates on exact custody, attachment, container/fastener, quantity, material and definition changes.

Initial authored examples are cloth contact 32, leather/rigid pouch 40, loose metal assembly 60, secured metal assembly 48, loose tool bag 56 and an admitted clapper chest 64 dB SPL at 1 m at the carrier's reference speed. Each initial component's handling reference equals that listed movement reference before a handling adjustment; later constructions must explicitly supply both fields. These are alternative admitted constructions, not automatically available transformation commands. At a locomotion contact use the same saved `10 log10(peakMovementFactor)` adjustment and actual containment transmission; deliberate foot placement contributes no automatic −4 dB to gear. Actual handling uses its separate handling profile. Combine co-located contact/gear components once as one emission group. The source's feature mixture is energy-weighted over its actual components; do not report the gear list to listeners.

Known count aggregation may multiply equal component energy by quantity. It may not inspect every world item per step or treat a bag as acoustically opaque merely because its contents are private. Content privacy affects disclosure, not native physical calculation. Source preparation can read the owning carrier's complete physical holdings; projected evidence cannot.

An accepted human posture transition emits one clothing/body handling contact at 32 dB SPL at 1 m, combined with actually coupled equipment at its reference handling level minus 6 dB. It uses the old/new body's contact anchor at completion. No footstep distance is earned. Current supported take/drop/equip transitions may emit their admitted item-handling profile at the actual contact; no level is invented from a generic action name.

### Other selected producers

| Physical owner/profile | Selected sound rule and occurrence |
| --- | --- |
| Actual body/tool impact | Material-specific authored contact: soft body 52, wood 60, stone 68, metal 72 dB SPL at 1 m; one actual contact group, including a real shield interception. Current melee uses the contacted body's accepted position plus half its accepted height as its source anchor, captured before mutation; no exact limb/shield mesh point is claimed. Actual projectile contact uses its swept contact position. Missing contact emits no impact. |
| Supported landing/fall | `56 + bodyOffset + 10 log10(1 + vImpact² / (4 m²/normal-second²)) + surfaceAdjustment`, clamped to `[24, 96]` dB SPL; `bodyOffset = Lbody − 52`. Here `vImpact` is the nonnegative closing component of body velocity **relative to the contacted support, along its contact normal**, converted to metres per normal-speed second exactly once. Capture it before clearing fall state. This adds sound, not damage. |
| Moving through short grass contact volume | Real moving-overlap interval at 32 dB SPL at 1 m plus the body’s foliage coupling adjustment and the actual current `10 log10(max(vNormal / vReferenceNormal, .10))` movement adjustment. |
| Moving through dry brush contact volume | Same supported interval at 46 plus foliage coupling and actual current movement adjustment; stops on actual overlap loss or no displacement. |
| Installed work beat | Reference levels above for the actual contacted material; beat phase follows accepted elapsed work, not callback count. An installed beat profile must declare its real contact cadence and anchor. |
| First sustained work example | Existing `prepare` / `fiber` (Clean fibers, `NATIVE_PREPARATIONS.fiber`): 42 dB SPL at 1 m with rough interval features, active only while that exact admitted action is in its working stage. Its current 960-simulation-second preparation is 16 normal-speed seconds before existing work-rate modifiers. Admission/material consumption alone does not start a source; interrupted, blocked or completed work ends it. No new sawing action is required. |
| First environment interval example | Existing active small fire at 38 dB SPL at 1 m, rough interval features; extinguishing ends it. Heat and fuel remain their existing owners. |
| Rain/weather | Initial policy continues to use the installed ambient background. A local rain source requires an actual supported spatial/time profile; no automatic emitter from a weather label. |

Work cadence is authored in normal-speed seconds and uses current work speed/progress through the activity owner. Accelerating the world advances the same process, not a second acoustic rate. A supported manufacture shortcut must preserve every actual consequential beat or provide the same interval analytically; completing all elapsed work in one callback cannot create one fictitious final bang.

## Reception, masking and species traits

Reuse the existing direct-path scalar law: `Lreceived = Lsource − 20 log10(max(distanceMetres, .25)) + 10 log10(Tpath)`. `Tpath` is the product of actual crossed material energy ratios, counting each physical solid once. Zero transmission produces a blocked result with absent finite level/margin. There are no reflections, around-corner paths, frequency bands or source-to-ear travel delays in this family.

Ambient remains the installed 28 dB SPL baseline unless a selected world definition changes it. A local ambient field replaces that term where supported; it must not count the same explicit fire/machinery source again. For candidate emission group `i`, add ambient energy and the received energies of every other physically simultaneous group. Compute that sum in stable native order with maximum-offset arithmetic, excluding the whole candidate group before summing. Do not calculate a small remainder by subtracting two nearly equal enormous totals. Prefix/suffix energy summaries or an exact rescaled complement produce each leave-one-group-out result in linear total work per listener.

`B_i = 10 log10(Eambient + sum(E_j for j != i))`

`M_i = Lreceived_i − max(B_i, hearingFloorDbSpl)`

This is a selected broadband competition law. **Instantaneous impulses use peak/coincidence comparison at their sealed physical phase**, not integrated acoustic energy. Current speech remains instantaneous. A real interval source participates at its start and throughout its active interval, but not at its end. Later causal sources at the same simulation time belong to the next physical phase and cannot mask earlier acquisition. For an impulse, evaluate its real source-to-current-ear path; persistent competitors contribute their current held reception under the displacement-fidelity rule below. Those inputs are part of this one selected provider, not chosen according to cache availability. Impulses never become positive-duration maskers. Only actual impulse roots supply discrete weak weights; an interval can mask or support a detected point mixture, but gains no extra duration or impulse weight from that evaluation. Own-body signals can mask external sounds; only the candidate's own complete emission group is excluded. Proprioceptive self-attribution is separate from a hidden producer identity.

| Hearing profile | Floor | Strong detection threshold `D` | Partial/clear word thresholds |
| --- | ---: | ---: | --- |
| Ordinary human | 0 dB SPL | 0 dB margin | Existing 6/12 dB, unchanged |
| Hare / wolf | 0 | −3 | No language installed for ordinary animals |
| Deer | 0 | −2 | No language installed |
| Bird / bear | 0 | −1 | No language installed |
| Contrast hearing profile | Authored finite floor | Authored finite threshold | Only when a compatible linguistic policy is installed |

The lower animal threshold is a selected discrimination advantage, not a negative background level or hidden identity bonus. It replaces the original uniform animal detection tuning for this target while preserving the ordinary-speech **reaction-band** policy. A source at the same received SPL can yield different detection opportunities for different senses. Perception's selected attribute affects A's familiarity/recognition calculation; this C policy does **not** duplicate that calculation or silently make Perception alter hearing thresholds. A different installed world may select another detection law or omit hearing/recognition entirely. Installed conditions that block hearing remain authoritative; no new temporary-condition multiplier is invented here.

For `delta = M − D`, an impulse or a newly eligible interval reception with `delta >= 0` supplies an immediate strong opportunity. Strong sustained sound has no accumulation delay. For `−6 <= delta < 0`, supply weak impulse weight `(delta + 6) / 6`, once for the actual occurrence, while true intervals use the separate constant-rate duration law below. Below −6 supplies no contribution. A owns weak integration, decay and threshold crossing. Exact equality enters the higher class. Individual threshold reach includes the weak boundary, using unmasked free-field bounds; barriers/masking only reduce that individual opportunity. It is **not** a safe cutoff for mixture or masking. Individually subweak sources must remain in the complete received-energy accounting or a conservative aggregate remainder bound proving they cannot change detection, classification, recognition, words, localization, response eligibility or a deadline. The first implementation uses exact aggregate accounting and may yield as incomplete rather than silently discard the remainder.

### Continuous duration sensitivity

For real intervals, select constant weak support rates rather than a continuously varying numerical integral:

| Received `delta` | A input per normal-speed second |
| --- | --- |
| Below −6 dB | Zero-rate gap; A applies its existing decay |
| [−6, −4.5) | 1 support unit (normalized strength .25) |
| [−4.5, −3) | 2 (.50) |
| [−3, −1.5) | 3 (.75) |
| [−1.5, 0) | 4 (1) |
| At least 0 | Immediate strong reception, then actual live support |

This is an authored difference between a sustained signal and an impulse, not a rounding approximation. A integrates uncovered constant-rate spans exactly, including its first crossing, and decays only during unsupported gaps. The selected continuous provider measures source and ear anchors at no more than **.5 metres of accepted travel each**, using the existing motion-fidelity owner. Between those boundaries it holds each anchor and computes reception from those sampled positions and current acoustic geometry. Relative geometry can differ from the actual scene by up to 1 metre; this is a declared sensing approximation, not exact continuous ray tracing. Actual source/level/material/posture/geometry/life changes cut the held interval immediately. Equality enters the higher band of the measured value. A host publication supplies no extra measurement. The [canonical schedule](../../projects/acoustic-stealth-tech-design.md#canonical-measurements-and-held-reception) owns phase, persistence and point-occurrence handling.

### A valid ordinary-cadence example

The ordinary human profile travels 2.20 metres per contact at 6.6 metres per normal-speed second, so contacts are one third of a normal-speed second apart. If the received `delta` is −1.2 dB, each weak weight is .8. Under [A's selected accumulation policy][a-policy], support is .8 after the first contact, `.8 − 2/3 + .8 = .9333…` after the second, and `.9333… − 2/3 + .8 > 1` at the third. The correlated pattern is detected at the third actual contact. All gaps fit A's .5-second correlation window; no publication poll contributes.

For a human deliberate pace, .66 metres at 1.65 metres/normal-second produces .4-second spacing. At weight .95, two compatible contacts reach `.95 − .8 + .95 = 1.10`. At weight .4 they do not accumulate. Crouched contacts at .50/.99 ≈ .505 seconds are outside that window and do not join without other supported continuous evidence. Slow individually strong contacts still detect immediately. This is a purposeful consequence of the actual A/C choices, not a promise that all faint slow walking eventually becomes audible.

### Mixtures must not become silence

Many equally strong sources can mask individual detail while their combined disturbance remains obvious. After evaluating separable strong groups, combine the unresolved residual signal against ambient and resolved-group competition. When that residual crosses the detector threshold, offer one anonymous mixture exposure with the supported union of directions, unknown producer count and no clean individual/voice signature. Its private support covers the actual contributing roots; it is not a new world sound or a fabricated event.

Allocate each original contribution once: a source represented by that mixture cannot also strengthen an individual weak accumulator for the same physical coverage. If the residual is not strongly detected, feed eligible individual weak contributions to A's permitted correlation rule. Spatially inseparable sources can remain one broad heard disturbance; two source IDs do not establish two heard people. A known own-body component is not an external mixture candidate, though it remains in the mask for external candidates. Ambient alone produces no synthetic occurrence or automatic repeated alarm.

## Received features, classification and localization

The finite physical feature family has four normalized dimensions, each `[0,1000]`: **impulsiveness**, **roughness**, **ringing**, **voicing**. They describe the supported source signal, not the true action, material ID, species or person. Initial actual profile vectors are soft contact `(700,250,0,0)`, hard contact `(900,450,300,0)`, granular contact `(850,800,100,0)`, metal rattle `(900,350,850,0)`, foliage/fire interval `(150,900,0,0)` and ordinary voice `(200,200,100,850)`. A genuinely different source can share the same vector. A work mechanism can sound like steps.

Each acoustic barrier also supplies `featureFidelity` in `[0,1]`, separately from its energy transmission: the meanings are attenuation and preservation of distinguishing structure. The selected initial admitted materials use unobstructed 1, cloth .90, timber barrier .85 and stone barrier .80; an unclassified custom acoustic barrier must supply its own value. Multiply these factors along the same actual path. Existing material transmission ratios remain unchanged. Do not infer a fidelity from a texture or create a second independently editable path-loss value.

Let `q = min(clamp((M + 6) / 24, 0, 1), pathFeatureFidelity)`. At `q >= .85`, quantize available features into width-125 intervals; at `.60 <= q < .85`, width 250; at `.35 <= q < .60`, width 500. Below .35 omit the distinguishing feature. Quantize against fixed bins anchored at zero, clipping the final bin at 1000 and placing the value 1000 in the last bin. Supply only the bin interval, never a narrow interval centered on the hidden exact value. Components destroyed by an admitted source transformation are absent even at high level. `identityFidelity` is the surviving path/source fidelity, not automatically 1.

An ordinary voice additionally supplies a **separate pinned voice-identity sample family** using A's four selected dimensions (pitch range, resonance, texture, speech rhythm), quantized by the same received-quality rule. Generic acoustic-character dimensions never count as usable identity dimensions and never train individual voice familiarity. Actual instantiated voice values are stored with their body/voice owner and may collide; they are not hashes of entity IDs. Each C→A sample is A's exact `InstalledReceivedFeatureSample` with its own family pin, hearing modality, unique finite feature intervals and `{receivedLevelDbSpl, clarityMarginDb, identityFidelity}`. A alone applies its recognition-quality mapping and familiarity/Perception comparison. One instantaneous utterance supplies one actual sample, not one sample per word/token.

The installed **A-owned** nonlinguistic classifier consumes only those received intervals. Offer voice-like when voicing's lower bound is at least 600; ringing-like when ringing's lower bound is at least 600; rough/rustling when roughness's lower bound is at least 500 and impulsiveness's upper bound is at most 500; contact-like when impulsiveness's lower bound is at least 500. More than one candidate can remain. Three acquired compatible contact-like impulses with gaps at most .5 normal-seconds and largest gap at most 1.2 times the smallest may additionally support rhythmic-contact/footstep-like. They must share A's justified observed envelope; no private source equality joins them. Otherwise use an indistinct-sound description. These labels are hypotheses, never a confirmed moving person or proof of hostility.

First delivery permits only **bearing with uncertainty or no location** from sound alone. Quantize horizontal direction to the nearest of eight world-axis directions, with deterministic clockwise tie handling. Retain the original observer ear position and accepted orientation for observer-relative wording. At `M < 6`, half-spread is 90°; at `6 <= M < 12`, 45°; at `M >= 12`, 22.5°. Any attenuating barrier widens spread to at least 45°; path fidelity below .60 widens it to at least 90°. For an unresolved mixture, use the already permitted constituent cones. Choose the narrowest containing cone on the same eight-direction/fixed-spread grid, with clockwise ties, or no bearing if it exceeds a hemisphere. Do not average opposing sources into a fictitious precise middle source.

When horizontal separation is below `max(.25 m, abs(verticalSeparation))`, horizontal bearing is absent. Above/below is admitted only at margin at least 12 and direct elevation angle at least 15° above/below the observer; otherwise elevation is unknown. No same-floor assertion, exact source point, range estimate, hidden wall/room name or current-body binding follows. Values are spatial uncertainty, not a probability of correct identity. Historical cues keep this original frame and precision. For interval reception, the held source/ear anchors can each differ from current physical position by .5 m. Privately widen horizontal half-spread by `asin(min(1, 1 m / horizontalSeparation))`, then round outward to the first containing value in `{22.5°, 45°, 90°, 135°}`. Omit bearing when separation is at most 1 m or no bucket contains the widened cone. Expose only that fixed bucket: the unrounded angle would disclose exact hidden range through the formula. Above/below is unavailable for this initial sampled interval provider; the point-occurrence rule above still applies to speech/contacts. Carry both anchor measurement times privately with the received evidence so sampled availability cannot be presented as an exact current ray or position.

## Nonlinguistic animal response eligibility

Use the existing [animal sound response owner](animal-sound-responses.md) and its one repetition/alarm controller. Its voice reaction bands, 6 dB change bands, 900-simulation-second sensory lifetime and 900-simulation-second pattern idle lifetime retain their own canonical owner. Select the preserved voice bands only when A actually acquired a voice-like classification or understood speech facts. Language-disabled animals require voice-like classification. An indistinct/masked utterance follows the general filter below; private event type, hidden words and true source kind cannot select the voice rule. A physical-sound extension changes eligibility, not memory capability or the meaning of alarm/fear.

For a detected cue without acquired voice/speech proof, first exclude known self emission and a null-response profile. Use `delta = M − D` and only A's admitted received classification/features:

| Received evidence | Hare/deer/bird minimum delta | Wolf/bear minimum delta |
| --- | ---: | ---: |
| Contact-like or ringing-like | 8 dB | 14 dB |
| Continuous rustling or unclassified sound | 18 dB and a real onset or rise of at least 6 dB above this observed episode's retained change baseline | 24 dB with the same onset/rise condition |
| Unresolved mixture | 24 dB and a real onset or rise of at least 12 dB | 30 dB with the same onset/rise condition |

An interval onset means an actual absent-to-present or below-to-at-least-eligible-threshold transition in the A-admitted observed envelope. Extending an already present interval, re-rendering, a changed private source ID, returning from a work-budget yield and restoration are not onsets. The first eligible onset stores its acquired `delta` as the native episode's change baseline. A later qualifying rise compares against that retained baseline, then replaces it once with the new qualifying acquired level; routine samples never move it. A genuine physical end/loss closes presence; a later newly eligible interval may produce an onset, still subject to the existing repeat key/idle rule. Apply threshold/rise changes at the provider’s canonical measurements and actual dependency changes, then solve A’s duration crossing within the held span; publication creates neither. An instantaneous unclassified occurrence can have a real onset but still passes the same strength and repeat rules. Persist presence, baseline and exact contributing evidence under the existing native response owner, outside its optional alarm episode so returning to routine does not invent a new onset.

 Weak accumulation can establish detection without meeting any alarm threshold. An animal may therefore hear quiet routine locomotion and continue. Native short exposure remains available at its own expiry, even when no response pattern is inserted. This filter intentionally avoids interpreting every soft contact as danger while allowing loud near movement and hard clatter to matter. It does not identify hidden conspecifics or grant curiosity/learning.

Extend the existing repeat key by its **permitted acoustic class set** before the existing association-or-anonymous, direction/elevation and band fields. Use ordered class IDs, not emitter IDs, raw component IDs or exact decibel floats. Keep unknown classification as its own value. The current band uses `floor(delta / 6)` for strong cues; a weak-accumulated cue uses band zero for response bookkeeping but cannot meet the physical thresholds above. Actually acquired voice/speech evidence keeps its existing voice class/key behavior; an indistinct utterance does not. Same-pattern refresh suppresses optional review work only; every distinct acquired root retains its own causal meaning. Actual bodily/attack evidence bypasses this acoustic repeat suppression through its existing owner.

Coarse contact/rustle hypotheses use the width-500 feature bin; individual voice recognition retains A's stricter usable-width and familiarity rules. Unobstructed soft contact becomes contact-like at `M >= 2.4`; a hare's contact-response threshold (`delta >= 8`, hence `M >= 5`) is therefore effective without requiring fine classification. Ringing/voice detail can appear later at `M >= 8.4`. An obvious impact can matter before a listener can call it metallic.

For a bare human on grass, ordinary contact is 46 dB at 1 m. Against background 28, a hare has `delta = 21` at 1 m and a response boundary of `10^((21−8)/20) ≈ 4.47 m`. After fully quiet travel, source level is about 35.98 dB and the boundary 1.41 m; quiet crouching gives about 1.09 m. On level ground the hare’s .4-metre ear height gives an ordinary horizontal boundary of about 4.45 m, beyond the inspected spear's [1.8-metre approach distance](../../../packages/domain/src/worlds/base/items.ts) plus one 2.20-metre contact interval, while quiet movement can buy that close approach. These are source-to-ear distances; actual ear height, vision, paths and equipment still matter. One loose-metal component combined with the grass contact gives approximately 22.83 m ordinary / 11.28 m quiet: quieter footsteps do not solve a noisy load.

An escaping hare crossing actual dry brush emits about `46−10+10 log10(.24/.055) = 42.40 dB`. A human can strongly detect that source to about 5.25 m, with a coarse rustle hypothesis to about 3.98 m and possible weak support farther out. That can renew a clue near the failed approach without granting a hidden target. Nominal same-species grass-contact response radii are roughly .35 m for hares, 2.00 m for deer, .71 m for wolves and 2.24 m for bears; the hare radius is below its .4-metre ear height on flat ground, and bird ground contact remains below its threshold even at the .25-metre distance floor. These isolated paper comparisons explain the tuning, not group behavior or measured hearing. Close deer/bear groups, competing sounds and actual escape still require the dense-group/play gates.

Prepare one route review from the final eligible acquired cue set at a sealed physical boundary; process distinct cues in canonical acquisition order but do not solve a route once per footstep inside that batch. Existing all-danger safety and away-bearing tie preference remain authoritative. Two animals learn of an escape only by independently receiving its actual footsteps, foliage or separately supported call; no alarm broadcast is supplied. A noisy surface may propagate a local disturbance, but repeats do not keep resetting settling without a genuinely new eligible pattern. Dense-group qualification must exercise sustained movement, exact idle expiry and eventual safe settling.

## Selected limitations and expansion

No mandatory fatigue meter, probabilistic hearing roll, universal stealth score, sound-triggered waking/damage, perfect range localization, indirect path, scent model or background AI request is selected. Uniform background remains available without requiring a whole environmental simulation. Wind changes nothing unless an installed profile supplies a supported physical relationship. A missing medium/provider is unsupported, not silent evidence of no event.

Acoustic precision and response values may be retuned after mechanical and uncoached-play evidence. Before adding frequency bands, indirect paths, physiological hearing loss or more source envelopes, extend this provider and its exact dependent bounds/persistence/projection rather than creating a new hearing engine. Recording/relay/mimicry must preserve original learning-root semantics and cannot grant a current body from recognized sound.

## Maintained records

- Behavior: [Feature specification](../../projects/acoustic-stealth-feature-spec.md).
- Mechanism and verification: [Technical design](../../projects/acoustic-stealth-tech-design.md).
- Implementation: [ACS00–ACS08](../../maintainers/acoustic-stealth.md).
- Numeric/behavioral limits and evidence: [Acoustic inventory](../../limits/acoustic-stealth.md).
- Separate owners: [hearing/speech](../../hearing-and-speech.md), [animal response](animal-sound-responses.md), [A's familiarity/Perception rule][a-policy], [shared contracts](../../projects/stealth-awareness-tech-design.md).

[a-policy]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/worlds/base/perception-recognition.md

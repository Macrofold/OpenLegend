# Physical sound and acoustic stealth — feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The selected physical-sound design is complete; implementation, integration and player qualification remain open in ACS01–ACS08. | 2026-10-21 |

## Purpose and scope

Make a world worth listening to. A hunter chooses footing, pace, posture, equipment and distance because those choices change actual sound. A fleeing hare can vanish from sight yet rustle through nearby brush. A familiar voice can be recognized across a wall without revealing a body or a precise destination. Ordinary work, moving possessions and independent animal behavior produce useful, sometimes misleading evidence through the same system.

This is **design only** for shared specialty C, based on `Macrofold/OpenLegend:codex/design-stealth-00-contracts` at `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. It consumes the completed [perspective-perception design][a-tech] at `40805523c4a19ab7c6cc455d49d51e4a122ecae0`. Neither sibling runtime nor sibling history is merged. The available vision branch pointed to the common tip when inspected; [SC06/SC07](stealth-awareness-tech-design.md#physical-orientation-posture-and-senses) supply the shared pose boundary without waiting for vision completion.

The [technical design](acoustic-stealth-tech-design.md) owns source contracts, integration and ordering. The [selected world policy](../worlds/base/physical-sound.md) owns the actual movement, sound and hearing choices. This pair resolves the physical-sound/quiet-movement slices of [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization), [ND16](../maintainers/needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) and [SAD-C](../maintainers/stealth-awareness.md). It does not complete those umbrella topics, other senses, attention, emotional design or surprise.

## Existing behavior and selected target

The inspected implementation already has three-dimensional speech propagation, material transmission, continuous decibel calculations, listener-specific words, approximate direction, source-linked history and an existing native animal alarm/escape controller. Current speech is physically instantaneous. Its audible audience and final hearing function require memory capability, so ordinary memoryless animals do not yet receive its sound. The controller's acoustic intake remains missing.

Ordinary movement, follow, evasion, wandering, fleeing, attacks, impacts and work have authoritative physical owners, but do not currently emit general physical sound. There is no admitted crouch/quiet gait, contact phase, equipment rattle, moving foliage sound, persistent acoustic source or concurrent-source masking. This design selects those integrations; it does not describe them as shipped.

Use one hearing calculation and one observer-evidence path. Speech keeps its utterance, wording, addressing and listener-word owner. Nonlinguistic sounds do not become empty speech. The clear-speech query used by existing teaching/social behavior retains its current meaning; hearing a clang must not satisfy it.

## Why this should be compelling

The interesting decision is a plan with understandable costs. Soft ground can be a longer route. Leaving a rattling load behind can sacrifice convenience or protection. Slowing down can buy proximity while giving the quarry time to move. Crouching changes actual body clearance and receiver height, helping only the physical relationships it changes. An archer may prefer a farther shot to a difficult approach; quiet movement must earn its use beside that ordinary alternative.

Sound also creates opportunities after failure. A startled animal can disturb vegetation or another independently listening animal, giving a hunter a new broad clue. A loud working area can conceal a small movement while making conversation harder. Two people can agree on knocks, but hearing that rhythm alone does not prove which person made it. The same noisy prize can be inconvenient while escaping and satisfying when carried home. These uses connect hunting to materials, equipment, work, social knowledge and ecology without requiring a separate minigame for each.

Uncertainty must support action. “A few taps to the left” can justify waiting, moving to a better listening position or checking a doorway. It must not secretly target the hidden actor or force a response. A wrong interpretation can be understandable because different physical sources can produce similar received evidence.

## Physical movement and sound

### Quiet movement and crouching

Quiet movement is an admitted movement policy with a slower speed and deliberate contact profile. Crouching is an admitted body posture with a lower body/receiver profile and its own speed limit. They can combine when the body supports both. Neither grants an actor-wide hidden state, silence, an automatic camouflage bonus or immunity to other senses.

The movement owner applies the most restrictive supported pace/posture constraint, rather than multiplying every restriction blindly. Actual displacement, contact spacing and carried equipment determine the resulting sounds. Standing in place generates no footsteps. Trying to walk into a wall generates no steps for the rejected distance. Route changes and repeated move commands cannot reset the stride and manufacture silence.

A posture transition must fit its resulting body/support and pass the equipment compatibility checks the spatial owner actually supports. Accurate clearance for long equipment extensions awaits an admitted attachment geometry; current ports have no local coordinates. Standing under a low beam can refuse while leaving the accepted crouch intact. The supported first transition is a short ordinary stationary action; the old body remains authoritative until completion, and final clearance is checked again. It consumes the physical action lane, can be interrupted through ordinary rules and cannot be completed by a camera or animation. Compatible independent looking remains governed by vision's sensory transform. No new crouch fatigue meter is selected: slower travel and restricted work already provide useful costs. Actual installed injury, exhaustion and capability restrictions still apply.

The present world's ordinary human travel is fast under its accelerated clock. The selected gait values deliberately preserve that ordinary route while making quiet approach slower. The exact comparison and a mathematically valid weak-footstep example live in the world policy. These are gameplay starting values requiring play qualification, not claims about real physiology.

### Contacts, materials and equipment

Contacts follow the admitted path, including turns, slopes, support seams, stopped portions and landing. The contact material comes from the actual support or intersected physical vegetation, not an image, a terrain name inferred by a model or the nearest visible tile. A body-specific cycle permits a person's alternating contacts, a hare's bounds, a bird's hops and other installed motion patterns without assuming every body has two human feet.

Foot contact, carried-object contact and vegetation contact are distinct physical contributions. A soft footfall does not silence loose metal. Equipment contributes according to actual attachment/containment and its admitted movement-sound profile. Removing a noisy item or using an already supported quieter fitting changes the sound; merely saying “I secure everything” does not install an unimplemented fastening operation. First delivery can use authored fittings and ordinary equipment/placement actions. New crafting methods remain with their existing owner.

Hobnails and padding suggest useful future construction tradeoffs: louder hard contacts can accompany an admitted traction benefit, or quieter fitting can consume materials and space. The first acoustic delivery supplies authored sound profiles; it does not claim new traction, padding-volume or fastening transformations. Those benefits require their own supported material/equipment mechanics. Quieter construction need not become a global superiority upgrade.

### Supported producer boundaries

| Producer | Selected integration | Boundary |
| --- | --- | --- |
| Ground travel, follow, evasion, native wander/escape | Contacts from actual accepted traversal, with body/material/equipment profiles | No sounds from requested motion, animation, teleports or editor relocation. |
| Standing/crouching and equipment handling | Actual accepted transition/handling may emit its authored contact sound | Failed availability checks and canceled pre-contact work do not emit. |
| Melee/projectile contact, falls and landings | Emission at actual contact with the actual struck material/body | A missed strike has no fictitious hit; a released object's performer may already be absent. |
| Work and foliage | Authored beats or a real active interval attached to supported work/contact | No sound on every scheduler callback; no mechanical work invented from prose. |
| Fire or another persistent physical process | One bounded lifetime descriptor under its existing process owner | The process must exist and be active; a caption or weather label is insufficient. |
| Sprinting, breaking objects, additional machinery or creature calls | Same source adapter when their actual action/process is supported | This assignment does not create a general sprint, destruction, physics-audio or animal-vocalization simulator. |
| Speech | Existing committed utterance and propagation owner, with A's received-feature/recognition adapter | Tokens, caption life and text length supply no physical duration. |

The implementation sequence delivers selected existing contacts and a true sustained-source example. Unsupported producer families stay explicit; adding another supported physical action should normally require authored data and an adapter at its occurrence owner, not another detector.

## What a listener can learn

Detection, classification, individual recognition, a proper name, words and location are independent results.

- **Detection:** the listener acquired a sound or a supported accumulation of weak cues. Below-threshold progress is private native preparation, not a clue shown to the player or AI.
- **Classification:** received features might support a rustle, ring, voice or repeated-contact hypothesis. A repeating mechanism can be footstep-like. The classifier cannot read the hidden action and report its true class.
- **Recognition:** A compares received features with this observer's legitimately learned familiarity using the selected Perception rule. A first unfamiliar voice remains anonymous; a canonical source ID cannot supply recognition.
- **Location:** an observer-relative bearing/elevation and uncertainty may be available. The first acoustic family provides no exact point or range from sound alone. A wall may attenuate a voice while leaving enough features to recognize it.
- **Words and addressing:** speech supplies only its admitted listener-specific linguistic facts. Understanding words does not automatically identify a speaker, and sound-only animals receive no words or addressee.

Source positions, actual performer identity, exact material, concealed inventory and pristine signatures stay private. Even saying “behind that wall” requires the listener to know the wall/region; a private obstruction query cannot disclose a hidden room. A familiar recorded or imitated voice, if a future supported producer supplies it, does not prove the familiar person's physical presence.

Each fact keeps its own observation time. Hearing a companion now does not refresh the spear seen in their hand earlier. A historical bearing stays attached to the listener's position/orientation when it was heard. Moving or turning later cannot make that old cue follow the source. Sound alone never supplies a current attackable body or a live route to an unseen source.

## Overlap, repetition and reactions

Real concurrent sources contribute competing energy at each listener. A source is excluded from its own masking calculation; an actor's other actual equipment/body sounds can still mask an external cue. Continuous sources use real admitted active intervals. Independent impulses at one physical simulation boundary share that instant's acoustic scene. A later causally produced sound cannot alter what was already heard. Captions and provider streaming are presentation, not sound sources.

Repeated actual contacts can support a pattern or accumulate weak evidence under A's existing rule. They do not gain extra strength from display refreshes or save/load. A source's hidden identity cannot join two ambiguous patterns. Distinct knocks, impacts, words and consequential contacts retain their occurrence meaning even when routine presentation or optional AI notifications are grouped.

Hearing does not choose a person's action. The attention owner receives a useful cue and can offer or select investigation, watching, warning, continuing work or no response according to that actor's agency. Investigation uses the permitted historical region/bearing and ordinary route admission. It does not chase an invisible entity reference. A player retains control of their own intentions.

Animals use the existing native controller. Detection is independent of memory, language and response susceptibility. Ordinary low-level movement in a group can be heard without automatically alarming every neighbor. The selected world filter uses received intensity/features, never private conspecific IDs. New qualifying evidence can update the controller's one alarm; repeated equivalent patterns do not continually reset settling, recalculate routes or consume randomness. Actual dangerous contact remains independently effective. No collective animal mind or acoustic-only fleeing process is introduced.

Acoustics supplies neither fear nor surprise. Emotional effects belong to D. F receives prior acquired evidence and decides whether it provided relevant warning at the actual victim's immutable pre-outcome cut. A hit cannot warn against itself, and later hearing cannot be backdated into an earlier decision.

An animal response rule is selected from acquired sound character. An A-classified voice or actually understood speech can use the preserved voice response bands; a masked, indistinct utterance follows the general indistinct-noise rule. The hidden fact that an event was authored as speech cannot make an otherwise identical sound more alarming. This is a deliberate narrowing of the earlier unimplemented speech-only target.

## Compared gameplay journeys

| Case | Player/actor choices and available evidence | Required result and meaningful failure |
| --- | --- | --- |
| Quiet hare approach | Choose a soft route, deliberate pace, compatible crouch and manageable load; compare a farther shot | A real reduction in emitted contact sound changes the hare's reception. Nearby loud gear, a hard patch or another supported sense can still expose the approach. Failure is understandable rather than a hidden stealth roll. |
| Noisy armored pursuit | Run along the ordinary route with loose equipment or leave protection/load behind | Faster actual contacts and equipment sounds travel farther. Armor is not universally noisy by name; its profile and fitting matter. A distant fleeing animal is not automatically tracked. |
| Noise behind a wall | Listen, move to an opening, wait or continue | Attenuation can preserve a rough bearing while destroying features or words. No exact hidden marker, unseen floor plan or automatically selected source. |
| Footsteps mistaken for something else | Several comparable taps resemble a mechanism or moving body | A's hypothesis can remain ambiguous or be wrong. Checking a new viewpoint may resolve it; private ground truth never corrects it silently. |
| Familiar unseen speech | Hear a friend through a barrier with appropriate learned voice familiarity | Recognition can succeed while location remains coarse. Low-quality evidence can remain tentative. No live body, current equipment or name learned solely from the event's source ID. |
| Several sound sources | A worker, a voice and movement overlap | Each observer gets their actual mixture. Some features/words become unavailable; physically inseparable sources need not become a count or several falsely precise directions. |
| Dense animal group | Many local footsteps/hops, an occasional loud impact and actual escape motion | Independent hearing/masking and the nonlinguistic response filter prevent routine noise from becoming compulsory group panic. Genuine locally audible alarm-worthy events can spread effects only through real new signals. |
| Fleeing creature on noisy terrain | The quarry crosses brush or hard ground after sight is lost | Its own motion can create a fresh incomplete clue. Follow that clue, change vantage, take a permitted shot or accept escape; no remembered marker follows the hidden body. |
| No memory or no language | A hearing animal detects an impact or human voice | Compact evidence reaches native behavior without autobiography or a model call. A body without installed hearing acquires nothing through that channel. |
| Different body/world | A low crawling body uses continuous contact and a different sensor layout, or a deaf mechanical body has no air-hearing channel | The same physical-owner contracts work without human feet, a head, Perception or air being universal. Unsupported vibration/underwater propagation remains explicit. |

## Presentation and discoverability handoff

G chooses detailed controls and layout. C supplies accepted pace/posture, an honest refusal reason and the permitted sound description/location/time. Ordinary action offers, parser/help examples and NPC intentions must use the same installed gait/posture definitions. Explanations can teach “slower steps and softer ground are quieter” through observed outcomes; they must not display a hidden animal's exact threshold or intention.

Audio, captions and accessible non-audio cues represent the same authorized evidence. Stereo placement cannot disclose an exact hidden point when only a broad direction is known. A ringing chest, rustling brush or failed stand should be understandable without compulsory sound playback, camera shake, constant meters or a new screen for every contact. Current perception and historical cue display remain separate permissions.

## Delivery, acceptance and decisions

Deliver one full physical-source → hearing → A evidence → native/player consumer slice before expanding producers. Include persistence and privacy immediately. Then add posture/quiet travel, concurrent/persistent sources, native animal integration and the complete scenario comparisons. [ACS01–ACS08](../maintainers/acoustic-stealth.md) own exact dependencies and unchecked completion criteria; the technical design owns the eventual verification matrix.

No executable tests, game sessions, runtime performance measurements or balance trials were run for this design. Source inspection, paper traces and document/link review establish contracts, not enjoyment or capacity. Uncoached play must show that the quiet route is worthwhile beside ordinary travel and a ranged shot, and that clues are useful without tedious waiting or excessive noise messages.

**Acoustic product decisions are selected; none require Mike to choose before this design can be handed off.** The shared [SA-D02 representation proposal][sa-d02] still needs disposition by the common owner before dependent implementation. It concerns preserving existing numeric native revisions and exact string personal-source digests, not a reason to invent another acoustic identity. B must reconcile its completed pose schema with C's admitted posture before shared implementation. E/F/G retain their assigned investigation, warning and control decisions. SA-D01 on player psychological fear is outside this assignment.

Initial levels, gait speeds, feature precision and animal response thresholds are reversible authored tuning. Their explicit qualification/expansion triggers are in the limits inventory. Indirect sound paths, full frequency acoustics, waveforms, long sound-travel delays, hearing damage, sound waking, scent, new destruction mechanics, generalized fatigue and sophisticated animal curiosity are outside the selected delivery; none is silently approximated as a hidden guaranteed behavior.

## Maintained records

- Implementation and complete repertoire disposition: [ACS00–ACS08](../maintainers/acoustic-stealth.md).
- Contracts, source audit, ordering and handoffs: [Technical design](acoustic-stealth-tech-design.md).
- Selected world rules: [Physical sound](../worlds/base/physical-sound.md); unchanged speech semantics: [Hearing and speech](../hearing-and-speech.md).
- Limits, rationale and unqualified growth: [Acoustic inventory](../limits/acoustic-stealth.md).
- Shared ownership and final integration: [Shared technical contract](stealth-awareness-tech-design.md), [SAD-C/SAI-C](../maintainers/stealth-awareness.md), [animal sound responses](../worlds/base/animal-sound-responses.md).

[a-tech]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md
[sa-d02]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/archive/05-project/open-decisions.md#sa-d02--evidence-source-revision-representation

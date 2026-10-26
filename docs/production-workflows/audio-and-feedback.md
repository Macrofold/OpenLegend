# From an action or emotion to coordinated feedback

**Status:** proposed production procedures. The [shared workflow](README.md) owns stage records and revision. Existing action, world-presentation, hearing and conversation contracts determine what actually happens and what a participant may perceive. Optional generated speech media remains proposed under [HE07](../maintainers/hearing-and-speech.md#he07--optional-speech-media-and-selected-hearing-extensions).

Use sound, motion, visual effects and interface feedback together to make play easier to read and more satisfying. The production question is what the player should understand and feel through an action: anticipation, effort, contact, surprise, refusal, accomplishment, danger or relief. A louder sound or larger particle burst is not automatically a better result.

**Route:** action/experience brief → event and timing map → sound/motion/effect palette → editable assets → synchronized integration → full-scene mix and interaction review → useful variation and refinement.

## 1. Map the experience to actual events

**Consume:** the selected action or scene, actual start/progress/outcome meanings, relevant interruption behavior, current presentation and the knowledge available to this participant.

**Produce:** a short feedback map identifying what deserves a cue, the purpose of each cue, the authoritative event or permitted state that drives it, and the stage that owns timing.

| Moment, where supported by the current action | Purpose of feedback                                     | What must remain distinguishable                                                 |
| --------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Input accepted for processing                 | Reassure the player that the control responded          | Submission is not a completed game action                                        |
| Action actually begins                        | Communicate commitment, effort or preparation           | Beginning differs from waiting, refusal and later interruption                   |
| Ongoing movement or work                      | Convey rhythm, material contact or continuing effort    | A decorative loop does not prove progress or success                             |
| Supported contact or impact                   | Make the result readable and give it appropriate weight | Anticipated contact and committed outcome can differ                             |
| Completion                                    | Make a useful result apparent                           | Completion follows the actual result, including partial outcomes where supported |
| Refusal, interruption or failure              | Help the player understand and recover                  | Do not reuse success feedback for an unsuccessful attempt                        |
| Aftermath                                     | Give consequence room to register                       | Quiet, recovery and changed surroundings can matter as much as another effect    |

Use only rows relevant to the selected task. This table is a production aid, not a new state machine or timing contract. The actual action owner supplies the facts. If a requested synchronized effect needs a new event or mechanical timing capability, return that question to its existing owner before presenting it as implemented.

**Useful result:** every planned cue communicates something specific and truthful. The contributor can explain what a player should infer from it without referring to implementation field names.

## 2. Define a coherent feedback palette

**Consume:** the feedback map, art direction, material/character identity, nearby actions and expected listening/viewing conditions.

**Produce:** a small palette describing the sound character, motion emphasis, effect appearance and desired contrast for the current experience. Use concrete references and qualities such as dry/soft, resonant/dull, light/heavy, restrained/urgent, rather than asking for generic “epic” output.

Coordinate with the [asset and animation route](assets-and-animation.md) and [scene route](scenes-and-interfaces.md). A light tool and a heavy object should not share an indistinguishable impression when their actual behavior differs. A person may have a recognizable movement rhythm or voice, while repeated everyday actions benefit from variation that remains coherent.

Balance activity with quiet. An ordinary successful action can use a restrained cue; a rare discovery or meaningful consequence can deserve more attention. Repeated effects should not make every moment equally urgent or overwhelm conversation, important threats and readable status.

**Let the soundscape participate in lived activity.** A [Sea of Stars review](https://www.gamesradar.com/sea-of-stars-review/) describes an inn musician's instrument dropping out of the score while the player speaks with that musician. The reusable idea is a perceptible relationship between somebody's action and what nearby listeners hear, not a requirement for music to interrupt every conversation. Where the selected world supports playing an instrument, working to a rhythm, stopping to speak or responding to surroundings, corresponding local sound can begin, vary or stop with those actual events and permitted hearing. Musical layering and ambience must not invent a person's action, private knowledge or physical source. This remains a production possibility, not an installed music-performance mechanic or a new audio engine.

**Useful result:** the planned palette supports identity and hierarchy. If all cues have the same intensity or character, revise the palette before producing many assets.

## 3. Create and edit the source assets

**Consume:** the palette, exact event or permitted spoken words, duration/loop needs, and existing licensed or authored sources.

**Produce:** editable source projects where useful, cleaned individual assets, required loop/variation versions and exports suitable for the actual consumer. Retain the source and meaningful processing settings that make revision inexpensive.

Start with existing useful sounds, clips, particles or effects. Generate or author missing pieces selectively. Specialist sound/music generation can propose material; ordinary audio editing establishes timing, clean beginnings/endings, loop seams and mix suitability. Motion tools provide usable clips only when they export the required skeletal data. The [asset and audio research](../../archive/02-research/ai-game-development/07-image-3d-and-audio-models.md) records candidate tools and their limitations.

An audio contributor or agent should inspect the actual file, not only a provider's success response. Listen for unwanted speech, artifacts, inconsistent tails, intrusive background layers and repetition. Check a loop over several repetitions and compare variants in the same listening context. Preserve useful dynamic range and avoid embedding an entire soundtrack or ambience into a short effect that must mix independently.

For music, a compelling complete track is one possible asset. A changing gameplay situation may instead need loops, stems or transitions that can enter and leave coherently. Produce those only when the selected playback design supports them; do not add an adaptive music engine solely because a provider advertises stem export.

**Useful result:** the individual assets can be edited and combined predictably. If a generated sound is attractive but contains an inseparable unwanted layer, revise or replace that source instead of compensating with an increasingly complicated runtime mix.

## 4. Align sound, motion and visible effects

**Consume:** exported assets, actual event timing, compatible animation phases and the current native/renderer integration.

**Produce:** one complete action or scene transition with coordinated cues. Record which existing owner starts, interrupts, replaces or stops each presentation element.

Align anticipation, contact and recovery with what the game can truthfully show. Preparation can signal an intention; impact/success feedback needs the appropriate outcome. Native events remain authoritative even when the model, network, animation or audio stage finishes late. A visual marker or animation callback must not independently inflict damage, create an item or commit speech.

Inspect the combined action in motion. A correct sound file played too late can make contact feel weak. An excessive anticipation clip can make a responsive action feel delayed. A persistent particle or loop after cancellation can imply continuing work. Diagnose the timing owner instead of repeatedly replacing the asset.

Use the [world-presentation owner](../world-presentation.md) for rendering and movement, the relevant action specification for its behavior, and [UI feedback](../ui-ux/system-feedback.md) for technical submission and recovery states. Keep technical waiting visible in the appropriate interface rather than making a character utter fictional filler solely to mask provider work.

**Useful result:** the action is understandable and has appropriate weight through normal completion and relevant interruption. Perfect frame synchronization is not invented as a universal requirement; identify the particular perceptual mismatch the work is meant to solve.

## 5. Mix and inspect in the whole scene

**Consume:** the integrated action, surrounding ambience/music/speech, representative nearby activity and actual presentation settings.

**Produce:** a reviewed scene mix and a list of specific adjustments. Evaluate isolated assets only to diagnose a problem; acceptance concerns their use together.

Exercise ordinary repetitions and plausible overlaps. Listen for masked dialogue, exhausting repeated cues, sudden inconsistent loudness and loops that fail to stop. Check whether the visible source and perceived direction agree within the supported presentation. Preserve the player's ability to understand important outcomes when audio is disabled or reduced, using existing visual/text behavior rather than adding an unrelated accessibility framework.

Native hearing and media playback are different concerns. The [hearing contract](../hearing-and-speech.md) determines what a character hears and knows. A speaker or ambient sound rendered for the player cannot create new fictional evidence, disclose concealed information or grant an NPC a reaction through a separate path. Use existing permitted projections for spatial cues and labels.

Where a changed effect or asset adds meaningful work, inspect the relevant device/runtime cost. Decode, streaming, simultaneous playback, particles, transparency and shadows can have different causes. Optimize the identified source; do not add new audio scheduling or rendering infrastructure without a real need.

**Useful result:** important cues remain intelligible, ordinary play remains comfortable, and sound/effects strengthen the atmosphere without overwhelming the player's decisions. Actual device and listening evidence should be reported with its limitations.

## 6. Voice is a distinct optional route

**Route when selected:** character casting brief → permitted line audition → edited or synthesized audio → existing speech-media delivery → complete exchange review.

A character's language model, voice model and playback route can be different tools. Compare voice identity, acting, pronunciation and intelligibility using the same appropriate lines; compare the authoring or character model separately through [characters and play](characters-and-play.md). A pleasant voice does not establish independent character choice, truthful memory or good dialogue. The [current speech inventory](../../research/ai-models/voice-models.md) supplies casting and delivery candidates, with exact variant, access, terms, billing and unplayed-demo limits; the [small comparison panel](../../research/ai-models/README.md#a-small-starting-panel) offers one starting contrast when voice work is selected.

The current [voice and calls proposal](../projects/voice-and-calls-feature-spec.md) and [HE07](../maintainers/hearing-and-speech.md#he07--optional-speech-media-and-selected-hearing-extensions) own adoption and delivery scope. They distinguish playback of permitted committed words, private editable microphone composition, timed speech and raw human voice. This production guide does not select those capabilities or imply that they are delivered.

For an authorized offline casting study, retain the exact line, character brief, voice/configuration, output and judgment. Use repeated visits and different emotional situations where the task calls for consistency. A source speaker whose identity is unknown to the listener cannot be exposed through a recognizable voice when the accepted media contract calls for neutral presentation.

For a selected runtime implementation, measure the entire exchange, including relevant capture, transcription, text generation/validation, audio preparation and playback. Exercise audio-off, cancellation/interruption, changed audience and failure under the owning design. Playback must contain only the listener's allowed words, including permitted fragments; muffling a complete hidden utterance is not equivalent to removing unavailable words.

**Useful result:** the selected voice experience improves the actual exchange while remaining fully understandable through its existing text path. Provider generation speed, a recorded audition or one successful playback does not establish complete runtime conversation qualification.

## 7. Preserve useful variation and revise by cause

After the action works, create only variations with a purpose: reducing fatiguing repetition, differentiating real materials, preserving a person's identity across moods, or giving an important moment a distinct sound. Keep the common family recognizable. Random pitch, timing or intensity changes should not imply a different event or destroy the action's reading.

| Problem in play                                  | Return to                                              | Recheck                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Contact feels weak despite correct mechanics     | Motion weight, timing alignment and effect envelope    | Actual contact/recovery, nearby sound and repeated use                                   |
| An action looks or sounds completed before it is | Event binding and technical/native outcome distinction | Pending, failed, interrupted and completed paths                                         |
| Speech is hard to understand                     | Voice source, mix balance or delivery artifacts        | The same words in representative scene activity                                          |
| Repetition becomes irritating                    | Source variation and cue selection                     | Repeated ordinary actions and prolonged scene use                                        |
| Different cues are indistinguishable             | Palette and intended information hierarchy             | Player recognition and nearby competing signals                                          |
| A cancelled action keeps making noise or effects | Playback/effect lifetime owner                         | Cancellation, replacement, removal and relevant scene teardown                           |
| A voice reveals unavailable identity or words    | Permitted source selection and media contract          | Unidentified/partial listeners and changed access                                        |
| A complete track cannot transition with play     | Source arrangement or selected playback design         | Actual entry, loop and exit behavior; no promised adaptive system without implementation |

Record the final source, accepted export and actual binding together. A repeated error can justify a narrow preparation preset, asset check or instruction. Preserve all relevant unperformed qualification in its existing tracker instead of treating the production recipe itself as evidence of a finished player experience.

## Parallel work and handoffs

Once the event meanings and action timing are clear, audio variants, motion polish and visual-effect studies can proceed independently. Share the same source event and contact/recovery references. One integrator owns the combined action. If native timing or animation phases change, notify dependent contributors and revisit the affected cues.

For voice, casting and dialogue authoring can explore together, but final recorded lines depend on the selected words and permitted disclosure. A fixed offline line can be revised deliberately; a live character response requires the selected runtime delivery contract. Do not turn an offline animation/audio handoff into an implicit authority to commit game speech or pay for unattended synthesis.

## Maintained records

- **Implementation:** the affected action tracker, [spatial/presentation work](../maintainers/spatial-world.md), [3D animation](../maintainers/3d-pixel-art.md), [UIUX](../maintainers/ui-ux.md), [hearing/media](../maintainers/hearing-and-speech.md) and [narration/conversations](../maintainers/narration-and-conversations.md), according to scope.
- **Limits and constraints:** [hearing and optional media](../limits/hearing-and-speech.md), [interface/presentation](../limits/interface.md), [AI execution](../limits/ai-execution.md) and the relevant action/asset inventory. No new audio quota, playback system or voice policy is selected here.
- **Evidence:** [asset/audio research](../../archive/02-research/ai-game-development/07-image-3d-and-audio-models.md), [production cases](../../archive/02-research/ai-game-development/02-developer-case-studies.md) and actual topic reports under [verification](../verification.md).

# Perception, recognition and familiarity — selected world policy

**Selected design; not installed or qualified.** This is the bundled world's policy owner for [module A](../../projects/perspective-perception-tech-design.md). [Knowledge](knowledge.md) retains naming, notes and identity ownership; [hearing](../../hearing-and-speech.md) and specialists B/C retain physical sight and acoustics. These values are initial gameplay choices, not measured human psychology, biometric accuracy or a universal engine law. [PP03](../../maintainers/perspective-perception.md#pp03--recognition-familiarity-and-observer-local-subjects) owns implementation; the [inventory](../../limits/perspective-perception.md) owns restrictiveness and qualification.

## Installation and ability

Install the recognition policy only for an actor with the supported individual-recognition capability. Physical detection, autobiographical memory, speech, controller type and recognition remain separately declared capabilities. A memoryless creature can receive sound without this policy; a future native familiarity policy can use the same permitted-feature input without human notes or language.

The inspected base at `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e` has no installed Perception attribute and no learned voice/appearance signature. Add an authored numeric **Perception** attribute with range **0–100** and starting value **50** for the selected recognition-capable people, unless their authored profile supplies another admitted value. Its ID, initialization, range, description and applicability belong to the existing base attribute/world creation definitions. It changes no other check, accuracy, hearing threshold or movement rule merely by being installed. Initial value 50 provides a neutral baseline for character variation without making ordinary acquaintances difficult to recognize.

Read the current value through `world-modules.ts:readAttribute`, including `native-values.ts:currentAttributeState`; do not read a potentially unsettled stored scalar. Let `P = value / 100`. Missing required Perception is invalid installation/preparation, not a secret zero or a generic engine fallback. An omitted recognition capability is a supported different outcome. Committed changes to Perception enter once through that attribute owner. Receiver incapacity, blocked senses, masks, low light and acoustic degradation constrain the actual B/C sample. This slice adds no separate condition multiplier, temporary-stat stack, biography-driven bonus or automatic skill progression.

Authored existing acquaintances must provide the appropriate recognition modality and its legitimate starting familiarity through the identity owner, not only a friend's name in biography. Knowing a face does not imply having heard its voice. A world author can explicitly supply both. Such seeding is authored starting knowledge, not a fabricated past event.

## Perceivable signatures

Use small, authored physical recognizability profiles, not names, entity IDs, species IDs, icon URLs, asset filenames, mesh identity or globally unique fingerprints. The profile may be instantiated using the existing saved randomness during authorized character construction, or supplied explicitly by world content. Never derive it from a canonical ID. Profile values are permitted to collide. Record the instantiated values with their owning body/voice definition; rendering an asset cannot create them.

The selected voice family has four equally weighted normalized features: **pitch range, resonance, texture and speech rhythm**, each an integer from 0 through 1000. These are fictional recognition descriptors; they do not promise raw-audio analysis. An emitted sound's physical descriptor reflects its actual delivery and source body. C determines which portions survive propagation and masking, returning an interval for each available feature and acoustic identity fidelity in `[0,1]`. A receives neither unavailable profile dimensions nor the original clean vector as a convenience. Recognizing a recording's voice, if a recording family is later installed, still does not establish the speaker's current presence.

B supplies the corresponding supported appearance family, including actually available distinguishing features and masks. The same matching operation accepts its declared finite dimensions and weights. B must establish what remains observable with a face obscured, at a distance, or in another pose; A never treats clothing, equipment or a scene-specific asset as permanent individual identity. This is a B input dependency, not permission for A to invent visible facial measurements. Until a physical appearance family supplies discriminating evidence, current body tracking may work while cross-episode recognition remains unavailable.

For voice, a feature is **usable** when its received interval width is at most 400 and C supplies it at the original observation. Require at least two usable dimensions to offer a voice candidate and three to recognize one reliably. A completely absent feature never becomes a midpoint guess. For a learned prototype and current sample, compare only mutually usable dimensions. The dimension distance is the absolute difference between their interval midpoints divided by 1000; `D` is the weighted mean, in `[0,1]`. The width of uncertain observations additionally limits quality below, so a broad interval overlapping many voices does not become a perfect identification.

For a current voice sample, define:

- `audibility = clamp((clarityMarginDb - 3) / 12, 0, 1)` from the actual received signal and background/floor, not source loudness.
- `resolution = mean(1 - receivedFeatureWidth / 1000)` over its usable dimensions.
- `Q = min(audibility, resolution, C's identityFidelity)`.

The 3/15 dB endpoints are a recognition-quality mapping, not changes to the existing detect/partial/clear word thresholds. Speech can be audible or intelligible while voice recognition is unavailable. C must supply a defensible identity-fidelity value from its supported physical family; copying `1` after timbre has been removed is invalid. The current direct-path model can declare preserved timbre for its supported cases, while unsupported transformations remain unavailable rather than guessed. Future C changes reconcile this mapping through this owner; they must not duplicate it in a renderer or speech formatter.

## Learning and familiarity

A first unfamiliar voice creates an anonymous auditory exposure. It does not select a hidden person's existing identity record. A stable learned-individual record can subsequently describe **this distinguishable voice**, even without a visible body or known name. It remains an observer-local subject through the existing recognition and knowledge owners, not an entity spawned into the world.

A qualifying learning sample needs `Q >= 0.55`, at least three usable dimensions and one eligible original physical source. A discrete utterance contributes at most one sample. A genuinely continuous physical exposure may contribute one sample per non-overlapping **two normal-speed seconds** of supplied usable signal; token streaming, string length, rendering and server polling do not invent voiced duration. The current instantaneous speech owner therefore contributes discrete samples, not an estimated speaking interval.

To establish an unbound learned voice, require two qualifying samples attributable to the same perceptually continuous source, with no unresolved competing producer. Two audible utterances from indistinguishable directions do not establish the same producer solely because the server's source IDs match. If a direct, unambiguous sight-and-voice association already identifies the body, one qualifying voice sample may be stored against that independently learned person, but later voice-only recognition still requires two qualifying samples or an explicitly authored voice familiarity.

Each qualifying source contributes one familiarity credit, at most **two credits per exposure encounter** and **12 retained credits per modality/individual**. Store exact supporting source/fact references for the retained credits. A learned voice has at least two credits; six credits across at least three eligible encounters reach the familiar plateau. Let `F = min(credits / 6, 1)` after the minimum independent-sample rule. Additional credit capacity preserves useful support diversity rather than raising the plateau indefinitely.

Episode identity is not sufficient proof of independence. The observation owner supplies source lineage and observed continuity; duplicates, corrections, retellings, recall and publication add no credits. Repeated playback of one retained exemplar, where supported, has one learning-root identity and cannot masquerade as repeated meetings or replenish the encounter allowance. Distinct genuine later utterances can contribute within the stated limits. Deliberately leaving and returning does not reset a still-continuing exposure's allowance.

At most **four representative prototypes per modality/individual** are retained. Prefer an existing compatible prototype; combine samples only when independently admitted association establishes the individual. Store observed intervals and their exact sufficient supports. Do not widen a prototype to absorb an ambiguous candidate. If a further supported context is needed, retain the four prototypes maximizing observed feature coverage, then usable quality, then earliest acquisition/source order. Deterministic ties use the observer-local key, never a hidden source. This bounds matching without claiming every costume, illness or mimicry variation is recognized. Replacing a prototype changes future recognition capability, not the old observation.

Within the 12 support slots, retain distinct qualifying sources by quality, then distinct encounter coverage, then earliest acquisition/source order. A better later source can replace a weaker sufficient support. No source gets extra credit from being both a raw observation and a summary leaf. If correction/forgetting makes retained support insufficient, reduce familiarity or invalidate the prototype; source compaction preserves sufficient structured support under the memory contract. The first implementation can conservatively clear more affected learned recognition through the existing invalidation owner. It cannot invent replacement supports from the source's current body.

No passive calendar decay or fixed lifetime expiry is selected for learned individual recognition. The short exposure window, raw-recall window and an animal's sensory retention are not acquaintance expiry. Explicit forgetting/correction and supported loss of the learned profile still matter. Broader natural memory decay remains ND19 work.

## Matching and association

Match only against this observer's eligible learned prototypes of the supplied modality, selected by the conservative permitted-feature index. Do not use the physical source ID, global name or hidden life to choose the candidate. Evaluate against the pre-learning record set; the current sample cannot create its own prior familiarity and then prove its own identification in the same transition.

1. A candidate requires `Q >= 0.20`, at least two mutually usable features and `D <= 0.30`.
2. For reliable voice recognition, require a learned voice, at least three mutually usable features, `Q >= 0.70 - 0.20P - 0.15F`, and `D <= 0.08 + 0.04P + 0.04F`.
3. The next best eligible candidate's distance must exceed the best by at least **0.08**. Candidate enumeration must be complete for that decision; a truncated page cannot prove uniqueness. An exact tie remains ambiguous even with maximum Perception and familiarity.
4. If reliable criteria fail but candidates exist, retain a tentative association, including up to the two best tied/near candidates for ordinary presentation and an explicit more-candidates indicator when appropriate. No tentative candidate authorizes canonical subject binding, body targeting or automatic merging of private notes.
5. If no candidate qualifies, preserve the detected sound and other permitted detail without an individual association. Weak/absent recognition is not failed hearing.

At `P = 0.5`, a two-credit learned voice requires `Q >= 0.55` and `D <= 0.1133…`; a familiar voice at six credits requires `Q >= 0.45` and `D <= 0.14`. Keep the exact algebra in execution; these displayed values are explanatory, not rounded admission thresholds. The improvement means familiarity and perceptiveness can recover a noisy or changed voice while the independent competitor margin still prevents mechanically certain identification of two similar strangers. These are authored scores and thresholds, not calibrated probabilities.

An already recognized visual person can be matched in a different place through the same supported feature policy. Place, clothing, activity, companions and carried items may support an explicitly tentative contextual inference but cannot replace missing individual evidence. A recognized person's new voice observation updates that voice fact and its supported association only. It does not refresh equipment, location or unseen activity.

## Exposure and weak evidence

Use B/C's completed physical evaluation. An immediate detection opportunity is acquired at its actual native boundary with no deliberate delay. A's weak-evidence integrator consumes a supplied nonnegative detection-support rate or impulse under the pinned detector policy. B/C owns the physical mapping into that support, including receiver capability, material, light and signal strength. Existing current sight and ordinary detected speech remain immediate until their respective specialist laws deliberately select a weak path.

For the selected accumulating family, threshold and maximum are **one support unit**. A continuous full-strength rate supplies one unit per **0.25 normal-speed seconds**; a weaker rate scales this linearly. A discrete weak impulse contributes its supplied fraction once. During an unsupported gap, support decays linearly to zero over **0.5 normal-speed seconds** from a full unit. Integrate disjoint supported intervals and solve the first crossing exactly within the supplied interval; never apply a whole future chunk before its threshold time. Store progress, through-time, detector pin and consumed original-source identity through the episode owner. B/C may split a sample at a physical discontinuity; publishing it more often does not change the integral.

Weak cues combine only with an observed continuity justification: compatible direction/region, overlapping temporal pattern and compatible perceivable signature. A hidden shared emitter ID is insufficient. Ambiguous overlapping sources can supply a broad contact or separate candidates; they cannot become a definite person or a definitely single producer. Losing a correlation justification ends that accumulated hypothesis. Subthreshold state is not player or model knowledge.

An episode may reconnect for **0.5 normal-speed seconds** after the actual last supported observation; this is 30 simulation seconds under the current 60:1 clock. Anchor the grace to actual sensory loss, not to whether a throttled arrival/departure story row happened to be written. Any return during the supported grace preserves the episode but authorizes only newly supported current facets. This replaces the current recorded-departure-dependent grace for the selected episode path while retaining its initial effective duration. Narrative encounter quotas remain separately owned and do not control recognition.

Actual loss immediately removes live body/detail authorization. The grace preserves correlation only, and remembered identity has its separate lifetime. A heard impulse is historical after its physical reception ends even if G keeps its permitted cue readable briefly. User display duration cannot prolong hearing or current source activity.

## Names, source kinds and danger

An observer may give a learned individual a private label under existing name-edit limits. A heard self-introduction records the actually understood name as a **name claim** associated only as far as the voice/body evidence supports. Knowing or choosing a name does not improve recognition, prove a claimed identity, rename the subject globally, or attach a second stranger to that person's notes. Duplicate names remain distinct.

The ordinary native classifier can label an acoustic pattern as footstep-like or rustling using the installed physical family. Such labels are inferred source kinds, not proof that a person exists. A direct observed person, an uncertain footstep classification and a reported danger are different records. The selected world does not require a model request for ordinary sensory classification.

A received warning can support a belief that an area is dangerous without identifying the danger. Whether to trust it, investigate or prepare belongs to existing knowledge, attention and encounter owners. A does not assign fear, hostility or surprise. False testimony remains attributed even when several people repeat it; absent a supported transmission link, the listener does not magically know that two accounts share an origin.

## Maintained records

- Implementation: [PP00–PP07](../../maintainers/perspective-perception.md), coordinated with SPK, EPR and SAI-A.
- Limits and tuning: [Perception inventory](../../limits/perspective-perception.md).
- Engine integration: [Technical design](../../projects/perspective-perception-tech-design.md).
- Existing world ownership: [Knowledge](knowledge.md), [attention](attention.md), [animal sound responses](animal-sound-responses.md) and [time](time.md).

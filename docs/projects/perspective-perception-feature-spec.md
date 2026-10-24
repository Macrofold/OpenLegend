# Observer-specific perception, evidence and recognition — feature specification

| Status      | Current progress                                                                                                | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Module A design is complete and reviewed; PP01–PP07 implementation and gameplay qualification have not started. | 2026-10-24   |

## Purpose and selected scope

A character should know the world through their own experiences. They can hear something behind a wall, recognize a familiar voice without seeing its owner, remember a person whose present whereabouts are unknown, or accept that an area is dangerous while remaining unsure what is there. These are useful forms of knowledge in their own right. The game should let a player act sensibly on them, compare accounts, make discoveries, and live with the consequences of a mistaken interpretation.

This is module **A** of the [shared stealth and awareness design](stealth-awareness-feature-spec.md). It selects one structured, observer-permitted evidence contract across perception, event observation, identity, personal experience, memory, retrieval, native responses, cognition and authorized player presentation. The [technical design](perspective-perception-tech-design.md) specifies records, algorithms, ordering, owner integration and exact acceptance. The [shared interface contracts](stealth-awareness-tech-design.md#shared-contracts) remain authoritative.

A owns acquisition, recognition, permitted association, independent fact freshness and retention. Vision owns geometric visibility, light, obstruction and available visual detail. Acoustics owns physical emissions, propagation and the sound arriving at a listener. Attention owns what an actor investigates or attends to; effect owners decide startle and fear; encounter/combat owners decide preparation and surprise. Player experience owns controls and presentation. A supplies the evidence these owners may use without selecting their response.

This completes a scoped evidence and recognition design, not the broader [ND16 hearing and communication](../maintainers/needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) or [ND19 memory transformation](../maintainers/needs-design.md#nd19--older-memory-transformation-and-dream-reinterpretation) programmes. Their other design and delivery work remains independently tracked.

## Existing behavior and accepted target

The source baseline is the exact contracts-branch tip, `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. The technical design records the relevant domain and service owners and the limits of source inspection. Existing [perception](../../packages/domain/src/perception.ts), [event observation](../../packages/domain/src/event-observation.ts), [experience](../../packages/domain/src/experience.ts) and [base-world knowledge](../../packages/domain/src/worlds/base/knowledge.ts) provide real foundations: scoped observations, personal records, exposure-based associations, authored acquaintances and observer-specific names. Speech already has listener-specific reception, and player views have observer-dependent disclosure.

Those foundations do not deliver this full design. Persistent learned voice/face familiarity, observer-local learned individuals without a canonical binding, independently fresh fact projections, evidence accumulation across compatible cues and the complete retention/consumer path remain implementation work. The inspected baseline has neither the selected shared visual/recognition Perception attribute nor a physical voice-signature recognition subsystem. Their selected laws belong to [base-world recognition policy](../worlds/base/knowledge.md#identity-and-recognition), not an implicit engine-wide capability.

Everything below is the **selected design target**, including its acceptance scenarios. No runtime change, executed gameplay test, measured performance result or demonstrated player enjoyment is claimed.

## What makes this worth playing

Personal information should create opportunities throughout ordinary life, not only while sneaking past enemies.

- **Familiarity rewards shared life.** A helper can become recognizable before an introduction. A companion's voice can offer reassurance, a lead or an invitation. Recognizing someone in a different job or place makes relationships feel continuous without making recognition infallible.
- **Different witnesses have different useful contributions.** One person remembers a spear; another heard an argument; a worker recalls that the doorway was blocked. Their accounts can improve a plan without any one witness delivering the whole answer. Helping or persuading them remains social play with people who have their own work and interests.
- **A clue can be enough.** A rough call for help can justify checking the ravine. A warning can justify moving a class away from a gate. Delivering aid, finding a safer route or resuming useful work can be success even when the sound's identity remains unresolved.
- **Discovery changes a particular interpretation.** A later meeting can connect an old voice to a returning visitor. That connection is satisfying because the old words and their original circumstances remain recognizable; it does not reveal every hidden act the visitor performed.
- **Correction has social consequences.** A player can withdraw a mistaken identification while defending an honest observation, find the people who heard the accusation, and choose what amends to offer. Recipients may believe, doubt or forgive according to their own evidence and motives.
- **Invented circumstances matter.** A door, a muffled load, a chosen listening position or a physical decoy can change what information reaches someone through ordinary world rules. The result can support rescue, work, comedy, music, hospitality or escape as well as combat.

Uncertainty must be legible enough to support a decision. A player should understand the difference between “I heard something” and “I identified Ada,” and have ordinary actions available without first completing an investigation interface. Recognition is not proof of loyalty, credentials, consent, obedience or private intention. Failure to identify a source must not routinely halt play or turn every ambiguous sound into a compulsory mystery.

## The evidence a character receives

The following distinctions survive storage, recall, summarization and display. Prose may explain them, but cannot replace them with one summary or an `awareOfPerson` flag.

| Distinction                           | Selected meaning                                                                                                                                    | Example and forbidden upgrade                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Physical occurrence and actual source | The world resolves the exact occurrence and causal producer. Some or all of this can remain private.                                                | An object strikes a wall. Knowing its server-side owner does not tell the listener who caused the sound.    |
| Received signal                       | The observer's senses receive only the signal allowed by the physical owners. Arrival, masking and available features can differ between observers. | Speech reaches one listener clearly and another as muffled sound; neither inherits the other's words.       |
| Detected observation                  | A detected cue records its sense, observation time or supported interval, direction/region, quality and missing detail.                             | “A rustle came from my left” need not include a source type, exact point or visible object.                 |
| Classification and candidate identity | A type or identity can be an uncertain inference with its own support. Unresolved alternatives remain possible.                                     | “Footstep-like” does not assert that a person exists; “sounds like Ada” does not bind Ada's body.           |
| Stable individual and known name      | A learned individual association is distinct from a canonical binding, current physical presence and a learned or chosen name.                      | A recurring unnamed voice can be familiar; two people called Ada remain distinct.                           |
| Individual facts and freshness        | Each fact preserves its own original time, source support, permitted association and current/historical status.                                     | A new voice observation does not refresh an old spear sighting.                                             |
| Experience, inference and testimony   | Direct experience supports what was experienced; claims about its meaning or another event retain their attribution.                                | Hearing “Ada stole it” establishes the heard accusation, not the theft.                                     |
| Confidence and precision              | Express useful limits in the dimension that is uncertain. Qualitative confidence, alternatives, ranges or unknown values are valid.                 | A recognizable voice can have poor location precision. No universal probability is required for every fact. |

Unknown values remain unknown. A listener may know the time of hearing without knowing when recorded words were originally spoken. A report may describe an approximate event time while its receipt time is exact. Storage time, current recall time and current name knowledge cannot substitute for the original observation or claim time.

### Detection and accumulating evidence

Strong received evidence can be detected promptly at the actual native sensing boundary. Weak exposure can build across supported intervals or genuinely related cues. A repeated cadence from a compatible region may support continued listening; unrelated rustles cannot be combined merely because the backend knows they share a producer. If grouping itself is uncertain, the grouping remains an inference.

The same occurrence reaching the same observer through retries, refreshes, duplicate event accounts, recall or consolidation is not another independent observation. Distinct physical observations can add support when their relationship and limits permit it. A new actual in-world recording emission, where that family is installed, is a new listening experience with the same recorded origin; it is not a history of independent meetings with the recorded person. UI replay, caption refresh and optional read-aloud synthesis only present already acquired evidence and create no new acquisition or familiarity. Retelling a rumor does not create another original witness.

Detection, intelligibility, location, classification and recognition can improve independently. Someone may hear speech before understanding any words; understand a warning without identifying a voice; recognize a voice without knowing what was said; or see a body whose face and equipment remain obscured. Ordinary mechanical detection and classification use native rules. An AI request is not required for each cue.

Absence is bounded evidence. Looking into a small visible region can establish what that inspection failed to reveal there. It cannot prove an entire building empty or a previously heard danger imaginary. Visual sensing uses canonical active-scope samples with the world’s explicit 50 ms normal-time fidelity; a shorter unrepresented flash can be missed. A transient cue that was missed stays missed. Later noticing its aftermath may provide a different experience, but never backfills the earlier witnessing.

### Recognizing an individual and learning a name

Voice recognition uses personally supported familiarity, the acoustic features actually available now, relevant supporting history and the installed world policy. An explicitly authored prior acquaintance can supply supported starting history; missing history cannot be invented from a name or hidden identifier. The selected base world installs one Perception value for its human visual detection/detail and individual recognition policies, independently of memory. Physical hearing thresholds remain separate. Detailed laws and thresholds belong to [Recognition, familiarity and association](perspective-perception-tech-design.md#recognition-familiarity-and-association) and [base-world knowledge](../worlds/base/knowledge.md#identity-and-recognition); this specification does not define a second matching formula.

A first unfamiliar voice alone grants no reliable voice-to-canonical-person association. Sufficient history can instead establish an **observer-local learned individual**: a distinguishable unnamed voice or face, with an optional later canonical association. When the learning rule establishes such an individual, the qualifying observation has an immediately usable supported association to that local pattern; the character need not wait for another encounter to remember “that same voice.” This grants neither a canonical person identity nor a current body. The same identity/knowledge owner manages that subject. No fake entity, separate voice registry or second note system is introduced. Deliberate notes about such a learned individual use a typed observer-local subject through the existing notepad owner. A momentary anonymous cue does not automatically create a permanent person or notepad. Naming and note-writing are voluntary, not prerequisites for recognition, speech or evidence acquisition.

A sufficiently clear view can establish a learned visual individual from one qualifying observation of an unambiguous body. Matching against remembered people happens first; if that does not identify someone, the new visual pattern remains observer-local. A weak or obscured glimpse may remain unresolved. Learning the pattern grants neither a name nor continued sight after the person disappears, and never recovers an old identity through hidden IDs.

Supported cross-sense evidence can connect a voice, a visible individual and earlier particular observations. A face can remain hidden while clothing or context supplies only a tentative candidate. A familiar person seen elsewhere need not be treated as a stranger merely because their clothes or role changed, but hidden identifier equality cannot settle weak visible evidence. Where two similar voices cannot be distinguished, the result remains unresolved; the system cannot secretly announce the number of producers from their IDs.

An introduction supplies words or a claimed label to the degree actually heard and understood. “I am Ada” does not select the correct stored Ada without supported individual association. Names may be conventional, false, observer-chosen or shared by several people. A known name does not improve the acoustic match. Supported later naming changes present labels while preserving the original quotation and what the observer knew at the time.

A tentative candidate never grants a current-body reference. A character may consider an already known person's history while entertaining a hypothesis, but the hypothesis cannot convert that person's notes into verified facts about an anonymous cue. Later confirmed association relinks only supported retained observations. If notes already exist on both subjects, reconciliation preserves their contents and revision rules instead of silently overwriting a pad.

Recognition also does not prove that a familiar voice's owner is the current physical emitter. Recordings, relays or imitation, where an installed world supports them, preserve the distinction between the heard voice, its possible attribution and the current producing object or person. Such extensions must compose with this contract; they are not required recording or disguise features in module A's first release.

## Current observations and remembered facts

Current knowledge is a set of independently supported facts, not a periodically refreshed portrait of a person. An observer can currently hear a familiar voice while only remembering the person's face, equipment and earlier location. A fact can cease to be currently observed without being forgotten. Its historical value and useful uncertainty survive according to retention policy.

| Ada example                                                       | Permitted evidence after the occurrence                                                                                                                              | Still unavailable                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Earlier: Ada is recognized by the gate, visibly carrying a spear. | The sighting, its time and region, supported individual association, and the observed spear are recorded.                                                            | Unseen possessions, motives and future route.                                                        |
| Ada leaves the permitted view.                                    | Ada remains a known person. Gate location and spear become historical when their observation ends.                                                                   | Current location, pose, equipment and activity. Exposure continuity does not extend live disclosure. |
| Later: a familiar voice is heard through a wall.                  | A new hearing time, usable voice evidence, any supported words, and an approximate bearing/region. The voice may support association with Ada under recognition law. | A fresh spear fact, exact source position or proof of what Ada is otherwise doing.                   |
| The observer turns around.                                        | The sound retains the observer position/orientation at which it was heard and its original permitted region.                                                         | A rewritten claim that the old sound came from the observer's new left.                              |
| Still later: Ada is seen clearly without a spear.                 | A new visual equipment observation can replace the current equipment view. The older spear sighting remains an accurate historical account.                          | Where the spear went during the unseen interval.                                                     |

The practical account can therefore be: “Ada was last seen by the gate carrying a spear. I heard Ada recently from beyond that wall, but I do not know exactly where she is or what she is doing now.” Each clause comes from distinct structured support. If the voice was only a candidate match, the account must say so.

Intermittent visibility preserves the same distinction. A brief occlusion may preserve an acquisition episode or a learned association, while all unsupported live details stop immediately. A later glimpse grants only the newly available facets. It cannot fill the gap with an inferred hidden path. Historical location or bearing may be transformed for a display using its recorded frame, but must remain anchored to that old observation, never the source's unseen movement.

## Interpretation, testimony, correction and forgetting

A directly experienced signal, its mechanical classification, a character's interpretation and a reported claim can all coexist. “I heard footsteps” may be a shorthand for a footstep-like sound with uncertain source type. If later evidence shows a loose shutter, retain the actual sound experience and correct the unsupported classification. The system does not need to fabricate a once-existing person in order to retract that inference.

Contradictory testimony retains who reported each claim, when it was received, the claimed event time where available and the source lineage the observer actually knows. Two witnesses can disagree honestly; a retelling can distort; a speaker can lie. The observer need not assign artificial probabilities or resolve every contradiction. Repetition or social prominence does not silently turn a claim into direct experience. An authentic letter establishes its expressed contents, not the writer's private or current intention.

Correction distinguishes a new observation from a revised interpretation of old evidence. A mistaken identity can be withdrawn without erasing the heard words or the witness's original uncertainty. A later association may improve how retained evidence is found and described without changing its timestamp or pretending the name was known earlier. Retractions reach other characters only through their own received evidence; there is no global repair of everybody's beliefs.

Personal correction and forgetting use the existing memory/knowledge owners and source lineage. Removing support invalidates dependent recognition, associations, inferred facts and prepared context as required by those owners. Consolidation and retrieval must preserve uncertainty, original times, source attribution and the distinction between current observation and memory. A summary must not turn several weak accounts into one certain fact or make an old position current. Optional authored memory alteration can follow the same boundaries without being selected for this release.

Forgetting does not erase physical history or undo consequences already enacted. It must not be silently reversed by reopening a panel, restoring a cache or rehydrating a forgotten raw account. Other observers can still remember what they legitimately experienced. A retained meaningful acquaintance or deliberate note has an explicit lifecycle; arbitrary cache eviction cannot impersonate an in-world act of forgetting.

## One permitted account, different capabilities

The same observer's evidence is the permission boundary for every consumer. Different observers can legitimately receive different evidence because their senses, bodies, histories and positions differ. Sharing the boundary does not require identical cognition or identical behavior.

| Consumer                                        | Supported use                                                                                                                                                                       | Required limit                                                                                                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reasoning NPC                                   | Native intake supplies detected facts, uncertainty, source roles and relevant retained experience. The character may ask, investigate, warn, reinterpret or continue existing work. | A model receives no hidden producer identity or source coordinates to help it reason. Missing AI output is a computer outcome, not an invented decision to ignore a cue.         |
| Native animal or other nonlinguistic controller | Installed channels can supply detection, direction, useful classification and supported familiarity to the existing controller.                                                     | No human language comprehension, autobiographical memory, naming or paid thought is required. A memoryless body can still receive a native cue and respond under its own policy. |
| Authorized player                               | The controlled character's current and historical evidence can inform captions, observations, histories and ordinary action references.                                             | UI selection, camera movement, reconnecting or cached rendering cannot reveal hidden live details or turn a remembered person into a reachable target.                           |

A currently addressable body, including an unnamed person, or an existing permitted remembered-person addressee reference can support directed speech under the speech owner's rules. An anonymous contact, bearing or learned voice without an admitted person association cannot supply a directed addressee. The character can still use ambient Speak—for example, “Who is there?”—turn, listen, inspect a visible area, choose an ordinary permitted movement destination within the perceived region, or address a separately known companion. These actions follow their existing admission rules, including Speak's service availability, and never resolve the cue to its hidden producer. A remembered addressee grants no current movement, attack or inspection target for an unseen body; each action validates its own physical and reference permissions.

Attention can prioritize meaningful changes and suppress repetitive intake without deleting acquired evidence. Investigation uses a perceived or remembered region, not hidden live coordinates. A warning can enter a defender's evidence without naming an attacker. The preparation owner decides whether the warning was relevant and timely; A supplies an immutable cut of what had actually been acquired before the dependent outcome. A later report or the impact itself cannot retroactively supply earlier warning.

## Worked gameplay journeys

These journeys define observable behavior and meaningful choices, not compulsory NPC responses. The technical design's detailed acceptance matrices make them implementation-verifiable.

### An ambush with useful warning but no identified enemy

A worker hears scraping near an approach. The evidence may support likely danger in that region, based on the cue and legitimately retained context, without proving a person exists or naming an enemy. They can move valuable cargo, call a warning, ask a companion to watch, inspect from a safer place or continue working. A listener to the warning receives its actual words as testimony, with their own available source recognition.

A defender who receives useful warning can prepare through the attention and combat owners even while the attacker's identity remains unknown. A missed warning cannot count. The native ordinary-warning adapter can ground an actually understood “Look out at the doorway now” through the listener’s retained Known places snapshot and original utterance time; ambiguous or unheard wording stays testimony without an invented danger region. Detection of the eventual strike records what was actually felt or seen without upgrading the pre-attack cut. The ambush can end in escape, deterrence, negotiation or combat; module A does not decide those outcomes or assign fear.

### A familiar voice behind a wall

Use the Ada timeline above. One familiar listener can associate the usable voice; an unfamiliar bystander may hear the same words without knowing who spoke. Moving to a doorway, calling back or asking a companion are opportunities to gain different evidence. Listening can also be enough to decide to wait or seek help.

A name in a caption must come from the listener's association and name knowledge. Lack of sight cannot erase legitimate familiarity, and familiarity cannot expose current equipment. Clear words with an unfamiliar voice and recognizable voice with missing words are both valid outcomes. If later evidence contradicts Ada as the producer, correct the particular association while retaining the heard observation.

### Two similar-sounding strangers

Two strangers have similar voices. At first, an observer may have two visible local contacts, an unresolved series of sounds, or a distinguishable recurring voice without a body association, depending on actual exposure. Two hidden IDs are not evidence that there are two speakers. The same name or broad voice description cannot merge them.

The player can ask an ordinary clarifying question, get a usable view of who speaks, or continue a useful conversation without resolving identity. Supported co-observation can associate a particular utterance and build familiarity. Poor later acoustics can still leave two candidates. A wrong attribution is a revisable belief with consequences; learning the truth does not rewrite which words were heard or grant a blanket association for every earlier voice.

### A person disappears from view

A recognizable visitor turns a corner. Their live pose, location and equipment stop updating. The observer can remember the last sighting, ask a witness or search the observed exit region. A brief glimpse through foliage may supply movement and broad appearance without face or weapon detail. Recognition continuity cannot fill the intervening route.

If the observer hears a later call, that is new evidence with its own limits. If nothing is found, the local inspection remains a local result. A worried companion can choose to keep searching or finish another responsibility; the narrator does not reveal the visitor's hidden destination, safety or death to settle the matter.

### A sound with no identified producer

A rustle comes from the listener's left near a wall. The record can contain hearing, time, a broad region and poor classification, with no person subject. Several compatible cues may strengthen a hypothesis without proving a human producer. Turning or moving supplies new evidence only if it is physically available. A shifted board or animal can eventually explain the sound; it may also remain unidentified.

The practical success may be choosing a better route or confirming that a nearby task can continue. Failure can be a wasted look or a misleading interpretation, rather than an unavoidable attack. A physical decoy is effective because someone received its signal, not because the creator set an opponent's awareness Boolean.

### A corpse and a replacement body

A known person dies outside an observer's experience. Server lifecycle bookkeeping must stop stale physical bindings from attaching to a later body, but cannot tell the observer that death occurred. Their remembered history and uncertainty about the person's survival remain meaningful.

Seeing a corpse may supply evidence of a body and its condition before recognition is possible. Identity requires the available features and applicable world law. A replacement or reused storage identity cannot silently inherit the dead person's current presence, recognition permissions or memories. A world that explicitly supports further personal continuity must use its selected continuity owner; this design does not infer such a law from row reuse or a familiar name.

### A familiar recorded voice — extension acceptance

Where a recording family is installed, a box plays a familiar call. Hearing the box is a fresh listening event; the reproduced utterance has its own earlier or unknown origin time. The recognizable voice can help identify its attributed speaker or choose a search, but does not prove that the person is present, alive or currently calling for help. Repeated playback does not create independent meetings or update the person's equipment.

Inspecting the box, hearing an actual reply or receiving another independent observation may change the inference. This contrast also constrains supported relays and imitations. It does not select media playback, voice mimicry or remote communication implementation as prerequisites for ordinary perception.

## Privacy, lifetime and service behavior

Exact occurrence links, causal producers and entity/life bookkeeping can support the backend without appearing in character evidence. Consumers receive scoped references and permitted labels. Unknown sources have no hidden canonical identifier or name in model input, player payloads, captions, action metadata or ordinary diagnostic presentation. Permission must hold across full snapshots, patches, history, caches and reference resolution, not only the visible sentence.

Association, correction, forgetting, control changes and body/timeline transitions invalidate affected derived views and in-flight work through their existing owners. Source death may stop a physical binding without deleting historical support. Effects and recordings may outlive their producers without resolving those producers to a replacement. Restoration preserves the same supported facts, familiarity, meaningful exposure progress, original times and consumed causes; it does not simulate a first encounter, repeat a reaction or acquire a cue missed in the saved history. This project targets the current save format, without legacy migration or compatibility machinery.

Retention, candidate search, pending work, retrieval and projection have explicit behavioral and resource bounds in [Limits and constraints](../limits/perspective-perception.md). A limited output is not sufficient if producing it scans or hydrates an unbounded history. Working-set eviction must distinguish retained personal knowledge from disposable acceleration data. Native sensing must remain usable without a model request per cue, a permanent query per possible actor pair or accumulating duplicate observations forever.

Required sensory work that cannot finish on time remains incomplete under the shared scheduling contract. It must not become fabricated silence, a false absence, a dropped strong cue or extra surprise. Consumers use a coherent acquired prefix and the exact evidence cut appropriate to their decision. Performance and overload acceptance belong to the technical design and PP07; documentation provides no measured capacity claim.

## Staged capability and acceptance

The [PP tracker](../maintainers/perspective-perception.md) owns task bodies, dependencies and completion evidence. Design completion belongs to PP00. PP01–PP07 remain implementation and qualification work; a completed diagram or example cannot satisfy their runtime exits.

| Stage | Capability made reviewable                                | Required acceptance focus                                                                                                                                                              |
| ----- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PP00  | Complete selected design and owner reconciliation         | The feature, mechanisms, world policy, limits, tasks and affected canonical docs agree; shared amendment disposition is explicit.                                                      |
| PP01  | One native typed evidence boundary and exact cuts         | Private source truth is distinct from acquired evidence; supported records retain original provenance; late evidence cannot enter an earlier cut.                                      |
| PP02  | Detection, accumulation and exposure continuity           | Strong cues resolve promptly; genuine weak exposure accumulates once; missed transients stay missed; loss ends current disclosure despite episode continuity.                          |
| PP03  | Familiarity, local individuals, recognition and names     | Unnamed learned subjects work without fake entities; familiar/ambiguous voices, cross-context faces, false labels and later supported association preserve uncertainty.                |
| PP04  | Retention, correction, cold retrieval and consolidation   | The Ada facts retain independent times through hot/cold memory; testimony stays attributed; correction and forgetting invalidate dependent outputs without rewriting physical history. |
| PP05  | Shared evidence for native animals, cognition and players | The same permission boundary serves all applicable consumers; no hidden-source path or mandatory AI-per-cue dependency appears.                                                        |
| PP06  | Body life, restoration and current-format validation      | Death/replacement, control changes, save/reopen and stale in-flight work preserve correct scope and once-only acquisition.                                                             |
| PP07  | Whole-path qualification and documentation completion     | End-to-end journeys, privacy surfaces, required bounds and overload behavior have evidence; ordinary use is practically worthwhile and remaining failures are honestly recorded.       |

The complete technical acceptance matrix covers combinations rather than only a happy path: good/poor signal, familiar/unfamiliar/ambiguous identity, known/unknown names, current/historical facts, direct/report/inferred support, memoryful/memoryless consumers, interrupted exposure, correction, replacement and restoration. Implementation should reuse those scenario IDs as evidence, not create competing acceptance definitions.

Later gameplay qualification must include uncoached ordinary choices: recognize a returning helper, decide what to do with a rough sound, use a warning without a culprit, compare a recent voice with an older sighting, and correct a mistaken association. Measure whether players can explain what they know and choose a useful next action; also check excess prompting, mystery chores, confusing historical markers and punitive opaque misidentification. Scripted correctness alone does not establish enjoyment.

## Repertoire scope

The first playable target is ordinary personal continuity and usable clues. The [relationships catalogue](../repertoires/relationships.md) supplies returning acquaintances and practical social repair; [languages and knowledge](../repertoires/languages-knowledge.md) supplies clarification and partial witnesses; [adventure and discovery](../repertoires/adventure-discovery.md) supplies useful searches and rescues. Recognition also supports work, comfort, hospitality, performance and comedy. These catalogues own their situations; the evidence contract lets them share mechanics without making every interaction an investigation.

Other senses, recording media, illusions and shared memories remain separately selected world capabilities. Their producers must preserve the original experiencer, source, time and permitted association when using this contract. Comprehensive detective interfaces, full disguise systems, supernatural memory transfer and city institutions are extension cases, not prerequisites for ordinary perception.

The [shared repertoire review](stealth-awareness-repertoire-review.md) supplies cross-module integration context. Central navigation and priorities remain with the integrated shared owner. Catalogue proposals remain optional and keep their broader gameplay scope; this design does not promote them all into implementation requirements.

## Integrated contracts and implementation dependencies

There is no unresolved module A product choice. The technical design and [integrated source/producer contracts](../maintainers/perspective-perception.md#integrated-source-and-producer-contracts) adopt the family-specific SC02 revision map, including existing personal-source string digests and explicit native owner roles. PP01 implements these exact adapters; no revision-representation decision remains pending.

Vision must supply available feature detail and actual loss boundaries. Acoustics must supply received quality, source-region precision, usable features and physical correlation limits, including memoryless receiver eligibility. Attention must consume meaningful uncertainty and choose investigation or watch activity without requiring an AI call for ordinary classification. Surprise must capture already-acquired warning evidence at its exact decision boundary. Player experience must make current/historical status, uncertainty, sense and original time understandable across all authorized surfaces. Effects supply supported ability conditions while retaining fear/startle ownership. Speech supplies actual heard words, gaps, addressing and introductions through the same observation.

These are concrete implementation dependencies, not invitations to reopen settled evidence meanings. Detailed handoffs and remaining acceptance live in the PP tracker and technical design. The shared controlled-player psychological-fear decision, [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters), remains outside A and does not block its evidence design.

## Maintained records

- Implementation, dependencies and unsatisfied acceptance: [Perspective perception tasks, PP00–PP07](../maintainers/perspective-perception.md).
- Limits, behavioral bounds and current delivery evidence: [Perspective perception inventory](../limits/perspective-perception.md), reusing the existing memory, cognition and native-work owners it links.
- Mechanisms, data shapes, algorithms and acceptance matrices: [Technical design](perspective-perception-tech-design.md).
- Shared authority: [Stealth and awareness contracts](stealth-awareness-tech-design.md#shared-contracts) and [shared feature specification](stealth-awareness-feature-spec.md).
- Persistent semantics: [Memory architecture](../memory-architecture.md), [events and reactions](../events-perception-and-reactions.md), [perceived events](../perceived-world-events.md), [identity and references](../identity-and-references.md), [hearing and speech](../hearing-and-speech.md), and [base-world knowledge](../worlds/base/knowledge.md).
- Related social behavior: [Speech and social perception](speech-and-social-perception-feature-spec.md) and its [technical design](speech-and-social-perception-tech-design.md).

# Speech and social perception: technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Detailed design is complete; implementation has not started. | 2026-10-16 |

This is the implementation design for the [feature specification](speech-and-social-perception-feature-spec.md). The accepted target changes ordinary speech, recognition, experience preparation and conversation coordination together. It does not describe delivered runtime behavior. Implementation, dependencies and unsatisfied acceptance belong to [SPK00–SPK11](../maintainers/speech-and-social-perception.md), not this document.

Source inspection used Macrofold/OpenLegend main at commit **465ace1e8d7ee94a267e762d2d93970de17b2ed0**. No runtime, browser, live-model or performance result is claimed by this design. Existing evidence linked by persistent specifications qualifies its recorded implementation and workload only.

## 1. Design conclusion and source findings

Speech is one committed occurrence with a speaker, actual words and delivery, and at most one optional intended addressee. Each detector obtains its own permitted structured experience. A shared presentation layer expresses that experience for its owner, another permitted reader, an AI decision or an unobtrusive caption. A character decides whether to respond from that experience and their own circumstances.

The current implementation already has useful parts of this flow. [Native speech](../../packages/domain/src/kernel.ts) emits an event; [speech perception](../../packages/domain/src/speech.ts) records listener-specific words; [response preparation](../../apps/server/src/response-context.ts) identifies addressed and overheard speech; [recall](../../apps/server/src/recall.ts) and [conversation compaction](../../apps/server/src/conversation-context.ts) can preserve speaker and recipient roles. These owners are extended or simplified, not bypassed with another event bus, chat memory store or generic agent framework.

The concrete gaps requiring coordinated work are:

- Native speech currently distinguishes an engagement-oriented command/event target from a separately recorded intended recipient. Listener address attribution also depends on sight and some intelligible words. The accepted target removes those dependencies and gives one field one meaning.
- NPC-generated speech requires an addressee, although player ambient speech can omit one. Both producers need the same optional-address semantics.
- Ordinary memory consolidation receives generic memory text after the full speech-awareness record has been discarded from its input. The saved text does not include the addressee. It therefore cannot reliably preserve a relationship that its input omitted.
- Current recognition accepts authored acquaintances and continuous encounters, while later ordinary encounters lose the association. Optional recall also uses possession of a learned name to decide whether some episodes remain individually distinct. The accepted reliable recognition rule separates both concerns from naming.
- Ordinary speech automatically starts, joins and merges conversation membership, and several context, history and early-reply checks use that membership as a dependency. Those dependencies must be replaced before removing the membership owner.
- Ordinary animal hearing is gated by human-style memory eligibility, while autonomous scheduling and contexts assume NPC minds. Detecting a sound, retaining a short sensory experience and choosing an animal action need separate capability checks through the same owners.
- The player ambient-speech route can presently bypass the AI-availability restriction used by other freeform interaction. Availability must agree across the menu, composer and server admission.

### The consolidation defect being repaired

The inspected path is: speechDescription writes a personal sentence without the recipient; awarenessMemory and SQL hydration put that sentence in MemoryRecord.summary; maintenanceBatch selects only the generic memory; consolidationRequests sends its text and limited metadata. ExperienceSummary then retains prose and source/entity IDs. Later generic summary recall does not traverse those IDs to restore speaker/addressee roles.

The stronger current-conversation path does not close that gap. A newest-speech retention pool, a source that has not yet consolidated, or wording that happens to name the recipient can mask it. The repair is to carry the complete selected perceived experience through every transformation, not to add another prompt reminder to a text-only input.

Sources: [speech recording](../../packages/domain/src/speech.ts), [native experience conversion and consolidation](../../packages/domain/src/experience.ts), [SQL hydration and maintenance selection](../../apps/server/src/memory-repository.ts), [consolidation request preparation](../../apps/server/src/memory-consolidation.ts), [maintenance publication](../../apps/server/src/cognition-maintenance.ts).

## 2. Owners and boundary decisions

The engine owns valid IDs, optional communicative direction, committed occurrences, observer-scoped evidence, ordered retention, shared reference/grammar operations, request ownership and publication authority. The installed world owns which bodies produce or detect speech, acoustics, language comprehension, recognition, personal significance, animal dispositions and available action meanings.

For the bundled world, a detector capable of linguistic social perception reliably knows whether audible speech was directed at them. Reliable recognition associates supported later face/voice encounters with the same stored individual. These are deliberately simple world policies. They do not make hearing, human languages, face recognition or animal skittishness universal engine laws.

| Responsibility | Existing semantic owner and principal callers | Required change |
| --- | --- | --- |
| Player freeform admission | HTTP, WorldService, AiDirector; command and expression endpoints | One server-owned availability decision and exact request/actor binding for ambient speech, directed speech and freeform Act. |
| Native utterance | Domain kernel, events and response admission | One optional intended target, no engagement prerequisite or implicit membership mutation. |
| Acoustic contact | Domain acoustics, perception, receiver candidate selection; installed acoustic/sense definitions | Calculate contact independently of memory and language; reuse it for listener evidence and animal sound intake. |
| Observer experience | Domain speech, experience and event publication | Commit one complete permitted structured record per actual detector, with memory or sensory retention as appropriate. |
| Recognition and labels | Base knowledge policy, perception associations; server entity references | Reliable persistent individual association independent of a learned name, with no hidden location disclosure. |
| Wording and participant grammar | Language package and domain narration; server/client projections | One pure rendering path with explicit roles, observer labels and literal quotation spans. |
| Source persistence | Existing records/history/memory repositories | Preserve whole source bodies and complete source keys; derived text and indexes never replace evidence. |
| Decision preparation | Decision context, response context, recall and knowledge context | Use full selected permitted experiences; derive self/addressed/overheard meaning before models receive them. |
| Speech context and compaction | Conversation-context module and memory repository | Retain one actor-scoped heard-speech stream without authoritative group membership. |
| Long-term consolidation | Memory-consolidation, cognition-maintenance, domain experience | Supply complete selected sources and retain revisioned provenance and attributed meaning. |
| Autonomous decisions | Actor work, AiDirector, cognition policy, native command admission | Preserve natural silence and support capability-based animal decisions without mandatory speech or prose. |
| Presentation | Protocol, view/perceived-event/history projections; existing composers, captions and transcript | Show the same permitted direction and attribution; source-order reconciliation replaces membership assumptions. |
| Recovery | WorldService, command/response receipts, save/load and current-format validators | Preserve exact occurrence/job identity, private evidence, external accounting and generation fences. |

Apply the [boundary procedure](../engine-and-world-boundaries.md#5-a-repeatable-boundary-decision), [identity contract](../identity-and-references.md#contract), [memory contract](../memory-architecture.md#personal-perspective-and-acquisition), and [source-history principle](../engine-and-world-boundaries.md#preserve-precise-history-and-solve-the-general-cause). A selected rule reaches producers, menus, schemas, model instructions, rendering and restoration through its owning definition. No layer copies base-world policy prose or tests species/name strings to choose behavior.

A materially different supported fixture must demonstrate the seam: a body that detects an acoustic event but cannot understand linguistic content, alongside a linguistic listener that hears a familiar unseen speaker. The fixture changes real disclosure/capability behavior rather than merely renaming a human.

## 3. Authoritative speech contract

### One event, one intended addressee

Keep the existing WorldEvent identity, occurrence order, simulation time, origin and source-policy pin. For a speech event:

| Field | Selected meaning |
| --- | --- |
| actorId | Required canonical identity of the speaker. A producer cannot omit it or substitute a display name. |
| targetId | Optional canonical identity of the single intended addressee. Absence means ambient speech. It does not mean failed delivery, a group member, a responding actor, or the person mentioned in the words. |
| data.text | Exact accepted spoken wording. Delivery and presentation do not rewrite it. |
| data.volume and acoustic provenance | Accepted delivery and the installed acoustic meaning used at occurrence. |
| data.utteranceId / existing request identity | Link to the already admitted native request for duplicate suppression and receipt recovery. It is not a semantic reply relationship. |
| data.selfIntroduction | Existing optional communicated self-name claim, admitted only under the selected naming policy. |
| audience | Actual observer IDs for which this occurrence produced permitted evidence; not an address list, membership list or guarantee of intelligible words. |
| origin, at, order and sequence | Occurrence-time facts used for physical contact, chronology and source identity. They are never recomputed from a later speaker position. |

The command's optional targetId and the event's optional targetId have the same intended-address meaning. Remove the speech-only command intendedRecipientId and data.intendedRecipientId, rather than keeping aliases or fallbacks. Update command construction, native validation, response binding and every reader together. Neither successful hearing nor the addressee's ability to reply decides whether the event retains its intended target.

A selected addressee must resolve through the requesting actor's permitted address reference and native target-kind validation. A target that has disappeared or become an invalid identity produces an explicit refusal; it never silently becomes ambient speech or another nearby person. A valid extant addressee who is too far away, asleep, unable to hear or unable to speak does not retroactively change the speaker's intention. Receipt and response eligibility are evaluated independently.

Self-addressed speech is supported by selecting the speaker's own ID. It remains audible under the selected delivery and has no implied privacy. Ambient speech does not mean private thought.

### Producer and schema changes are inseparable

The field replacement includes:

- Domain Command and ResponseOperation definitions, both native say validation paths, event emission, native availability and any action-intent slot mapping.
- ResponseOperation.talk.addresseeEntityId becomes nullable in the provider-facing schema. Null maps to omission of native targetId; a non-null value must be one of that decision's permitted address references.
- Both local runtime decoders and provider JSON schemas admit the same null/non-null possibilities. Provider partial parsing, final parsing and native admission remain distinct checks.
- entity-references resolves non-null speech targets only; it must not attempt a lookup for ambient speech.
- Player ambient and directed speech both submit the selected optional target, volume and exact text through the same server/native occurrence owner.
- Response receipts and component outcomes continue admitting independently valid speech, thought, note and action components under the existing response contract. An invalid name edit does not discard valid speech.
- Event/history/protocol writers, command fingerprints, source identity extraction, previews, diagnostics and current-format validation use the new meaning.
- Tests and authored examples are updated with the current model. Old-field readers, dual schemas, compatibility adapters and version-suffixed replacement types are excluded by the [development policy](../../AGENTS.md#development-save-policy).

The application may retain a provider conversation identifier for World Agent authoring or a provider transport session. It must not reuse that identifier as an ordinary in-world speech audience, permission or addressee.

### No authoritative semantic reply relationship

Do not add replyTo to an utterance to decide what its words mean. The system records that Mike said “yes” to Ada at a particular time. Recent permitted speech helps Ada infer which question was answered; ambiguity can lead to a clarification. A question-answer guess remains interpretation, not an event fact, commitment, consent or shared decision.

Request IDs, operation-local IDs and triggering source IDs remain necessary technical relationships. They establish which work produced or considered an occurrence, never the authoritative interpretation of “yes,” “I agree,” a promise, or silence.

## 4. Listener evidence and sound detection

### Calculate contact before deciding what an observer can retain

Reuse one source-relative acoustic candidate pass. For each conservative eligible detector, calculate exact contact against the installed sense/acoustic policy. Seeing speech, hearing a sound, understanding words, recognizing its source and storing a long-term memory are different outcomes.

The event owner supplies the complete occurrence before any observer record is copied. It commits the actual audience and all required detector records in the same transition. A selected target is not inserted into audience merely because it was addressed. A memoryless detector is not removed merely because it lacks the human memory system.

The self record uses the speaker's own accepted words and intended address. It is explicitly self-authored experience, not proof that anyone else heard it.

### One permitted source record

Keep the existing Awareness/ExperienceEntry owner rather than adding another personal history collection. The speech record is the authority for what that observer experienced. Non-speech native observations continue through their existing payload owner.

For linguistic speech, the selected shape is:

| Location | Selected meaning and change |
| --- | --- |
| Awareness.actorId | Memory/sensory owner. This identifies the perspective, not the utterance speaker. |
| Awareness.sourceId | Sole stored permitted speaker identity. Ordinary base-world face/voice exposure establishes or reuses this canonical person association immediately, including first contact with an unseen audible speaker. Absence is reserved for a genuinely unsupported or indistinguishable source under a different applicable sensory policy. |
| Awareness.targetId | Sole stored permitted intended-addressee identity when known. For speech addressed to the observer, this is the observer's own ID. An unknown third-party addressee stays unbound. |
| PerceivedSpeech.addressing | For self or heard linguistic experience, required ambient or directed distinction. Directed speech with no known targetId remains “directed to someone else,” not ambient. Seen-only experience stores null because it acquired no addressing fact. |
| PerceivedSpeech.speaker | Saved permitted speaker label/grammar at occurrence, without another independently writable entity ID. Null means attribution was not available. |
| PerceivedSpeech.addressee | Saved permitted recipient label/grammar at occurrence when available. Null does not erase the directed distinction. |
| PerceivedSpeech.perception | Existing self, heard or seen acquisition. A seen-only cue carries no heard words. |
| PerceivedSpeech.intelligibility and segments | None, partial or clear and the exact admitted heard spans/unintelligible gaps. Unknown words never enter the record. |
| Delivery, acoustic direction and listener position | Only the facts the observer is entitled to acquire. An acoustic bearing is not the speaker's exact current position. |
| Source time/order, importance, urgency and retention metadata | Common source facts used by ordering, scheduling and retention. They do not dictate a response. |

Remove Awareness.intendedRecipientId for speech. Existing top-level text/content/intelligible/triggerKind/entityIds fields used as denormalized speech projections must be derived by one selector from the authoritative roles and payload, rather than independently authored by producers. A persisted text/search/index projection is allowed for existing storage access, with a dependency on the exact source revision; it is never the only recoverable representation or an alternative writable speech fact.

The same participant selector feeds event projection, response routing, recall and UI. It returns source, intended addressee, self/authored or other relationship, known/unknown direction and permitted labels. No consumer rebuilds the roles from text or falls back to the global event.

### Reliable direction does not fill unheard words

For a hearing detector using the selected linguistic policy, detected directed speech is identified as directed without requiring sight, face orientation, language comprehension of the quotation or a nonempty heard fragment. The event-time role is reliable in this version.

Detection still gates acquisition. If nothing was heard and only visible lip movement was observed, the viewer gets a speaking cue without the guaranteed heard-address relationship. A totally unheard addressed utterance creates no remote inbox entry or cognition opportunity for its intended target.

Represent that boundary as a discriminated PerceivedSpeech shape. A seen-only record has perception: seen, addressing: null, intelligibility: none, segments: [], addressee: null and no speech targetId. It may retain a legitimately visible speaker association. A self or heard linguistic record always has addressing: ambient or directed, even when intelligibility is none and every acoustic fragment is unintelligible. Ambient records have no addressee binding. Heard directed-to-self records bind the observer's own targetId; directed records with an unidentified third-party addressee retain directed with no target identity. Validate these combinations on construction and current-format import. Null denotes an unacquired visual-only fact, not uncertainty about an audibly detected directed utterance.

A bystander can know that audible speech was directed elsewhere while not knowing that addressee's identity. The projection withholds the hidden name, current position and physical action reference. The policy does not upgrade an animal's sound evidence into human language; [animal integration](#10-animal-sound-and-cognition-integration) owns that distinction.

## 5. Reliable individual identity and separate names

The accepted base-world rule binds an ordinary recognizable person's face or detected linguistic voice to that person's canonical identity immediately, including the first encounter. It reuses that identity on subsequent face/voice exposure. A first unseen direct call with no understood words still establishes the source association. No earlier conversation, introduction, learned name or visual match is required. Recognition is exact and persistent under that policy; it does not expire because an ordinary perception episode ended.

Reuse observer identity/knowledge ownership. An encountered individual can have a recognition association with an empty givenName. Naming, writing a subject note and completing a conversation are not prerequisites. Perception episodes remain useful for actual contact, movement and stale current-body bindings, but no longer decide whether a person has forgotten who a known individual is.

Changes through [base knowledge](../../packages/domain/src/worlds/base/knowledge.ts), [entity references](../../apps/server/src/entity-references.ts), [knowledge context](../../apps/server/src/knowledge-context.ts) and [recall](../../apps/server/src/recall.ts) must establish all of the following:

- A first permitted face/voice exposure creates the observer/subject association with an empty givenName when no name was learned. Later sightings or voices reuse that same association, including across the two sense modalities. Its identity can be known while its appearance, name and present location are not.
- A recognized unnamed person remains individually distinct in raw memory, summaries, optional retrieval and delayed context. Generic species grouping cannot combine two supported distinct individuals merely because neither has a name.
- Preferred names remain observer-owned labels. Duplicate names, aliases, later introductions and renaming do not change the canonical subject or existing relationships.
- A spoken self-introduction remains a communicated claim. The selected policy can learn it from actual eligible heard words and a supported source association; the old visibility-only acceptance must not block a recognized unseen voice.
- Raw player introductions remain ordinary speech available for the listener's existing optional name interpretation. No second paid classifier or fixed English name-pattern parser is introduced.
- A generated selfIntroduction annotation never exposes words outside the listener's heard spans, the speaker's private authoritative name, or another person's name through a quotation.
- A known identity does not make every current property knowable. Reference projection still omits hidden position, inventory, body values and private notes.
- A speech-addressable known voice can be referenced for communication without becoming a currently sighted physical action target. Native action prerequisites still require the relevant permitted contact and geometry.
- Historical targets may outlive a current entity. Their saved labels and source identity remain history; new physical commands require a valid current target.
- Explicit forgetting/correction and current privacy overlays continue revoking the relevant recognition/knowledge associations through the existing owner. They are not undone by save/load or a stale source record.

Opaque model handles may remain observer-scoped, but their recognized-person association must no longer depend on the current encounter token. Use the existing complete identity key/encoding and collision handling. Do not build a second identity registry or expose database IDs as display names.

For the ordinary linguistic-person baseline, an unnamed or unseen voice is therefore not an unbound speaker. It has a distinct permitted sourceId and a usable observer-scoped person handle; generic wording such as “an unfamiliar voice” does not merge its identity with another voice. Missing source bindings remain representable for other installed sensory policies that genuinely do not distinguish a source, and for evidence that never acquired such an association. This extension point must not reintroduce uncertainty about who addressed an ordinary listener. Nonlinguistic animal sound uses its separately specified visible-source association rule and does not inherit ordinary people's face/voice recognition.

A future world may select uncertain recognition, disguise or different communication. That is an extension of the installed recognition/perception policy, not an unfinished prerequisite for this accepted reliable baseline.

## 6. Shared presentation and complete model evidence

### Reuse participant grammar instead of rewriting finished prose

Reuse the existing participant grammar in [the language package](../../packages/language/src/index.ts) and [domain narration](../../packages/domain/src/narration.ts), adding only the shared pure presentation operations described below. They receive already-permitted structured facts and an explicit perspective; they cannot query the world, infer access or mutate memory.

The shared renderer handles:

- Subject, object, possessive and reflexive person roles: I, me, my and myself for the owner; permitted third-person labels for other participants.
- Verb agreement and normal sentence casing.
- The difference between “I said to Ada,” “Ada said to me,” “Ada said to Ben; I overheard,” and “someone spoke nearby.”
- Literal quotation spans. First- and second-person words inside a quotation belong to its speaker and intended recipient. No substring replacement changes “I,” “you,” names or ID-looking text inside quoted content.
- Heard, partly heard, seen-only, self-authored, inferred and imagined acquisition. A spoken claim remains a spoken claim.
- Missing identity and partial words without fabricating an exact body, name, addressee or text.
- Compact caption/transcript attribution and full personal evidence wording from the same participant facts.

Natural first-person prose is the default for the memory owner's experience. Do not force awkward third-person “the memory owner” narration as the sole method of avoiding attribution bugs. Summarization instructions receive explicit roles and can use ordinary I/me consistently. A summary used for a different reader must retain its original owner label or be rendered through the appropriate perspective; never reinterpret its first-person prose as the new reader's experience.

No new middle-dot separator is used in captions, directed-speech labels, transcript attribution or related explanatory copy. Use ordinary words, spacing and layout. A compact “to Ada” or accessible equivalent is derived from the same data rather than inserted into the spoken quotation.

### Minimal shared exports and their contracts

These are proposed exports in the named existing owners, not delivered APIs. The read-only return types are disposable projections of one ExperienceEntry; none is an independently editable or persisted fact model.

| Owner | Export | Contract |
| --- | --- | --- |
| packages/domain/src/speech.ts | speechRoles | Select participant IDs, acquisition, ambient/directed/no-acquisition meaning and the owner's relationship from one Awareness. No world lookup, name lookup or word parsing. |
| packages/domain/src/narration.ts | renderNarrationParts | Render existing typed Narration parts using an already-permitted name map and explicit first-person identity. Literal strings are appended unchanged. |
| packages/domain/src/speech.ts | speechPresentation | Derive one presentation view with attribution, direction label, exact fragments, personal wording and accessible wording. Captions, transcript rows and memory reading choose fields/layout from that view. |
| apps/server/src/perceived-context.ts | experienceForModel | Project the complete selected ExperienceEntry with permitted entity/source handles and explicit perspective. It removes server authority metadata without reducing the semantic record to prose. |

The minimum signatures are:

```ts
// packages/domain/src/speech.ts
export function speechRoles(
  awareness: Readonly<Awareness>,
): Readonly<SpeechRoles> | undefined;

export function speechPresentation(
  awareness: Readonly<Awareness>,
  perspective: Readonly<NarrationPerspective>,
  purpose: 'personal' | 'caption' | 'neutral',
): Readonly<SpeechPresentation> | undefined;

// packages/domain/src/narration.ts
export function renderNarrationParts(
  narration: Readonly<Narration>,
  perspective: Readonly<NarrationPerspective>,
  grammaticalPerson: 'first' | 'second' | 'third',
): string;

// apps/server/src/perceived-context.ts
export function experienceForModel(
  entry: Readonly<ExperienceEntry>,
  bindings: Readonly<ExperienceModelBindings>,
): Readonly<ModelExperienceEvidence>;
```

SpeechRoles is derived from the existing source/target fields. It contains the permitted speaker/addressee IDs when bound, acquisition, addressing: ambient | directed | null, and relation: self | addressed | overheard | ambient | seen. A self-authored utterance selects self; heard directed speech selects addressed exactly when its target is the owner, otherwise overheard; heard ambient speech selects ambient; visual-only speech selects seen with null addressing. Sound-only and non-speech entries return undefined. The caller must never recover absent roles from the global event. This is one selector reused by response routing, trigger wording, recall, model projection and presentation.

NarrationPerspective contains an optional selfId and a read-only map from permitted participant ID to the existing Named grammar type. The presentation builder supplies saved event-time fallback labels for permitted references missing a current display label. An unbound source receives a generic literal label, not a fabricated entity ID. The renderer performs no WorldState read and has no global-name fallback. Its explicit grammaticalPerson argument controls grammar, not whose experience the record contains. Existing renderNarration(world, narration, viewerId) can prepare this context once and delegate to renderNarrationParts so non-speech callers share the same loop. Retain the existing language exports personPhrase, personalPronoun, namePhrase and presentTense; extend the shared personalPronoun role helper with an explicit first/second-person parameter for I/me/my/myself versus you/you/your/yourself where needed. Third person uses the permitted Named binding. Do not add another UI pronoun dictionary or string-replacement layer.

SpeechPresentation contains acquisition, speakerLabel, directionLabel or null, the read-only exact SpeechSegment sequence, personalText and accessibilityText. The segment sequence comes directly from the permitted payload; heard text stays literal and gaps stay gaps. A seen-only view has no quotation or direction label. A heard but unintelligible addressed view can still say that someone spoke to me without inventing words. The explicit purpose selects personal I/me wording, compact caption wording that can use you, or neutral permitted-name wording through the shared grammar. It never changes participant identity or quotation content. For personal memory, first person is the evidence owner; a different permitted reader receives that owner attribution rather than silently treating the reader as the experiencer. A caption can use compact attribution fields without changing the underlying roles. The protocol carries this view beside its existing permitted occurrence/reconciliation reference; it does not add hidden spatial anchoring.

ExperienceModelBindings contains a request-local source handle bound externally to the complete source key/revision, the evidence-owner perspective, and a read-only canonical-ID-to-permitted-model-reference map prepared by the existing entity-reference owner. A genuinely unbound participant under another supported sensory policy remains unbound. The selected ordinary person's detected voice already carries a source identity even when its name is unknown. A required acquired identity without a valid prepared binding is an explicit preparation inconsistency, not an invitation to query world truth or downgrade it to an anonymous species label.

ModelExperienceEvidence preserves the existing awareness | memory | summary discriminator and all task-permitted semantic fields of that selected source, including exact speech fragments, acquisition, participant/direction relationships, quantities and units, uncertainty, corrections and derived-summary coverage. Only explicitly typed reference positions are remapped. The projector must not search-and-replace ID-like text inside quotations, personal notes or other literal source strings. Technical generation/receipt/source authority remains in server bindings. The result may include the shared rendered prose for readability, but a consumer receives the structured value as well.

All these functions are deterministic and side-effect free given their inputs. They perform no fetching, embedding, paid inference or recording. The caller owns selection, permission preparation and current-source validation; the source mutation owner owns persistence and derived indexes. Provider JSON construction, attention, final decisions, memory consolidation and compaction use experienceForModel instead of inventing separate reduced evidence shapes. Each UI uses speechPresentation rather than a separate directed-speech phrase function.


### Structured evidence is primary; prose is a view

Replace the text-only boundary between selected experience and model preparation with a complete tagged ExperienceEntry plus its scoped source identity/revision. Reuse the existing awareness, personal-memory and summary variants. Do not introduce a second writable experience object whose contents can diverge.

A selected evidence item carries its entire actor-permitted source payload: owner/perspective, occurrence identity and time/order, acquisition, known participant roles, exact heard segments, uncertainty, relevant native structured facts, and correction/retention status. A derived summary carries its complete stored summary and source coverage. Private thoughts remain distinguishable from external events.

The server's internal binding retains canonical IDs, record kind, source revision, generation, permissions and execution metadata. The model-facing projection replaces entity IDs with permitted handles and useful role labels. It removes only server-only technical authority, not meaning. It does not remove units, outcomes, direction, partial-hearing gaps or participant relationships to save tokens.

Prose may accompany a structured source where it helps reading, but it is generated by the shared renderer and cannot become the sole evidence supplied to a consumer that needs the record. Do not serialize full unrelated WorldState or use a raw global WorldEvent as a substitute for a missing observer record.

Attention, immediate response generation, appraisal, optional knowledge editing, conversation compaction and long-term consolidation share these source and presentation primitives. Each task selects only needed sources through its existing bounded owner. Complete source content does not mean every character receives every past experience in every call.

### Roles in decision preparation

The thinking actor's self reference and a speech source's relationship to that actor are supplied directly. There is no need for a model to infer identity from a display name or compare ungranted database IDs.

An addressed trigger says that the speech was directed to this actor, even if the words were unintelligible. An overheard trigger preserves whether its target was another known person or an unknown third party. An ambient trigger permits response without implying invitation. The current body, concerns, personality, accepted self-understanding and relevant obligations remain separate context sources.

An addressed utterance creates a response opportunity, not a forced verbal reply. Empty operations, continuing work, a supported gesture, a private thought, a refusal or a relevant action remain legitimate. The selected world may favor prompt social attention without a deterministic “always answer” rule or a hidden helpful-assistant instruction.

## 7. Persistence, recall and long-term consolidation

### Full source bodies and exact keys

The existing memory/history repositories persist the entire selected observer record before trimming active residency. Every hot and cold read must return equivalent source meaning.

Change RetrievedMemory and maintenance preparation so the complete tagged ExperienceEntry remains available alongside any derived reading/embedding text. Remove the use of a generic MemoryRecord projection as the authoritative input to consolidation. Native no-database callers use the same structured preparation contract.

The coordinated stored/transport changes are:

| Current field or boundary | Replacement contract |
| --- | --- |
| RetrievedMemory.memory with optional awareness | A required entry containing the existing tagged ExperienceEntry and its exact revision. Ranking score remains optional. Any reading/embedding text is a derived projection, not a second authoritative MemoryRecord. |
| Maintenance sources obtained by selected.map(entry => entry.memory) | The complete selected entries with scoped references, source revisions and preparation coverage. Do not downcast at the maintenance handoff. |
| Consolidation request text plus small metadata | The complete task-permitted source projection and optional shared-renderer prose, with an opaque request-local source handle bound to its complete native key. |
| ExperienceSummary.sourceIds containing untyped IDs | A sources collection of typed source-kind, native ID and exact revision references. World and actor come from the owning summary partition; cross-scope transport includes that scope explicitly. |
| Summary coverage and invalidation indexes | Index those complete scoped references. Direct derivation may reference an earlier summary; leaf provenance is derived through retained permitted lineage, never a separately writable competing source list. |
| Protected-source preparation | Retain the complete original ExperienceEntry in the existing hot/cold source store and its required binding. A retained summary wrapper must resolve that source when full protected evidence is required; a shortened generic sentence is insufficient. |

The source-kind discriminator reuses awareness, memory and summary. The native ID is Awareness.eventId for awareness and the corresponding record's id for the other two kinds. Revision is the existing exact source-content revision used by preparation, not a new schema-version number. The actor/world storage partition is part of identity even when it need not be repeated inside every local reference. External or cross-owner keys include all parts. Update current source edits, corrections/forgetting, dependency indexes, appraisal/commitment required-source selection, editor entry keys, embedding adapters and restoration consumers together; no sourceIds compatibility alias remains on stored summaries.

Use a complete source key: world, actor, record kind and native source/record ID, with the exact source revision. A single occurrence may legitimately support both awareness and a commitment; joining by the event ID alone must not select or modify the wrong record. Preserve structured tuple boundaries with the existing identity encoder rather than concatenating arbitrary IDs with separators.

Source replacement, correction, forgetting, explicit owner edits and generation changes invalidate text projections, embeddings, summary coverage and cached preparation. Derive changed indexes from the existing mutation owner in its commit. No UI or model can update denormalized role/text columns separately.

### Consolidation input and output

For each selected batch:

1. Select eligible records and their sizes in the actor-scoped consistent SQL read.
2. Hydrate the complete original perceived experience for each raw source, or the complete existing derived summary for a summary source. Count full serialized payloads and escaping before dispatch.
3. Prepare permitted participant references and the shared rendering from that record. Pass the structured experience to the summarizer, not only its rendered sentence.
4. Require faithful chronology, who said/did what to whom, literal retained words, acquisition, uncertainty and consequential qualifications. The model may group compatible routine experiences but cannot reinterpret testimony as witnessing or speech as consent.
5. Accept only a covered, revision-current grouping under the existing native consolidation owner. Preserve every protected source separately and faithfully; copying a shortened projection is not preservation.
6. Persist summary text with exact scoped source references and coverage. There is no single speaker/target pair on a multi-utterance summary.
7. Retire active raw recall only through the existing retention operation, retaining the complete source/provenance needed by the applicable history contract and current privacy policy.

An existing summary is honestly identified as derived. Revising it does not authorize reconstructing missing exact words. If a required distinction needs an original source, resolve the permitted original observer record within the same bounded preparation or retain the prior result and report incomplete preparation. Never recover missing words or roles by loading the original global event as if the character perceived all of it.

The summarizer receives source-local handles generated from complete server bindings. It cannot manufacture entity identities, broaden its audience, invent a participant or change another actor's mind. Its refusal, invalid output, oversized output or incomplete coverage leaves prior records intact. No automatic paid repair call is added.

### Ordinary recall and embeddings

Generic recall receives the same full source object. It derives source/addressee wording from structured roles before attention or model inclusion. A current heard-speech source, cold speech source and source returned through a protected/required lookup must not have different semantics.

Summaries retain their source coverage and attributed meaning through later recall. A list of untyped referenced entities is not an adequate replacement for the claim that one person addressed another.

Index source-stable permitted content, not transient location, temporary reference tokens or somebody's private current global name. When semantic embeddings use a textual serialization, derive it from the complete source, including important speaker/addressee/acquisition relationships and exact relevant facts. Preserve existing separation between source persistence, embedding readiness and attention selection.

SQL eligibility, explicit required sources, commitments, corrections and exact actor/subject lookups remain independent of optional similarity ranking. A missing embedding means an unready index, not a missing experience. Optional ranking failure does not discard required speech or a recent physical action result. Revalidation after attention checks source revisions, generation, privacy and any current reference bindings required by the response.

## 8. Speech context without ordinary membership

### Actor-scoped chronological context

Remove authoritative ordinary conversation records, joining, leaving, merging, active-group occupancy and inactivity expiry. Speaking does not enroll the target or nearby listeners in an interaction state. Hiding a panel, changing selected addressee or walking away is not a conversation mutation.

Use the existing actor-scoped memory owner to select relevant speech through the prepared snapshot. Self-authored, addressed, ambient and overheard utterances are all eligible, with their respective relationships; eligibility does not make every retained utterance mandatory input. Full retained records remain accessible through scoped recall and history. A turn does not enumerate or hydrate the actor's lifetime transcript.

Separate required current causes from optional dialogue context. The singular trigger, independently required physical outcomes, commitments, corrections and any other source required by the actual proposed operation retain their existing mandatory path. Ordinary unrelated overheard speech remains optional. An unintelligible addressed trigger still carries its complete directed role through required evidence even though it does not qualify as a linguistic transcript turn.

For automatic dialogue context, select a valid derived actor summary when useful and an exact recent suffix of eligible speech within the remaining request allowance. Select source metadata and complete payload sizes before hydration, using the actor/order/key index and the existing row/byte admission. Stop selection at the request boundary; older sources remain available to bounded topic/subject recall or an explicit source request. The current newest-speech protection remains a storage-retention policy, distinct from these request bounds. A request boundary is not fictional forgetting, a conversation membership, or a claim that unselected evidence was considered.

Keep the exact recent suffix chronologically contiguous within its selected eligible range. Independently recalled older sources are labeled with their actual times and source roles; they do not pretend to be adjacent recent turns. Preserve selection coverage, its ordered boundaries and whether additional eligible history remains. A bounded extra metadata row can establish continuation; do not scan all retained history merely to report an exact omitted count.

The actor's own statements, later committed replies in the same snapshot and retained overheard turns remain distinguishable. A singular triggering event is retained separately from coalesced evidence. A response to that trigger can consider later facts already committed before its snapshot; the context must not end artificially at the triggering utterance.

Keep one existing conversation-context preparation owner, now defined by actor/source scope rather than membership. The display name “conversation” may describe an interface or compacted dialogue; it is not an authoritative group.

### Compaction remains a derived read

Reuse current context-byte, source-row, hydration-byte and paid-compaction admission, including a recent exact suffix and an older derived summary. The inspected ceilings are 24,000 bytes of automatic dialogue context, at most 6,000 summary bytes within that allowance, 24,000 input bytes per compaction call, at most eight compaction calls, and the shared preparation limits of 8,192 rows and 4 MiB. These are request/work bounds, not an entitlement to fill every allowance or a retention cap. The remaining full decision budget can make the available dialogue allowance smaller.

Source selection precedes hydration. Derive/index linguistic eligibility and payload-size metadata through the existing source mutation owner so the actor-scoped ordered query does not parse every historical payload to find its recent suffix. Replace the history conversation join with actor/source eligibility and exact keys. Qualify the actual query plan; a result LIMIT alone does not prove bounded visited work.

The existing compaction owner reuses a validated summary prefix and processes only admitted newly selected source chunks. It must not rebuild an entire actor history on each new turn, require all retained source bodies to hash a cache key, or pay to recompact unrelated old speech. A complete digest of the selected sources and covered prefix, ordered source boundaries, actor, generation, privacy revision, source revisions and relevant naming/reference revisions replace the former conversationId-based cache identity. Corrections and forgetting invalidate the affected coverage through the retained dependency index; they do not require a global payload scan on each turn.

The cache is replaceable and derived. Its identity does not enroll participants, grant earlier speech, or interpret semantic replies. Later speech invalidates or extends the prepared source window under its actual dependencies. Corrections, forgetting, changed names and restoration prevent stale compaction from reintroducing revoked facts.

Compaction receives complete permitted structured sources under section 6. The output preserves meaningful uncertainty, disagreements, questions, refusals and speaker/addressee roles. Ambiguous “yes” remains ambiguous where context cannot settle it. Source coverage is retained even when filler is condensed.

Do not replace the removed group with a hidden pair registry, fixed “currently talking” state, or authoritative time-gap episode. The request selector uses the existing byte/row/recall allowances; it adds no universal fictional memory duration or fixed social turn limit. Irrelevant unselected history remains stored and retrievable.

Compaction is optional preparation. If an optional prefix is stale, cannot fit, or cannot obtain its existing provider/spending admission, use the complete required sources and whichever valid summary/recent complete sources fit, with accurate coverage. Do not fail an otherwise valid reply merely because an optional history summary is unavailable or the actor once overheard a large amount of speech. Preserve the prior valid cached result unless a correction/privacy change invalidates it; never silently strip an admitted source to text or substitute global event truth.

An actual required-source set that cannot fit still produces the existing explicit context-budget failure before paid work. Likewise, unavailable required generation remains unavailable AI work. The caller must distinguish these cases from an optional-context omission. In particular, it cannot promote every speech source into requiredContext merely because the former conversation builder returned it, or treat optional compaction failure as refusal of the actor's entire decision. No missing context creates consent or permission for an action whose own source prerequisites are unmet. Broader capacity remains a measured limitation in the [memory](../limits/memory.md) and [narration](../limits/narration.md) inventories.

### History and selected-person reading

The existing personal speech/history stream remains ordered and pageable. A selected-person transcript is a read filter over the viewer's actual evidence, not a private channel. It includes correctly scoped utterances involving that individual according to the view's documented filter and never adds earlier unheard dialogue because the viewer later spoke to them.

Keep exact source/participant indexing and continuation cursors. Do not scan every person's history to build a people menu. Preserve bottom-following, explicit new-content notification, anchor-preserving older-page loads and current receipt reconciliation.

### Source-bound decision ownership and early text

Replace group/generation checks with the actual request dependencies:

- Exact requesting principal, controlled actor, world/timeline and control generation.
- Exact thinking actor and source event(s) admitted for that decision.
- Source evidence revisions, retained/forgotten status and permitted current actor identity.
- The current native body/capability, action/plan and response-publication conditions actually needed by the proposed output.
- Request identity, paid reservation/receipt and response-component ownership.
- Current listener-specific hearing and attribution for any early visible reply.

Cancellation stops the owned pending inference or withdraws provisional text; it does not delete already committed speech or end independent physical cooperation. A new unrelated nearby utterance does not automatically invalidate every in-flight job. Significant changes follow existing urgency/reconsideration rules and source dependency checks.

Preserve the existing conservative preview eligibility: a complete, independently valid first speech operation addressed to the requesting player, clear hearing and currently permitted source attribution, with exact request/timeline/control checks. Replace only membership dependence. Any broader early-display qualification for unseen voice-only attribution must pass the same actual hearing/recognition/disclosure flow before activation; final committed heard history remains available under the new ordinary recognition rule regardless.

Provisional text remains private to its authorized requesting viewer, non-authoritative and absent from world events, memories and other listeners' inputs. Final admission produces one real utterance. The UI reconciles by request/component/utterance identity, never text matching or membership. Failure or cancellation removes provisional words and leaves any actual earlier speech intact.

### Membership removal consumer checklist

| Consumer | Required replacement or preservation |
| --- | --- |
| Domain conversations, event emit and final reconciliation | Remove ordinary membership state, transitions, automatic engagement, merge notices and inactivity cleanup. Preserve speech and perception. |
| WorldState, current-format validation, starting state and record serialization | Remove ordinary conversation payloads and rebuildable indexes together; no legacy conversion/read path. |
| Response admission and native action/plan lifecycle | Remove membership pins only. Keep exact actor, source, response, work replacement, life and action prerequisites. |
| WorldService / HTTP chat submission | Admit intended speech and source-bound work; no active group creation, join/leave mutation or silent default-person substitution. |
| AiDirector / ActorWork / persisted job fields | Pin exact actor and source causes. Keep urgency, coalescing, cancellation, receipts and spending; separate World Agent transport/session IDs. |
| Decision-context / conversation-context | Bounded actor-scoped selection, complete structured evidence, distinct required/optional paths, selected-source validation and incremental compaction. |
| Memory repository preparation/validation | Replace SQL conversation membership joins and validation with exact actor/source eligibility and ordered snapshot coverage. |
| History / narration preparation | Remove merge notices and active-group grouping. Preserve observer-only history, source-linked story work and independently owned narration sessions. |
| View / protocol / client | Remove join/leave controls, active-member lists and group gates. Preserve selected-person filtering, local drafts, source labels and pending/confirmed states. |
| NpcReplyPreviews | Replace membership gate with exact source/job validity; retain all actual scope, hearing, attribution and final-publication checks. |
| Commitments and physical cooperation | Keep their independently owned source evidence, people, consent and active-work meaning. Speech or panel closure cannot create, fulfill or revoke them. |
| Saves, imports, recovery and source editors | Validate the current replacement shape across hot/cold records; preserve identity, privacy and source ordering after restoration. |

Implementation must search actual current references before removal and include secondary debug/history/cursor consumers, not merely the modules listed here. Removal is complete only when no ordinary rule still treats group membership as evidence of hearing, reply ownership or physical consent.

## 9. Player availability and presentation integration

### One freeform interaction availability decision

A server-owned query reports whether the authenticated controlled character can currently submit player ambient speech, directed speech or freeform Act. It composes current authority/participation, pause/operational holds, relevant native actor capability and configured AI/spending availability through existing owners.

All three user entry points use the same AI-availability condition. This includes contextual menu actions, the bottom text bar, selected-person Talk, keyboard submission, direct HTTP/native-command wrappers and any convenience shortcut. Disabling a React button alone is insufficient.

The gate is application admission, not a claim that vocal cords physically require an LLM. Trusted native speech already admitted as part of an existing valid operation still follows its own completion rules. Existing deterministic movement, inventory and physical actions are not newly disabled merely because they use another menu.

Known configuration/allowance failure produces a clear unavailable state and retains drafts. Do not purchase health checks or a generated explanation simply to decide whether the button is enabled. The existing route/admission owner remains authoritative after waits. If a provider later fails after player speech was committed, preserve the actual utterance and report unavailable AI work without manufacturing a character reply or replaying the player's words.

A recovered identical request checks its receipt before new-operation availability. A reply to an old request can report its already committed speech under current disclosure authority even when new speech is now disabled. An uncertain send retains its exact identity until reconciled; it is not automatically resubmitted.

### UI data and interaction contract

Protocol speech DTOs expose the viewer-permitted speaker, optional known addressee, explicit ambient/directed meaning, exact heard fragments and source occurrence identity. They do not expose the raw audience, unknown target name, hidden position or another character's private evidence.

The shared source presentation feeds overhead captions and permitted speech history. Directed speech remains visually located at the speaker where the speaker is visible, with a quiet “to [permitted label]” treatment outside the spoken text. Unknown identities use useful generic wording. For unseen sources, preserve the existing non-spatial heard-caption/history route rather than anchoring a bubble to hidden coordinates.

Changing destination does not rewrite or move an already sent utterance. Draft keys include owner, world/timeline, mode and selected target; ambient speech has its own key. Keep the existing exact-draft-revision clearing, same-send recovery, IME behavior, accessible labels, focus isolation and reading position.

NPCs and players use the same optional addressee concept. Ambient NPC speech must remain available in schemas and final native admission, even if a particular response is likely to address the person who spoke.

## 10. Animal sound and cognition integration

### Existing owners and selected world profile

At the inspected baseline, ordinary base animals have cognition, memory, innerWorld and speech disabled. Acoustic receiver selection and speech perception require memory; ActorWork defaults to minds and checks memory; the autonomous director also checks NPC control. Changing a body flag alone cannot deliver this feature.

Extend the existing owners together:

| Owner | Required change |
| --- | --- |
| Domain acoustics/perception, speech/events/experience | Detect physical sound independently of memory, produce one permitted actor/event record and retain it under the same evidence authority. |
| Domain types/world modules and base body/spawn/starting-world creation | Bind a supported installed animal-response profile consistently; validate its current saved form. |
| ActorWork, AiDirector and shared thought input | Admit configured cognitive native actors through the existing roster and one coalesced ticket; preserve player-control exclusion. |
| Decision-context, context and response-context | Add the shared memory-optional preparation path; offer only outputs the actual actor can execute. |
| Existing decision selection, generation and response admission | Reuse uncertainty, provider selection, metering, cancellation and native binding. No animal-specific provider, queue or retry policy. |
| Installed embodied-response adapter and base animal-behavior | Admit a chosen stationary hold or the existing escape steering through the actor's one active action; ordinary move handles approach and retreat. |
| Existing records/history/save owners | Persist sensory expiry, scene bookkeeping and accepted native behavior; exclude sensory-only evidence from human autobiography. |

The specific current owners are [base bodies](../../packages/domain/src/worlds/base/bodies.ts), [receiver selection](../../packages/domain/src/perception.ts), [speech](../../packages/domain/src/speech.ts), [ActorWork](../../apps/server/src/actor-work.ts), [AiDirector](../../apps/server/src/ai-director.ts) and [native animal behavior](../../packages/domain/src/worlds/base/animal-behavior.ts). Native wandering, injury-triggered threat evidence, clearance probes, escape and decay remain in that last owner.

Add a narrow installed response-profile contract pinned through the existing trusted definition/manifest mechanism. It declares the supported response family/kinds, hearing-sense binding, spoken-language capability, sensory lifetime, hold bounds, acoustic change band and native escape tuning. One actor profile pin is authoritative; installed definition projection, starting-world animals, creator-spawned animals, body construction, schema admission and action offerings consume it. Species-name switches and separately editable copies are excluded.

The bundled ordinary profile enables cognition while leaving autobiographical memory, innerWorld and speech disabled. Its actor-authored disposition describes tendencies such as wariness or curiosity, not a sound-to-action threshold. The same profile can support different dispositions. Keep a supported native-only profile with cognition disabled as the contrast fixture; it still senses and continues its native routine.

Initially preserve the current base hearing floor of 0 dB SPL and existing 28 m sight baseline where applicable, with explicit replaceable profile bindings. A fixture with a different installed hearing floor must reach receiver selection and model preparation. These equal starting values are provisional gameplay tuning, not biological calibration. Native territorial/combat behavior remains its own authority and can constrain which optional responses may interrupt it.

### Sound-only evidence and retention

Derive the generic acoustic emission from the committed utterance's resolved volume/source definition and event-time origin. Speech is the first production emitter. A native non-speech fixture proves that the same typed emission path accepts sound without words; the design does not silently enable footsteps, every impact or ambient scenery.

Do not emit a duplicate authoritative sound occurrence merely to wake animals. Use one Awareness result per actor/event. Add the shared retentionClass of memory or sensory; sensory requires an absolute simulation-time expiresAt. Add a typed sound projection carrying these native facts:

| Field meaning | Permitted source |
| --- | --- |
| Detection and acquisition time/pose | This receiver's actual acoustic contact. |
| Received level and detection/clarity margin | Finite listener-local physical values from the installed acoustic calculation. |
| Coarse bearing/elevation | The hearing sense's supported directional result, without exact hidden source coordinates. |
| Associated source/observation episode | Only a genuinely associated visible source under the animal's installed recognition policy. |
| Intensity/direction display | Derived qualitative wording of those facts for the shared context/presentation owner. |

The ordinary non-language animal receives no quoted words, language fragments, intended-addressee relationship, proper human name, hidden source ID or implied remote location. Received intensity does not reveal emitted loudness or exact distance. A speech event type does not authorize its transcript to be fetched. A linguistic detector may have sound and speech in the same row; sound-only consumers have no speech payload.

Thus “nice deer” and a verbally expressed threat with otherwise identical supported acoustic/visible facts supply the same animal evidence. Familiar-voice recognition for ordinary animals, tone interpretation, training, species calls, scent and language understanding are separate extensions. They are not smuggled into disposition prose.

Select a provisional base sensory lifetime of **900 simulation seconds** after acquisition. Distinct detected utterances remain distinct records during that interval. Save absolute expiry; expiry removes optional sensory availability without creating a thought. Memory-only recall, embeddings, consolidation, inner-world maintenance and autobiographical editor APIs exclude sensory entries. The common current-cognition reader explicitly admits eligible unexpired sensory records for its actor.

There is no new cap on acquired utterances or actually audible listeners. Required recording participates in the same native operation admission/commit as section 11. If the operation cannot retain all required evidence, it refuses before partially presenting a complete utterance. Cost scales with utterance rate, eligible audience and lifetime; prompt bounds do not solve retention cost.

An accepted action copies its minimal permitted cause and stopping conditions into the native binding. Expiring optional sensory records therefore does not erase an action's ability to finish or create permanent animal recollection.

### Attention without one paid thought per sentence

Reuse one ActorWork ticket for each configured cognitive actor. The cognitive subset of the current participant/component index supplies the roster, including supported native-controlled animals. Do not discover actors by scanning all historical minds on each sound. Human/player-controlled bodies are not granted autonomous takeover.

Compare a normalized perceived acoustic scene, not event text or hidden emitter identity. The selected change inputs are an associated source's current observation episode or an anonymous bearing sector, a **6 dB received-margin band**, and the current response's relevant stimulus. A first scene, new perceived source/sector, or changed direction/intensity band creates an opportunity. Equivalent repeated utterances update deterministic repetition count and latest time without buying a new decision for each sentence. Anonymous sounds sharing a sector remain unresolved identities.

Save the scene baseline, opportunity revision/considered identity and expiry as actor-local bookkeeping linked to retained sensory evidence. This is attention coalescing, not a parallel transcript or learned habituation. Only the normalized opportunity revision enters the sound-related ActorWork wake input. Raw sensory insertion, latest-time/repetition changes and the generic human new-memory/new-speech path must not independently wake the animal again.

Baseline expiry permits a later newly acquired scene to count as new; expiry itself schedules no thought. Restoration or capacity loss cannot silently forget a considered opportunity and buy duplicate work. Existing bodily changes, current goal/state changes and actual action-result triggers retain their own pathways. No new universal actor cooldown is introduced.

Prepare the common bounded recent trigger set, currently eight recent triggering sources, and an honest deterministic coverage summary of remaining retained scene evidence. Count/time/intensity/direction coverage says what was grouped; it is not a fabricated complete individual source list. Preserve required injury and current response causes. Capture the acquired-evidence watermark before awaits and acknowledge only that snapshot. Required sources that do not fit cause explicit deferral rather than an unsupported claim that everything was considered.

### Shared memory-optional decision context

Branch at the shared context owner before mindFor, human inner-world construction or long-term recall. A memoryless animal receives its own body condition, authored disposition, current activity/response, actually visible surroundings, recent permitted sound evidence and available physical choices. No fake human biography, obligations, recipe knowledge, inner-world file or permanent person relationship is required.

Use the existing immediate decision route and finite supported action selection. Higher reasoning, where admitted by the shared policy, uses the same permitted situation and physical action set. Absence of speech or innerWorld removes those output components instead of disabling cognition. The result can be a deliberate continuation, chosen action, uncertainty, invalid proposal or unavailable work; those outcomes stay distinct.

The profile and shared instructions describe executable choices without prescribing “voice means fear.” Sound cannot mark a source as an attacker, set fear or start escape by itself. An animal's private reasoning is not public narration or a speech caption.

### Executable choices and one native continuation owner

Add the narrow installed embodied-response command that exposes chosen hold/escape through the existing animal behavior owner. This bridge is new implementation scope. Its native binding contains the selected supported operation, complete permitted evidence key/revision, actor physical-life binding, current profile pin, expected active-action/response generation, and the admitted hold deadline or escape stimulus. It accepts neither arbitrary listener sets nor provider-authored hidden positions or paths.

Represent a chosen hold/escape in the actor's ordinary active action with a typed response payload. Existing plan/cancel/result ownership controls replacement and completion. Refactor advanceAnimal's active-action exclusion only to advance that exact owned response; unrelated actions still exclude ordinary animal locomotion. Do not leave two movement writers.

| Choice | Admitted effect and stopping rule |
| --- | --- |
| Continue | Make no new physical intervention; acknowledge the captured opportunity while existing routine or valid native protection continues. |
| Pause to attend | Stop interruptible locomotion at a legal boundary, hold stationary and suppress routine wander. Base default is 120 simulation seconds, valid selected duration 1–300 seconds. Expiry releases hold and resumes routine without requiring a paid call. The pause supplies no sight/hearing or stealth bonus. |
| Approach | Use ordinary move toward a currently permitted last observed position, or a short body-local step along the heard bearing. Normal route/clearance admission applies. It cannot follow an unseen live source automatically. |
| Retreat | Use ordinary move to a supported local point away from an observed source or opposite the heard bearing, with existing four-metre local probe extent and normal movement speed. Completion stops the finite move; repeating it needs a new valid choice. |
| Flee | Start the supported local escape continuation using existing clearance-aware steering. Reuse the current 16 direction probes, four-metre lookahead/four clearance samples, nine-metre safety-distance tuning where relevant, and the owning calm-time rule. Hearing alone never starts this state. |

Only offer operations the actual body, profile and current action can execute. An unlocalized sound does not manufacture a movement destination; continuation and a hold may remain possible. A blocked route can yield a truthful refusal or stationary outcome. No animation or narration may claim flight that did not occur.

Extend the escape stimulus to distinguish last observed position from heard bearing at an acquisition pose/time. Observed-source updates require actual permitted subsequent perception. A heard-bearing escape scores clearance and progress opposite that direction; it never reads the hidden source's coordinates or distance. Its urgency decays with the existing calm-time constant from the accepted choice. Only a new accepted choice renews sound-linked flight; another equivalent utterance does not reset its timer. Even a trapped animal can settle without the nonexistent hidden-distance safety condition keeping it in permanent flight.

Existing attack-triggered escape retains its native priority, evidence and safety/decay policy. A cognitive hold/approach cannot erase noninterruptible bodily protection. Any permitted replacement uses the same cancel/replace owner and preserves its actual terminal cause. When a move, hold or escape finishes, ordinary native behavior resumes without a required paid decision.

### Outage, source loss and restoration

Evidence acquisition is synchronous native work independent of provider availability. Dispatch waits for the normal durable evidence cut and spending admission. A provider refusal/outage is deferred or unavailable work, never proof that the animal decided to ignore the sound. Do not immediately retry the same considered opportunity when availability returns. A new cue or explicitly supported reconsideration is separately admitted.

Dead, sleeping, incapacitated or otherwise perception-blocked animals acquire no new conscious sound. Sound alone does not wake them in this scope. Existing bodily injury effects, native protection, already-admitted movement and ordinary wandering continue when cognition is unavailable. The player Speak/Speak-to/Act admission rule remains the shared rule in section 9.

Recheck life, control, physical-body and current capability at capture, dispatch and native result admission. Provider latency cannot upgrade evidence merely because the source later becomes visible. Source disappearance leaves historical bearing and safely admitted movement valid, while forbidding hidden tracking.

Save sensory entries and absolute expiries, scene baseline/watermark/opportunity identity, exact profile pins and accepted native hold/escape direction/deadlines in the coherent snapshot. Restore rebuilds acoustic indexes and changes external generation. It neither replays sound onset nor regenerates a decision. Expired optional evidence remains unavailable; an immutable input already owned by admitted work retains its purpose-limited binding, subject to current result authority and relevance.

Current-format validators cover finite acoustic values, valid sectors and expiry ordering, profile existence, retention/payload consistency, source/owner binding, physical life and action ownership, and deadlines within the pinned profile. Native source removal is handled by historical evidence/action semantics, not a fallback lookup of an unrelated live entity. The [hearing limits inventory](../limits/hearing-and-speech.md) records the new provisional values and their owners; existing escape quantities remain owned by their current base-world definitions.

The animal qualification must show actual admitted pause/movement/flight and subsequent stopping, contrasting dispositions including continuation, repeated-cue coalescing, hidden-source invariance, outage/restore behavior and the real cost of a dense audible scene. A fixture that selects flee only proves action wiring; spontaneous behavior quality requires separately authorized live-model evidence.

## 11. Authority, lifecycle and current-format restoration

Use the existing serialized WorldService mutation owner. Validate untrusted command and provider shapes at their respective boundaries, then recheck current mechanical/permission conditions at native admission. A model proposal, remembered ID, preview, shared acoustic candidate or selected target grants no effects or private disclosure.

Speech commitment and the detector records needed to explain its audience are atomic. If required recording cannot be admitted or committed, the operation fails before a partial authoritative utterance is presented as complete. Ordinary persistence failure follows the existing hold/recovery policy rather than allowing lost evidence or half-populated audiences.

An accepted utterance is immutable historical evidence of what was said. Changing a name, moving the speaker, losing sight, changing a draft or canceling generation does not rewrite it. Explicit authorized correction/forgetting preserves the existing distinct source and privacy semantics.

Keep recognition/name knowledge, full perceived source bodies, summaries and lineage, sensory retained evidence where applicable, prepared native work and cognition ownership in one coherent save cut. Restore does not rerun hearing, learn introductions again, regenerate summaries, replay speech, consume new randomness or restart uncertain paid work.

Current-format validation checks:

- Required speaker and exact optional target references for the source's supported lifetime.
- Permitted speech roles and ambient/directed consistency; self uses the actual source/owner IDs. Seen-only records require null addressing and no addressee/quotation, while self/heard linguistic records require the acquired ambient/directed distinction.
- Sound-only records contain no forbidden speech payload.
- Heard segment/intelligibility/acquisition combinations and finite authored acoustic quantities.
- Complete source key/revision ownership and summary source coverage.
- Retention class and required sensory expiry semantics.
- Any retained native animal response state and its actual body/action owner.
- Absence of obsolete ordinary membership and duplicate recipient fields.

Historical references may lawfully outlive active entities. Validate them against the owning retained history contract rather than requiring every past subject to remain physically active forever. Current commands still need their supported current references.

The changed model follows the [current-format and development policy](../save-and-load.md#current-format-validation). There are no migrations, previous-shape aliases, schema-version suffixes, compatibility fixtures or old-reader fallback. If implementation changes make development saves incompatible, use the existing authorized replacement process with the union of useful starting-world content and report the lost development progress.

Restore increments the external authority generation, cancels/withdraws abandoned pending publication, reapplies current erasure/grant restrictions and issues fresh baselines. Restored IDs matching an earlier job do not revive its authority. Paid receipts and uncertainty remain outside gameplay rewind.

## 12. Performance and bounded preparation

This project changes repeated native recipient handling, history selection, model payload size and autonomous work. It must be measured through complete callers; a short prompt or an indexed first query alone does not establish economical execution.

### Four design answers

| Required question | Selected answer |
| --- | --- |
| What makes cost grow? | Audible/visible detector density per utterance; utterance rate; actor-owned retained source count/bytes; source and name revisions; active sensory records; simultaneous eligible decisions; complete shared-source and observer projections; transcript rows mounted by each viewer. |
| What preparation is shared? | One source word segmentation and acoustic policy lookup per utterance; conservative receiver candidate selection; immutable source facts across detectors; request-scoped actor/source hydration and participant-label/reference maps; the existing derived actor speech compaction; unchanged installed body/action definitions. |
| What invalidates reuse? | Source/observer movement and sensing revisions for new contact, installed acoustics/language/recognition changes, source edits and privacy revocation, actor life/participation, name/reference revisions, new selected speech, current work changes, request/control/generation changes and applicable simulation-time expiry. |
| How is the complete operation measured? | End-to-end send admission → candidate/contact evaluation → evidence/receipt commit → hot/cold preparation → attention/generation/consolidation → final native publication → permitted browser update; count visited candidates, SQL rows/buffers/statements, hydrated/serialized bytes, provider calls/tokens/charges, queue delay, CPU/heap/RSS and visible response latency. |

### Native and storage work

Preserve conservative acoustic candidate coverage and exact listener-local evaluation. Do not cap actual audible recipients to reduce cost. Bound admitted work through existing operation accounting/backpressure, reuse source preparation, and record a refused/incomplete operation honestly. No hidden “nearest listeners only” rule is introduced.

Do not scan all entities to allocate every visible handle or reconstruct recognition on each rendered row. Use the currently needed IDs and the existing exact lookup/index owners. Persistent individual recognition is one observer/subject association; names do not add a second unbounded alias history.

Select source IDs and payload sizes in SQL before hydrating full objects. Use the existing read-only snapshot/read lane, actor/world/generation predicates and indexed source/order/participant lookup. Verify the actual PostgreSQL query plan including loops, visited rows and buffers. A result LIMIT and the current statement timeout do not bound all search work or reader-queue delay.

Count full structured input and its serialized escaping against existing preparation/model limits. Where oversize is provable, refuse before repeated copying. A source that does not fit cannot be silently stripped to its text. Repeated sources shared by explicit cause, recall, transcript and summary preparation are hydrated once per compatible request snapshot and included once with useful role labels.

Preserve current separate admission for mandatory evidence, optional retrieval, model context, recent exact speech, compaction calls and storage. The project does not silently raise their numerical ceilings. It also does not claim a bound on lifetime character knowledge, total archive bytes, every optional similarity scan or a dense burst's total detectors; those growth risks remain in the owning inventories.

### Workloads and unmeasured acceptance

Qualify a small ordinary scene first: player, two independent people, an animal, a visible source and an occluded source. Then vary one growth dimension at a time through the real caller:

- More detectors in a concentrated acoustic area, separately from more distant inert entities.
- Repeated ambient speech and several addressed speakers, including many utterances reaching one observer.
- Cold SQL history with source bodies outside residency, followed by warm repeated reads.
- Much larger unrelated retained speech history with the same immediate stimulus; automatic source hydration and paid compaction must not grow into a lifetime replay or block the same otherwise-valid decision.
- Long personally heard speech requiring compaction, including corrections and unknown-name participants.
- A retained body/identity or acoustic-policy change that invalidates a previously warm read.
- Multiple queued human/animal decision opportunities and a temporarily unavailable provider.
- Save/restore, expired sensory evidence and stale completion while a source-bound job is in flight.
- Dense captions with long names, partial hearing, enlarged text and a narrow viewport.

Measure matched baseline and changed versions with the same declared world, configuration, host and offered simulation speed. Native throughput, server preparation and browser responsiveness are separate findings. No numerical capacity or latency success is asserted here; SPK11 records actual measurements and unresolved capacity before claiming delivery.

Avoid paying once for every detector/event. Native continuation is free of model calls. Meaningful change creates an opportunity; common scheduling coalesces related pending causes within its existing allowance, preserves required physical evidence and does not force a written thought. Full paid cost includes routing, optional attention, generation, compaction, consolidation and uncertain dispatched work.

## 13. Integration sequence and required evidence

The dependency order below defines coherent integration cuts. The tracker owns tasks, checkbox state and completion criteria. The feature specification owns the observable [SP-A01–SP-A28 acceptance scenarios](speech-and-social-perception-feature-spec.md#acceptance-scenarios); the evidence below identifies which technical layers must support them.

1. **SPK01–SPK04: evidence, world policy, shared presentation and durable memory.** Establish one field meaning and full source transport before adapting model prose. Qualify self, directed, ambient, unheard, unintelligible, unnamed and cold/consolidated records through actual producers and readers.
2. **SPK05 and SPK10: source-owned dialogue and restoration.** Replace every membership-dependent consumer while preserving compaction, exact actor/source ownership, history, provisional disclosure and independent physical cooperation. Remove obsolete state only with current serializers/validators/callers updated together.
3. **SPK06 and SPK09: usable player interaction.** Apply uniform freeform AI gating and ordinary optional-address UI through actual menus, composers, shortcuts and HTTP paths. Preserve drafts, explicit send, receipt recovery and accessible direction cues.
4. **SPK07–SPK08: animal detection and chosen behavior.** Feed the same acoustic contact into capability-appropriate sensory experience and actual available actions without human language, required prose or scripted universal flight.
5. **SPK11: whole-flow qualification.** Run the affected integrated cases, delayed memory/identity consequences, privacy/recovery failures and meaningful workload measurements. Fix in-scope failures before declaring completion.

### Evidence that must distinguish wiring from behavior

| Layer | Required demonstration |
| --- | --- |
| Source and native evidence | A real utterance occurred; the source retained exact intention/words, each actual detector received only its allowed facts, and the full required audience/evidence committed together. |
| Shared presentation | The same structured record renders correctly for self, addressee, known bystander, unknown bystander and unseen known voice; quoted pronouns stay literal and no new middle-dot attribution appears. |
| Delayed memory | A directed and an overheard ambiguous quotation retain their roles after cold hydration, ordinary consolidation, later recall and restoration; a recognized unnamed person remains distinct. |
| Natural cognition | Matched personalities/current activities can lead to conversation, action, clarification or silence; a fixture selecting a reply proves wiring only. |
| No membership | Interleaved speech among several people remains correctly heard/attributed without joins/merges; panel closure and other speech do not revoke independent work or preview authority incorrectly. |
| Availability/recovery | Every player Speak/Speak-to/Act entry point agrees on unavailable AI; receipt recovery still reports an earlier committed send without repeating it. |
| Animal behavior | Actual sound evidence reaches a supported animal choice; warranted retreat and warranted continued activity both remain possible; words, addressee and human notes are absent where not supported. |
| Privacy and cost | Unknown identities and unheard text remain unknown, old generations cannot publish, and total measured preparation/provider/queue cost covers the complete episode. |

Prefer focused existing checks and suitable native/browser scenarios under [Verification](../../.agents/rules/verification.md). Do not add tests that merely mirror implementation. Live-model evaluation requires separately authorized execution and the shared spending ceiling; it is not authorized or performed by this documentation-only task. Fixtures, source inspection and static checks cannot establish spontaneous character quality.

## 14. Decisions, tradeoffs and expansion boundaries

The accepted simplifications are deliberate: one optional addressee, reliable directed perception for detected linguistic speech, stable supported individual recognition, names learned separately, no ordinary authoritative conversation membership and no semantic replyTo. They reduce social bookkeeping while preserving personal evidence and choice. Multiple explicit addressees, uncertain recognition, face/voice disguise, richer languages and complex turn-taking are later extensions, not hidden blockers.

The main tradeoff is that richer structured source input costs more preparation and model bytes than a sentence. Selection before hydration, shared preparation, derived rendering and existing compaction manage that cost without deleting meaning. The implementation must measure whether the complete experience fits existing allowances; this design does not purchase that answer through invented benchmarks or silently larger limits.

The removed membership model previously provided convenient grouping and freshness checks. Its replacement must preserve their useful effects through actual actor/source dependencies. A new hidden membership approximation would retain complexity without the accepted behavior.

No unresolved product decision is required to implement this selected baseline. Provisional gameplay tuning and broader capacity/behavioral qualification remain explicitly unmeasured work in the existing limits and implementation records; they do not authorize silent behavioral substitutions.

## Maintained records

- Implementation: [Speech and social perception, SPK00–SPK11](../maintainers/speech-and-social-perception.md).
- Limits and constraints: [Hearing and speech](../limits/hearing-and-speech.md), [Memory](../limits/memory.md), [Narration](../limits/narration.md), [Cognition](../limits/cognition.md), [AI execution](../limits/ai-execution.md) and [Native work](../limits/native-work.md).
- Related design: [Feature specification](speech-and-social-perception-feature-spec.md).
- Canonical contracts: [Hearing and speech](../hearing-and-speech.md), [Narration and conversations](../narration-and-conversations.md), [Memory architecture](../memory-architecture.md), [Knowledge](../knowledge.md), [Identity](../identity-and-references.md), [Save/load](../save-and-load.md), [Engine/world boundaries](../engine-and-world-boundaries.md) and [Performance](../performance.md).
- Bundled policy and character integration: [Observer knowledge](../worlds/base/knowledge.md), [Embodied survival](../worlds/base/survival.md), [Character feature specification](compelling-characters-feature-spec.md) and [Character technical design](compelling-characters-tech-design.md).




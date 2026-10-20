# Observer-specific perception, evidence and recognition — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The selected module A design is specified; PP00 final review and PP01–PP07 implementation and qualification remain open. | 2026-10-19 |

## Authority, scope and implementation boundary

This is the implementation design for [the feature specification](perspective-perception-feature-spec.md). [PP00–PP07](../maintainers/perspective-perception.md) own work, dependencies and delivery status. [SC01–SC14](stealth-awareness-tech-design.md#shared-contracts) remain the shared interface authority. This module supplies their concrete supported evidence families and observer recognition/retention policy; it does not replace those contracts. The [base-world policy](../worlds/base/perception-recognition.md) owns Perception, perceivable signatures, familiarity and detection tuning. The [limits inventory](../limits/perspective-perception.md) records restrictions, overflow and unqualified capacity.

The source baseline is the exact `codex/design-stealth-00-contracts` tip, `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`, in `Macrofold/OpenLegend`. Source inspection establishes the delivered paths below. This documentation does not install new fields, an attribute, physical sounds, sight rules, a scheduler, a model prompt or a database change. All subsequent code and qualification are PP01–PP07 work. The [SC02 revision representation correction](#shared-contract-amendment-proposal) is proposed to the shared owner; the two shared specification files are unchanged.

A owns acquisition of observer-permitted evidence, classification, association, individual recognition, per-fact retention and projections from those meanings. B owns geometric sight, occlusion, lighting and physically visible features. C owns emission, acoustic propagation, received sound features and physical hearing opportunities. E owns attention, investigation, action choice and native responses; D owns fear/startle and effective conditions; F owns preparedness and surprise; G owns input and authorized presentation. A never answers any of those owners' decisions by looking at a hidden entity or by equating detection with a behavioral response.

Reuse the existing world, timeline, observer, body life, personal-source and server audience/control boundaries. The reusable engine supports narrow installed sense/profile families; it does not hard-code a human voice, Perception attribute, name grammar or one world's emotional law. The selected world can make an ordinary useful inference natively. No AI request is required for each footstep, visible change or recognizable voice.

## Existing owners and actual delivery

| Existing owner | Delivered at the pinned source | Required integration |
| --- | --- | --- |
| [Kernel](../../packages/domain/src/kernel.ts), `updateEncounters`; [encounter cache](../../packages/domain/src/encounter-cache.ts), `prepareExposure`, `captureExposure`, `recentSightings` | Own actual observer/subject exposure and encounter transitions; ordinary recognition depends strongly on current episode membership. | Extend this mutation owner with channel state, exact covered intervals, detection progress and permitted continuity. Cache preparation is not another mutation owner. |
| [Perception](../../packages/domain/src/perception.ts); [perception frame](../../packages/domain/src/perception-frame.ts) | Range/body-height obstruction, coarse outward descriptors and supported speech exposure exist. Facing, illumination/concealment, general acoustic propagation and learned features are not delivered here. | Consume B/C's supported physical samples. Do not pretend a descriptor cache is a complete permitted fact or a geometric light solution. |
| [Contact acquisition](../../packages/domain/src/contact-acquisition.ts), `updateContactEpisodes`; `ContactEpisode` | Anonymous touch contacts and per-sense present/moving detail already exist. | Extend the existing exposure family for auditory/visual contact meaning. A contact need not denote a person or exactly one producer. |
| [Events](../../packages/domain/src/events.ts), `recordEvent` | Allocates occurrence ID/order, stores the event and calls the native response hook before most awareness rows; nested calls can emit further events. | Acquire required compact permitted results once before dependent native callbacks; preserve original occurrence order and actual acquisition membership separately. |
| [Event observation](../../packages/domain/src/event-observation.ts), `observeEvent`; [base disclosure](../../packages/domain/src/worlds/base/event-disclosure.ts) | Explicit observer disclosure allows partial activities and felt impacts without inventing an unseen performer. | Extend explicit supported field/role variants; do not serialize a whole public event or source object into the new record. |
| [Speech](../../packages/domain/src/speech.ts), `perceiveSpeech`, `projectEventEvidence`, `validateEventEvidence` | Committed utterances, listener-specific full/partial/no words, seen/heard/self distinctions and directional exposure exist; receiver selection currently depends on memory-bearing actors. | Separate sensing from memory, recognition and lexical capability. Preserve committed semantics while adding permitted participants, signature quality and lossless evidence projection. |
| [Base knowledge](../../packages/domain/src/worlds/base/knowledge.ts), `ObserverIdentity`, `recognizesSubject`, `subjectReferenceCurrent`, `rememberSubject`, `learnSpeechIntroduction` | Canonical-subject records contain a given name, revision, encounter association and authored flag. Authored acquaintances survive episodes; ordinary learned multimodal recognition does not. | Add observer-local learned individuals and support through this owner, with independent names and body references. Do not add a voice registry or infer familiarity from biography alone. |
| [Knowledge](../../packages/domain/src/knowledge.ts) | Personal subject notes have source evidence/revisions and historical note-only editing; subject keys are presently canonical. | Admit a typed local-individual subject through the same note owner and validators; retain valid canonical subjects. A voice pattern is not a synthetic entity. |
| [Experience](../../packages/domain/src/experience.ts), `Awareness`, `acquireEventAwareness`, `mutateExperience`, `awarenessMemory` | Awareness can retain richer speech/event data, but the awareness-to-memory adaptation drops information needed here. | One lossless native adapter for resident memory and server hydration; typed support survives every explicit projection. |
| [Personal accounts](../../packages/domain/src/personal-accounts.ts), `personalEventEvidence` and current-format encode/decode | Stable personal source links and exact body revisions exist, with explicit field allowlists. | Extend the allowlists and validators together. Merely adding a TypeScript property to Awareness will not preserve it through history. |
| [Memory repository](../../packages/server/src/memory-repository.ts), `sourceRows`, `hydrate`, `current`, `validatePreparation` | Actor-scoped current/historical reads retain source kind, ID and SHA-256 body revision; hydration independently flattens awareness. | Use the common lossless adapter and preserve exact source family/revision through retrieval, correction and asynchronous preparation. |
| Experience summaries and [server consolidation](../../packages/server/src/memory-consolidation.ts) | Summary text, coverage times, source IDs and entity IDs exist. The SPK design selects structural coverage that is not yet the delivered A facet manifest. | Preserve native fact capsules and precise source coverage outside model-written prose, with each fact's own time, role and association. |
| [Response](../../packages/domain/src/response.ts), `commitActorResponse`; experience `publishInnerWorld` | Response and independent reflection publication can update knowledge through separate valid entrypoints. | Both use the same subject/claim authority and stale-source checks. Fixing only response parsing leaves a bypass. |
| [Entity references](../../packages/server/src/entity-references.ts), [knowledge context](../../packages/server/src/knowledge-context.ts), [response context](../../packages/server/src/response-context.ts) | Current reference construction and `responseReferences` can prepare world-wide entity handles or treat visible IDs as recognized. | Build bindings from the admitted participant/facet set; visibility, identity, memory and physical targeting remain independent grants. |
| [Cognition](../../packages/server/src/cognition.ts), [decision context](../../packages/server/src/decision-context.ts), existing ActorWork intake | One intake and coalesced reasons exist; a reason is not the complete sensory evidence. | Pass permitted facts and exact dependency scope to the existing intake. E decides whether native action, AI work, player notification or no response is useful. |
| Existing native danger/controller and body-life owners | Native animals already respond to contact or sight-supported danger without human autobiographies; body life separates replacement from prior bodies. | Add the admitted sensory variants to existing native retention/response inputs. Do not label the whole controller missing or make every animal a linguistic memory actor. |
| Experience invalidation, recognition/knowledge persistence and save/load | Corrections/forgetting expand source aliases and can conservatively clear derived identity/knowledge. Existing `mind_*` storage and same-format restoration exist. | Extend those same owners, exact source dependencies and current-format validators; no compatibility bridge, historical migration or second knowledge database. |

The new Perception attribute and recognizability profiles are explicitly absent in this baseline. Their installation is PP03, using the existing base attribute/world creation owner and `world-modules.ts:readAttribute` / `native-values.ts:currentAttributeState`. Receiver eligibility must no longer be inferred from a memory component. Current corpse naming through a private `remains.sourceId` also needs admission review: a private remains relationship cannot by itself tell an observer whose body they found.

## Evidence records and permitted references

### Three representations, one observation

Keep the private physical envelope, native permitted record and outward binding distinct. The first can retain true emitter/performer IDs, precise source coordinates and physical dependencies so the engine can propagate, order, deduplicate and invalidate work. The second contains only the information admitted for one observer, plus non-presentational support references. The third replaces native references with existing audience-scoped opaque handles and renders only permitted values. Neither a model nor a client receives the private envelope.

SC02's `SensoryEvidence`, `Fact`, `SensoryOrigin`, `LocationEvidence` and `SourceAssociation` are the interface shapes. The following notation defines their narrow A payloads and owner extensions; names are design notation, not claims of existing exported APIs or a direction to duplicate wrappers in production.

```ts
type SensoryModality = 'sight' | 'hearing' | 'touch';
type EvidenceRole = 'direct' | 'testimony' | 'inference' | 'authored' | 'imagined';
type InferenceStrength = 'possible' | 'supported' | 'ambiguous';

// Owned by one exact existing personal/native source, not a global fact table.
type FactKey = Readonly<{
  source: EvidenceRef;
  ordinal: number; // Immutable field ordinal within this source projection.
}>;

type EvidenceTiming = Readonly<{
  measuredFrom: SimTime;
  measuredThrough: SimTime;
  acquiredAt: SimTime;
}>;

type SupportedDetection = Readonly<{
  modality: SensoryModality;
  family: InstalledDetectionFamily;
  detected: 'signal' | 'surface' | 'body' | 'impact';
  limits: readonly InstalledObservationLimit[];
}>;

type ObserverSubject =
  | { kind: 'entity'; entityId: string } // Already admitted canonical association.
  | { kind: 'individual'; individualId: string }; // Observer-local learned subject.

type PermittedParticipant =
  | { kind: 'exposure'; exposure: ExposureRef }
  | { kind: 'individual'; subject: ObserverSubject; association: FactKey }
  | { kind: 'described'; descriptionAsHeard: string }; // Claim text, no ID lookup.

type SensoryFacet =
  | { kind: 'detected'; detection: SupportedDetection }
  | { kind: 'location'; location: LocationEvidence; frame: ObservationFrame }
  | { kind: 'perceived-feature'; sample: InstalledReceivedFeatureSample }
  | { kind: 'observed-detail'; detail: InstalledVisibleOrFeltDetail }
  | { kind: 'speech'; utterance: ExistingPermittedSpeechEvidence }
  | { kind: 'source-kind'; hypothesis: InstalledSourceKind; strength: InferenceStrength }
  | { kind: 'association'; association: SourceAssociation; proof: AssociationProof }
  | { kind: 'name'; name: string; use: 'chosen-label' | 'heard-claim' | 'authored'; participant: PermittedParticipant }
  | { kind: 'claim'; claim: SupportedClaim; speaker: PermittedParticipant; strength: InferenceStrength }
  | { kind: 'inference'; inference: SupportedInference; strength: InferenceStrength };

type SupportedSensoryFact = Readonly<{
  key: FactKey;
  role: EvidenceRole;
  timing: EvidenceTiming;
  fact: Fact<SensoryFacet>; // asOf is this facet's original semantic time.
}>;
```

`Installed*` names are closed admitted family variants validated by their existing world/observation owner, not arbitrary dictionaries or model-defined code. The first delivered integration needs current visual permitted descriptors, touch/impact, speech fragments, voice features supplied by C, native footstep-like/rustle classification supplied by a physical family, permitted locations and the claim forms below. An unsupported odor, magical aura, acoustic transform or visual feature is `unsupported`; it does not become a fabricated generic observation. A world may later install a narrow additional family through the existing boundary.

`FactKey.ordinal` is assigned from the source producer's fixed facet order, not from prose order or retrieval rank. A correction changes the source revision and explicitly relates replacement facets to the old keys; it does not mutate an old immutable key. A summary references original keys and their support. A native-memoryless fact uses its existing native-exposure/response source adapter; it need not create an Awareness row merely to obtain a key. Server binding IDs can encode these native tuples privately but cannot expose canonical source data in an anonymous handle.

The internal `SourceAssociation.rememberedSubject` binds to the typed existing knowledge/identity subject owner. It is not necessarily a canonical entity ID and is never a naked value supplied by a model. A list of tentative candidate associations is represented as multiple supported association facets sharing an exposure and ambiguity group, without changing SC02's single-association variant. `recognized` describes a supported observer association; it is fallible. Native truth about the current emitter is not overwritten by it.

### Facet admission, timestamps and precision

| Facet | Admission and meaning | Cannot imply |
| --- | --- | --- |
| Detected cue | Completed supported physical evaluation plus A's detection rule; sense, original interval and observation limits. | A known producer, definite personhood, current danger or an exact source coordinate. |
| Location | B/C's permitted bearing, region or point with its precision. Persist original observer position and measurement frame. | A region's center as a true source point, a path through unseen geometry or a current location after reception ended. |
| Appearance/equipment/activity | Only the exact visible/felt installed fields, each supported for its own interval. Observing a spear does not require knowing its carrier's name. | Other slots, possessions, intent, future action or the same detail through a later hearing-only observation. |
| Speech | The listener's actual detected/understood fragments and permitted roles, linked to the utterance occurrence. | Unheard words, a full transcript, canonical speaker identity or truth of the words. |
| Source-kind hypothesis | Native classification from supported perceptual features, such as footstep-like or rustle. | A definitely existing human, count of hidden beings or hidden cause. |
| Individual association | Perceptual continuity, a supported cross-sense observation or the selected learned-signature rule; exact supporting facets retained. | A name, correct global identity, a live body or refreshing every fact about that subject. |
| Name/label | An actually understood claim, authorized personal label edit or authored starting knowledge. | Proof of a claimed canonical identity, unique name, public rename or stronger recognition. |
| Testimony/derived claim | Attributed words or an explicitly committed interpretation with valid supporting evidence. | Direct observation of the claimed event or independent corroboration from every repeated account. |

For direct facets, `asOf` is the physical measurement time relevant to the value; continuous current detail uses the last actually evaluated supported instant. `measuredFrom/Through` records the covered interval. `acquiredAt` is when the native owner actually admitted the result. They often coincide for an impulse but are not interchangeable. An old recorded event learned later has an old occurrence time and a later acquisition. A reported claim may describe a separate asserted time/interval; store that inside the claim with its stated precision, while the speech hearing retains its own time. “Recently” in testimony is a quoted/understood relative claim, not a server-supplied exact timestamp.

Every current projection checks the fact's live supporting facet lease at the native snapshot. A live lease is derived state under the existing episode owner, scoped to observer life, sense, physical dependencies and the supported detail fields. It is not a new public object or one global `awareOfPerson` Boolean. A remembered fact remains valid historical evidence after its lease ends, until retention or explicit invalidation removes it. Summary coverage end, last record update and last known name revision never serve as `asOf` for unrelated facts.

`ObservationFrame` retains the original observer position and accepted orientation needed to interpret a bearing. The world direction/region is authoritative; “left” is relative to that saved observation pose. Turning does not rotate a historical ray. Moving cannot redraw the old bearing as though it originated at the current body. If G offers a present-relative reminder, it must derive it from the remembered permitted region/ray, visibly retain its age and uncertainty and not invent distance or a unique point. Store no hidden exact source position alongside an approximate location for UI convenience.

Continuous availability is facet-specific. A body may remain visible while its face or hands become obscured. End only those live detail grants that lost support; retain what B still supplies. At full loss, expire live body/detail grants immediately even if episode correlation survives the configured gap. A later look creates newly acquired detail from B's new evaluation. The old spear fact is neither deleted merely by disappearance nor silently refreshed by a heard word.

### Claims, contradictions and non-omniscient subjects

The initial `SupportedClaim` forms are attributed existence/danger in a permitted region, attributed person detail/activity/location with a stated time, attributed name/relationship statements and an explicitly unknown proposition preserved as heard words. A structured parser or model can propose a richer installed claim from understood speech, but its native result has `role: testimony` and exact quotation-source support. It cannot create an unobserved canonical participant from a name string. When the listener cannot bind “Ada,” retain that label as heard. If several already known people share the name, retain ambiguity.

Directly hearing “Ada dropped the spear” is direct auditory experience of that utterance. The drop is testimony. Seeing Ada holding a spear earlier is separate direct visual evidence at another time. Store both with their own support and attributed time; do not use last-write-wins across them. A retraction is another attributed claim. A later direct event may support an inference that an earlier claim was false or outdated, but does not erase the fact that someone made it.

Native classifications and identity matches use explicit `possible`, `supported` or `ambiguous` qualifiers where needed; a raw signal level, spread or similarity score is not a calibrated truth probability. Facts such as “I heard those words” need no artificial percentage. A knows neither whether a speaker lied nor their sincerity from private intent. E/cognition may form a supported belief; that remains a separate interpretation. Fear, hostility, trust and surprise eligibility are not A claim fields.

## Recognition, familiarity and association

### One identity owner, four distinct reference roles

Extend `ObserverIdentity` and its persisted `mind_recognition` representation to support a learned local subject alongside the current canonical variant. Use the existing identity ID allocation, revisions, ownership and validation. A local key belongs to the observer's retained mind; its observations still record the observer's exact body life. It cannot be compared between observers, decoded into an emitter, or used in a world entity lookup. No fake Entity, separate voice-address database or second subject-note store is permitted.

The extended record needs the typed subject key, existing names and note association, authored/learned origin, eligible modality profiles, retained familiarity supports, optional evidence-supported canonical association and existing revision/invalidation scope. The base policy defines exact exemplar/credit selection. Store original received intervals and quality, their sample/root identity, original encounter and evidence references. Store only the actor-permitted sample, never the source's full physical signature.

| Reference role | May do | Must independently acquire |
| --- | --- | --- |
| Anonymous exposure | Refer to the detected sound/contact and its permitted direction, time, fragments and details. | Individual identity, name and a physical target. |
| Learned local individual | Remember “that distinctive voice” or “the stranger who helped,” assign a private label and use a personal note. | A canonical association or a currently targetable body. |
| Remembered canonical individual | Discuss an already supported person and use their permitted historical notes; SPK may admit its existing communication reference. | Current body location, live equipment/activity and physical action authorization. |
| Current body/contact target | Act on the particular currently admitted physical body/surface under the action owner and exact life. The displayed identity may still be unknown or mistaken. | A stable individual, name or access to unrelated notes. |

The server's existing binder assigns disjoint roles to exposure, remembered individual, note-only edit, communication and physical target handles. Admission accepts only the role needed by the operation. A recognized voice behind a wall does not return that person's native body ID as the sound's target. A previously known canonical addressee can remain a valid SPK communication reference under SPK's conditions; an unbound local voice cannot silently become such an addressee. Ambient speech can ask “Who is there?” Existing movement/pose or later E investigation can use a permitted walkable region or direction under their own admission. A does not add a local-contact `Talk.targetId` command.

### Acquisition-time matching and learning

Implement the [selected base policy](../worlds/base/perception-recognition.md#matching-and-association) exactly through the world owner. The reusable matching mechanism operates on finite admitted received features, this observer's eligible exemplars and world-supplied thresholds. It must follow this order:

1. Validate the completed physical sample, source/root receipt, observer capability and detector/policy pin. Read the settled current Perception once where this world requires it. Retain the admitted value and feature availability with the interpretation.
2. Build candidate queries from received feature intervals only. Retrieve all potentially eligible local learned individuals through a conservative feature index. A true emitter ID, global name, source asset or unobserved clean feature must not narrow the query.
3. Compare the current sample against the **pre-acquisition** eligible exemplar set. Evaluate candidate and recognition-stage requirements separately, reduce exemplar results to distinct individuals, then apply the world competitor margin to other individuals. Complete the query before asserting uniqueness; otherwise return `incomplete` under required work or defer an optional later inference.
4. Acquire a recognized, suspected/ambiguous or unassociated result with explicit proof. A successful match is a fallible belief about a learned individual. It does not resolve the signal to that individual's actual current body.
5. Only after that result is fixed, admit qualifying learning samples. Initial anonymous learning can compare short retained acoustic seed history across ordinary conversational pauses; current exposure grace is not its history window. Apply the separate world learning criteria and original sample/root receipts. An ambiguous candidate cannot increase familiarity simply by being repeated as a guess.
6. Update bounded retained credit/exemplar state and its revision. Retain original recognition and learning support, so a later correction can invalidate descendants. Queue a meaningful evidence/association change for E and optional presentation, without directly requesting a model or selecting an action.

Prototype records are exact observed exemplars, not averaged secret signatures. The selected short seed-history operation creates a fallible local voice pattern from sufficient distinguishing observations. It does not prove that one producer exists. Identical unknown voices can be misassociated; the engine may not resolve the ambiguity using private source truth. Explicitly authored acquaintances supply supported modality/familiarity seeds, separately from biography/name text.

There is no mandatory note or naming action to become familiar. Ordinary qualifying experience learns natively. Profiles and live body capability are distinct: a face hidden by clothing may prevent face matching without preventing current tracking of a visible moving body. A recognized individual seen in a new location still compares admitted individual features. Clothing, place, a weapon and companions may support a separately labeled contextual hypothesis, not permanent identity by themselves.

### Association, rebinding, mistakes and correction

An `AssociationProof` is a closed tagged form: permitted within-exposure continuity; simultaneous unambiguous cross-sense correspondence; learned-profile match; authored starting association; or an attributed/inferred hypothesis. It stores supporting fact keys, the original decision time and the admitted policy/ability inputs. It never contains “same private emitter ID” as an epistemic proof. For anonymous sounds lacking enough individual information, a contact can be a broad pattern with unknown producer count.

When later evidence associates an anonymous contact with a learned person, append an association fact. Do not mutate prior detection or assign the new association's time to older details. A view can now say “the person I saw by the gate, later associated with Ada,” linking both the old observation and new association. It must expose a tentative qualifier if the link is tentative. Only facets actually linked by the proof become related; proximity in a transcript or shared words is insufficient.

Canonical association is a supported binding to an already admitted person reference, not a lookup of the hidden producer. Direct cross-sense correspondence must exclude competing visible speakers/emitters and use physical observation support from B/C. An introduction provides a name claim, not proof that the introduced person is a preexisting canonical Ada. A false learned recognition can label a current visible body as Ada in the observer's belief while its independent physical target refers to the actual observed body. Neither overwrite the authoritative entity nor copy unseen Ada attributes onto that body.

Keep mistaken associations as attributable records until supported correction/forgetting changes their eligibility. A split creates separate local subject associations for the selected supported evidence; a merge relates eligible subjects through an explicit admitted proof. Preserve original subject keys and source links as historical aliases so notes and records remain attributable. Do not merge private notes or adopt a name solely on a tentative match. A supported deliberate note merge/name edit uses the existing knowledge edit owner, preserves conflicting claims and validates both subjects. Equal names never merge subjects.

Every current lookup applies the current correction/forgetting overlay. A superseded association can remain in authorized actual-history reading as “previously believed,” with its correction relationship; it is not current reliable recognition. User-directed forgetting removes eligibility according to the existing forgetting contract, including derived notes/associations and both source aliases. The immediate conservative invalidation boundary can clear all affected learned recognition before selective maintenance runs. It cannot temporarily retain a known-invalid recognition while awaiting a model or SQL scan.

Later reflection may reconsider an old cue using later knowledge, but must acquire a new `inference` with the original observation as support and a new interpretation time. Re-running matching after restore, a skill increase or a profile edit cannot rewrite the original result or add learning credits.

## Acquisition and deterministic ordering

### Native transition procedure

All actual acquisition enters the existing observation/experience mutation boundary once. Extend it; do not introduce an event bus, universal perception service, observation clock or competing scheduler. Required native evidence is compact and available independently of autobiographical storage. The integration order is:

1. The physical owner commits or reaches the actual source occurrence/interval. Retain its original event order or exposure transition/dependency references. Input intent, animation, optional media playback and speculative model output are not physical occurrence sources.
2. B/C completes the relevant conservative physical candidates in existing native order. Receiver selection uses actual sense/capability/life eligibility, not the presence of a memory component. A result distinguishes observed, completed not-detected, unsupported and incomplete.
3. For each observer, settle preceding exposure intervals under their admitted definition/clock conversion, reject duplicate covered support, and apply immediate or accumulating detection. Sample acquisition is idempotent across the event, memory and native-response consumers.
4. Construct the permitted detection/location/detail facets. Classify supported ordinary signals and perform eligible recognition/association. Freeze the acquired result with its original occurrence/measurement/acquisition facts.
5. Update the compact native exposure/recognition working set before a dependent native callback consumes it. At an actual pre-outcome cut, capture only facts already acquired at that point. Impact evidence produced by the outcome cannot warn against that same impact.
6. Call the existing dependent native-response path in its existing order. A callback may emit a nested occurrence. That nested event keeps its own source order and acquisition moment; do not reorder already committed bodily outcomes to make awareness rows look sorted.
7. Memory-capable actors materialize Awareness/personal experience from the frozen result. Memoryless receptors keep only their actual native continuation. Storage or callback retry consumes the same receipt and cannot reacquire, reroll, strengthen accumulation or add familiarity.
8. Notify the existing ActorWork/projection dependencies of meaningful changes. Optional story, consolidation, recall and cognition may run later; the physical world does not await those interpretations merely to make evidence exist.

`recordEvent` currently calls native response before most awareness insertion. Its integration must deliberately split compact acquisition from autobiographical insertion while keeping one semantic acquisition. Speech listener results prepared before the callback are not automatically already acquired; apply and receipt them once before the native consumer that needs them. Preserve original event allocation/order; `Awareness.sequence` can reflect later nested allocations and is not the cutoff clock.

Deterministic ordering uses existing transition and physical candidate order, source occurrence order, interval start/end, sense-family order and stable observer-local record key for remaining equalities. Preserve the current owner order where it already exists. A support-set display or map traversal order cannot decide which identity wins; exact epistemic ties remain ambiguous. Stable native source IDs may order private producer work and deduplicate a contribution, but are never evidence of candidate identity or observed continuity.

### Accumulation, equivalent cues and gaps

B/C supplies immediate-detection admission or the installed nonnegative weak-support rate/impulse, actual covered interval and physical dependencies. A applies the world threshold/integration rule exactly once. It does not reinterpret dB as a confidence percentage or invent a light model. A completed rate interval integrates duration, not number of publications. Split at physical changes, detection threshold crossings and eligible deadlines; solve the first crossing within the interval. A later large simulation step cannot reveal evidence before that solved instant.

For a continuous contribution, retain its admitted origin, last consumed through-time, detector/definition pin and residual progress. Only the uncovered part of a repeated or overlapping interval contributes. For a discrete contribution, consume the original observer/root/sample key once. Compatible sequential impulses can accumulate an anonymous regional pattern, using the world cadence/region rule. They need not have overlapping durations. A zero-rate interval is a gap and decays. Negative/nonfinite support is invalid family output; do not treat it as a permissive signal.

Correlation uses permitted continuity, compatible observed features and geometric overlap of the permitted estimates in their recorded world frame. It can establish a regional sound pattern without a known producer. It cannot use hidden emitter equality to join two sounds around a corner. If several contact hypotheses are equally compatible, preserve a broad ambiguous contact or separate facts without counting the same contribution twice toward a detection threshold. To avoid transitive chain fusion, each joined contribution must be compatible with the retained hypothesis support envelope, not merely one neighbor in a chain. B/C supplies enough actual path/interval evidence to justify any stronger continuity.

An ongoing signal can update native state without writing a story row per tick. Acquire a new durable facet at meaningful changes: first detection, changed permitted detail/region precision, actual new speech or discrete outcome, association change, or actual support loss where the existing account policy records it. Preserve distinct real occurrences even when the optional wakeup or renderer collapses repeated equivalent presentation. Narrative encounter throttles do not select evidence eligibility or learnable duration.

Expired idempotency receipts may be compacted only after the existing source/continuation owner proves it cannot redeliver that original input. Active continuous sources keep their consumed prefix; discrete committed sources retain their receipt through the existing acquired source identity/lineage. Do not add an unbounded second global “seen event IDs” set or evict receipts on a UI timer. Historical recall never invokes the acquisition path.

### Exact evidence cuts

Implement `EvidenceCut.acquiredBoundary` as immutable captured membership and the already resolved native values needed by the consumer, attached to the existing native operation/continuation. Preserve `at`, original occurrence-order context and existing transition context. No new globally incrementing observation revision is needed. Two cuts may share time and world sequence while containing different evidence.

At capture, copy the relevant eligible facts, their observation/association qualifiers, live-versus-remembered meaning and exact source support into plain owned arrays/records. Source references document provenance and support later validation; the consuming evaluator does not re-read changing records to add facts. `lastIncludedOrder` is useful context/high-water information, not permission to include every source whose event order is lower. An older occurrence can be acquired after the cut.

| Same transition example | Acquired membership | Consequence |
| --- | --- | --- |
| Source event 41 exists; its receiver evaluation is unfinished. Cut X is captured. | Event 41 contributes no acquired fact to X. | It cannot supply prior warning merely because 41 is old. |
| Event 42 is observed and acquired; native work captures cut Y. | Y includes the acquired event 42 facts, regardless of later awareness insertion. | Native response can use exactly those facts. |
| Receiver evaluation of 41 completes after Y; cut Z is captured. | Z can include 41 and 42; X and Y remain unchanged. | Do not backfill 41 into earlier cuts or sort it into prior warning. |
| An attack's impact creates event 43 after the pre-impact cut. | Its injury/startle evidence belongs to subsequent cuts only. | It cannot defeat surprise for the impact that created it; F chooses actual eligibility. |

Continuous exposure support carries its actual covered interval and native source dependency, without a synthetic WorldEvent or fake event order. Required support must be in the complete active native working set before the cut; missing required cold state causes preparation/hold, never absence. Once captured, no SQL hydration, provider answer, summary, current location or newly restored identity can supplement it. F owns which warning/preparation meanings qualify, not A's timestamp ordering.

### Incomplete and missed observation

`not-detected` is a completed supported evaluation for its stated interval. It does not establish absence of all people or dangers. A's initial design does not automatically persist every negative sensor sample. If a later E search action promises a useful negative report, it must supply the actually completed area, interval, sense and detection limitations; the report means “nothing detectable under this search,” not omniscient clearance.

An `incomplete` required result retains the existing continuation and holds advancement past the dependent native boundary. It cannot produce invisibility, zero threat, no sound or surprise eligibility. An optional delayed interpretation may remain pending without blocking physical acquisition that is already complete; its uncertainty remains explicit.

If a transient never reached a capable observer, was below threshold or fell in an actually unobserved interval, it is missed. Later entering the area, restoring a save, reading a source event or receiving a full transcript does not reconstruct direct experience. B/C must evaluate real swept/temporal intervals needed by their laws before advancing; A cannot compensate for a producer that silently skipped a required transient by fabricating a later sighting. A heard report about that missed event is new testimony.

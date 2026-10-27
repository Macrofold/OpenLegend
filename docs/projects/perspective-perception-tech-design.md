# Observer-specific perception, evidence and recognition — technical design

| Status      | Current progress                                                                                                                     | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Existing-channel evidence and shared temporal retention implemented; future producers and full PP07/SAI-A qualification remain open. | 2026-10-27   |

Architecture consulted for the supported-channel temporal/familiarity implementation **2026-10-27 10:15 UTC**. Combined semantic and capacity qualification remains with PS04-A; future physical producers remain separate.

## Authority, scope and implementation boundary

This is the implementation design for [the feature specification](perspective-perception-feature-spec.md). [PP00–PP07](../maintainers/perspective-perception.md) own work, dependencies and delivery status. [SC01–SC14](stealth-awareness-tech-design.md#shared-contracts) remain the shared interface authority. This module supplies their concrete supported evidence families and observer recognition/retention policy; it does not replace those contracts. The [base-world policy](../worlds/base/perception-recognition.md) owns Perception, perceivable signatures, familiarity and detection tuning. The [limits inventory](../limits/perspective-perception.md) records restrictions, overflow and unqualified capacity.

The source audit below records the design baseline; current delivery and evidence are maintained in [PP](../maintainers/perspective-perception.md) and [the scoped report](../verification/personal-perception-foundation.md). That baseline is the exact `codex/design-stealth-00-contracts` tip, `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`, in `Macrofold/OpenLegend`. Source inspection establishes the delivered paths below. This documentation does not install new fields, an attribute, physical sounds, sight rules, a scheduler, a model prompt or a database change. All subsequent code and qualification are PP01–PP07 work. The integrated [SC02 source adapters](#exact-shared-source-revisions) preserve each existing owner’s exact revision representation.

A owns acquisition of observer-permitted evidence, classification, association, individual recognition, per-fact retention and projections from those meanings. B owns geometric sight, occlusion, lighting and physically visible features. C owns emission, acoustic propagation, received sound features and physical hearing opportunities. E owns attention, investigation, action choice and native responses; D owns fear/startle and effective conditions; F owns preparedness and surprise; G owns input and authorized presentation. A never answers any of those owners' decisions by looking at a hidden entity or by equating detection with a behavioral response.

**Shared temporal extension implemented for supported channels:** [attention and memory §5.3](attention-and-scenes-tech-design.md#53-recent-chronology-without-narrative-boundaries) owns shared source fragments, exact personal receipt references and attended/required recent chronology. A remains the acquisition and cut authority. The [shared temporal target below](#shared-temporal-source-and-receipt-target) specifies its boundary with A; PP07 and full SAI-A remain open.

Reuse the existing world, timeline, observer, body life, personal-source and server audience/control boundaries. The reusable engine supports narrow installed sense/profile families; it does not hard-code a human voice, Perception attribute, name grammar or one world's emotional law. The selected world can make an ordinary useful inference natively. No AI request is required for each footstep, visible change or recognizable voice.

## Existing owners and actual delivery

| Existing owner                                                                                                                                                                                  | Delivered at the pinned source                                                                                                                                                                             | Required integration                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Kernel](../../packages/domain/src/kernel.ts), `updateEncounters`; [encounter cache](../../packages/domain/src/encounter-cache.ts), `prepareExposure`, `captureExposure`, `recentSightings`     | Own actual observer/subject exposure and encounter transitions; ordinary recognition depends strongly on current episode membership.                                                                       | Extend this mutation owner with channel state, exact covered intervals, detection progress and permitted continuity. Cache preparation is not another mutation owner.                     |
| [Perception](../../packages/domain/src/perception.ts); [perception frame](../../packages/domain/src/perception-frame.ts)                                                                        | Range/body-height obstruction, coarse outward descriptors and supported speech exposure exist. Facing, illumination/concealment, general acoustic propagation and learned features are not delivered here. | Consume B/C's supported physical samples. Do not pretend a descriptor cache is a complete permitted fact or a geometric light solution.                                                   |
| [Contact acquisition](../../packages/domain/src/contact-acquisition.ts), `updateContactEpisodes`; `ContactEpisode`                                                                              | Anonymous touch contacts and per-sense present/moving detail already exist.                                                                                                                                | Extend the existing exposure family for auditory/visual contact meaning. A contact need not denote a person or exactly one producer.                                                      |
| [Events](../../packages/domain/src/events.ts), `recordEvent`                                                                                                                                    | Allocates occurrence ID/order, stores the event and calls the native response hook before most awareness rows; nested calls can emit further events.                                                       | Acquire required compact permitted results once before dependent native callbacks; preserve original occurrence order and actual acquisition membership separately.                       |
| [Event observation](../../packages/domain/src/event-observation.ts), `observeEvent`; [base disclosure](../../packages/domain/src/worlds/base/event-disclosure.ts)                               | Explicit observer disclosure allows partial activities and felt impacts without inventing an unseen performer.                                                                                             | Extend explicit supported field/role variants; do not serialize a whole public event or source object into the new record.                                                                |
| [Speech](../../packages/domain/src/speech.ts), `perceiveSpeech`, `projectEventEvidence`, `validateEventEvidence`                                                                                | Committed utterances, listener-specific full/partial/no words, seen/heard/self distinctions and directional exposure exist; receiver selection currently depends on memory-bearing actors.                 | Separate sensing from memory, recognition and lexical capability. Preserve committed semantics while adding permitted participants, signature quality and lossless evidence projection.   |
| [Base knowledge](../../packages/domain/src/worlds/base/knowledge.ts), `ObserverIdentity`, `recognizesSubject`, `subjectReferenceCurrent`, `rememberSubject`, `learnSpeechIntroduction`          | Canonical-subject records contain a given name, revision, encounter association and authored flag. Authored acquaintances survive episodes; ordinary learned multimodal recognition does not.              | Add observer-local learned individuals and support through this owner, with independent names and body references. Do not add a voice registry or infer familiarity from biography alone. |
| [Knowledge](../../packages/domain/src/knowledge.ts)                                                                                                                                             | Personal subject notes have source evidence/revisions and historical note-only editing; subject keys are presently canonical.                                                                              | Admit a typed local-individual subject through the same note owner and validators; retain valid canonical subjects. A voice pattern is not a synthetic entity.                            |
| [Experience](../../packages/domain/src/experience.ts), `Awareness`, `acquireEventAwareness`, `mutateExperience`, `awarenessMemory`                                                              | Awareness can retain richer speech/event data, but the awareness-to-memory adaptation drops information needed here.                                                                                       | One lossless native adapter for resident memory and server hydration; typed support survives every explicit projection.                                                                   |
| [Personal accounts](../../apps/server/src/personal-accounts.ts), `personalEventEvidence` and current-format encode/decode                                                                       | Stable personal source links and exact body revisions exist, with explicit field allowlists.                                                                                                               | Extend the allowlists and validators together. Merely adding a TypeScript property to Awareness will not preserve it through history.                                                     |
| [Memory repository](../../apps/server/src/memory-repository.ts), `sourceRows`, `hydrate`, `current`, `validatePreparation`                                                                      | Actor-scoped current/historical reads retain source kind, ID and SHA-256 body revision; hydration independently flattens awareness.                                                                        | Use the common lossless adapter and preserve exact source family/revision through retrieval, correction and asynchronous preparation.                                                     |
| Experience summaries and [server consolidation](../../apps/server/src/memory-consolidation.ts)                                                                                                  | Summary text, coverage times, source IDs and entity IDs exist. The SPK design selects structural coverage that is not yet the delivered A facet manifest.                                                  | Preserve native fact capsules and precise source coverage outside model-written prose, with each fact's own time, role and association.                                                   |
| [Response](../../packages/domain/src/response.ts), `commitActorResponse`; experience `publishInnerWorld`                                                                                        | Response and independent reflection publication can update knowledge through separate valid entrypoints.                                                                                                   | Both use the same subject/claim authority and stale-source checks. Fixing only response parsing leaves a bypass.                                                                          |
| [Entity references](../../apps/server/src/entity-references.ts), [knowledge context](../../apps/server/src/knowledge-context.ts), [response context](../../apps/server/src/response-context.ts) | Current reference construction and `responseReferences` can prepare world-wide entity handles or treat visible IDs as recognized.                                                                          | Build bindings from the admitted participant/facet set; visibility, identity, memory and physical targeting remain independent grants.                                                    |
| [Cognition](../../apps/server/src/cognition.ts), [decision context](../../apps/server/src/decision-context.ts), existing ActorWork intake                                                       | One intake and coalesced reasons exist; a reason is not the complete sensory evidence.                                                                                                                     | Pass permitted facts and exact dependency scope to the existing intake. E decides whether native action, AI work, player notification or no response is useful.                           |
| Existing native danger/controller and body-life owners                                                                                                                                          | Native animals already respond to contact or sight-supported danger without human autobiographies; body life separates replacement from prior bodies.                                                      | Add the admitted sensory variants to existing native retention/response inputs. Do not label the whole controller missing or make every animal a linguistic memory actor.                 |
| Experience invalidation, recognition/knowledge persistence and save/load                                                                                                                        | Corrections/forgetting expand source aliases and can conservatively clear derived identity/knowledge. Existing `mind_*` storage and same-format restoration exist.                                         | Extend those same owners, exact source dependencies and current-format validators; no compatibility bridge, historical migration or second knowledge database.                            |

The new Perception attribute and recognizability profiles are explicitly absent in this baseline. Their installation is PP03, using the existing base attribute/world creation owner and `world-modules.ts:readAttribute` / `native-values.ts:currentAttributeState`. Receiver eligibility must no longer be inferred from a memory component. Current corpse naming through a private `remains.sourceId` also needs admission review: a private remains relationship cannot by itself tell an observer whose body they found.

## Evidence records and permitted references

### Three representations, one observation

Keep the private physical envelope, native permitted record and outward binding distinct. The first can retain true emitter/performer IDs, precise source coordinates and physical dependencies so the engine can propagate, order, deduplicate and invalidate work. The second contains only the information admitted for one observer, plus non-presentational support references. The third replaces native references with existing audience-scoped opaque handles and renders only permitted values. Neither a model nor a client receives the private envelope.

SC02's `SensoryEvidence`, `Fact`, `SensoryOrigin`, `LocationEvidence` and `SourceAssociation` are the interface shapes. The following notation defines their narrow A payloads and owner extensions; names are design notation, not claims of existing exported APIs or a direction to duplicate wrappers in production.

```ts
type SensoryModality = 'sight' | 'hearing' | 'touch';
type EvidenceRole = 'direct' | 'testimony' | 'inference' | 'authored' | 'imagined';
type InferenceStrength = 'possible' | 'supported' | 'ambiguous';

// Materialized outer reference; never embed a source body's own hash inside it.
type FactKey = Readonly<{
  source: EvidenceRef;
  ordinal: number; // Immutable field ordinal within this source projection.
}>;

type EvidenceTiming =
  | { kind: 'observed'; measuredFrom: SimTime; measuredThrough: SimTime; acquiredAt: SimTime }
  | { kind: 'interpreted'; formedAt: SimTime; recordedAt: SimTime }
  | { kind: 'authored'; installedAt: SimTime }; // No fabricated sensory interval.

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
  | {
      kind: 'name';
      name: string;
      use: 'chosen-label' | 'heard-claim' | 'authored';
      participant: PermittedParticipant;
    }
  | {
      kind: 'claim';
      claim: SupportedClaim;
      speaker: PermittedParticipant;
      strength: InferenceStrength;
    }
  | { kind: 'inference'; inference: SupportedInference; strength: InferenceStrength };

type SupportedSensoryFact = Readonly<{
  key: FactKey;
  role: EvidenceRole;
  timing: EvidenceTiming;
  fact: Fact<SensoryFacet>; // asOf is this facet's original semantic time.
}>;
```

`Installed*` names are closed admitted family variants validated by their existing world/observation owner, not arbitrary dictionaries or model-defined code. The first delivered integration needs current visual permitted descriptors, touch/impact, speech fragments, voice features supplied by C, native footstep-like/rustle classification supplied by a physical family, permitted locations and the claim forms below. An unsupported odor, magical aura, acoustic transform or visual feature is `unsupported`; it does not become a fabricated generic observation. A world may later install a narrow additional family through the existing boundary.

D's [native player-rule contract](emotional-physiology-tech-design.md#native-authored-player-interpretation) additionally requires an installed **outward-life-condition observed detail**. Its native life/perception producer captures the actually admitted value, recognized-subject support and event-time physical-life/original-occurrence binding at the observation boundary. The observer's death fact can be acquired later, including a supported corpse association; current live state cannot reconstruct it. A later living fact retains its own measurement/acquisition date and any new-life association. Keep these facts in the same native/personal-source adapters and correction/retention path; no new fact store, global death broadcast or life meaning inferred from encounter prose. The selected world maps supported values to loss/reunion under its authored rules.

`FactKey.ordinal` is assigned from the source producer's fixed facet order, not from prose order or retrieval rank. A correction changes the source revision and explicitly relates replacement facets to the old keys; it does not mutate an old immutable key. A summary references original keys and their support. A native-memoryless fact uses the native-exposure/response adapter under its existing owner; it need not create an Awareness row merely to obtain a key. Server binding IDs can encode these native tuples privately but cannot expose canonical source data in an anonymous handle.

The notation above is the **materialized projection**, not the bytes hashed inside a personal-source body. Persist source-owned facets with a local `ordinal`; intra-source references use `{ kind: 'local', ordinal }`, while already committed external support uses `{ kind: 'external', key: FactKey }`. Native projection resolves local references within the source. Personal serialization hashes the body without its own containing revision, then the exact-source binder attaches the resulting source revision to the outer `FactKey`. Validate local ordinals and acyclic support; never serialize a record's SHA-256 digest inside the very payload whose digest it is. The current personal-account owner hashes its full canonical payload, so excluding fields by an undocumented hash exception is not an alternative.

Required native cuts precede personal serialization. On one genuinely new acquired contribution, the existing observation/exposure mutation owner calls the existing domain `nextId` allocator once with the non-entity prefix `perception-observation` and installs local content revision `1`. Its idempotency receipt is scoped to the exact observer/life, original occurrence or supplied continuous-source interval, sense/detector and admitted definition pin. An event-path retry, overlapping interval already consumed, memory projection or callback retry reuses that receipt and allocates nothing. A distinct meaningful cue has a new contribution ID; an authorized correction keeps the ID, advances that contribution's local revision once and retains its old immutable version/correction link. This is not a new acquisition or learning credit.

The first A slice lets native responses consume those same acquired native-exposure fact keys. The delivered `NativeResponseEpisode` has an episode/cause identity, `latestCause` and `proposalGeneration`, but no immutable sensory-content revision. Do not relabel `proposalGeneration` as a fact revision or allocate a duplicate response episode. If a later supported rule actually needs a distinct `native-response` fact, its existing response owner must retain an immutable contribution and explicit local adapter revision associated with the actual cause/episode; the shared family slot alone does not claim that record already exists.

That native reference exists synchronously and is not a new global ordering clock. The later Awareness/source body preserves the original native acquisition identity and adds its exact stored-body reference as a projection/source alias, without acquiring again. A cut cannot wait for a personal hash or SQL write. Keep native observation identity, containing personal-source version and facet ordinal distinct throughout restoration and invalidation. Adapter bindings retain underlying source role and storage family, including `memory` versus `summary` when their IDs coincide. A source ID can route/deduplicate private work; it cannot prove perceptual continuity or identity.

The native source identifies an immutable acquired contribution under its exposure owner, not the latest mutable contents of the entire episode. A later distinct observation creates its own contribution; a source revision changes when that contribution is explicitly corrected. Ending a live lease or acquiring a later voice therefore does not invalidate the earlier spear fact merely by advancing an episode's working-state revision. Persist/compact those original contributions through existing personal/native source owners and exact aliases. Shared temporal storage may factor their immutable bodies through the selected target below; it cannot become another writable evidence authority or create a new contribution for each identical rendered frame.

The internal `SourceAssociation.rememberedSubject` remains SC02's string: the existing safe serialized subject key resolves to `ObserverSubject` through the identity/knowledge owner. Do not place the union object directly in the shared field. It is not necessarily a canonical entity ID and is never a naked value supplied by a model. A list of tentative candidate associations is represented as multiple supported association facets sharing an exposure and ambiguity group, without changing SC02's single-association variant. `recognized` describes a supported observer association; it is fallible. Native truth about the current emitter is not overwritten by it.

`SupportedSensoryFact` is also a common permitted-memory projection. Physical `SensoryEvidence` itself always requires an actually acquired direct detection; authored and imagined records remain under private experience/knowledge owners and never fabricate one. A direct detection, live location/detail grant or received physical feature requires `role: direct` and observed timing. A source-kind or profile association is an inference with actual sensory support; testimony requires a heard/understood speech source or an already admitted reported account. Authored familiarity uses authored timing and its installation source. An imagined or proposed event may be retained as private interpretation but grants no sensory detection, familiarity credit or body target. The actor's own committed speech/action-result record likewise preserves its existing self-knowledge authority without pretending a deaf speaker heard their own words.

### Concrete first-slice family payloads

The first implementation must bind the placeholder family names above to these admitted records. Reuse existing `Position`, supported regions, `DefinitionPin`, speech segments, event-disclosure payloads and knowledge references; the notation names fields that must survive, not a new plugin framework.

```ts
type ObservationFrame = Readonly<{
  positionAtObservation: Position;
  forwardAtObservation?: Direction; // Only the accepted physical pose, when supplied.
}>;

type ReceivedFeatureInterval = Readonly<{
  featureId: string; // A member of the pinned family's finite admitted feature list.
  lower: number;
  upper: number;
}>;

type InstalledReceivedFeatureSample = Readonly<{
  family: DefinitionPin;
  modality: 'sight' | 'hearing';
  features: readonly ReceivedFeatureInterval[];
  quality:
    | {
        kind: 'acoustic';
        receivedLevelDbSpl: number;
        clarityMarginDb: number;
        identityFidelity: number;
      }
    | { kind: 'visual'; identityFidelity: number }; // B supplies actual feature loss/intervals.
}>;

type InstalledVisibleOrFeltDetail =
  | {
      kind: 'appearance';
      participant: PermittedParticipant;
      descriptorId: string;
      valueAsObserved: string;
    }
  | {
      kind: 'carried';
      participant: PermittedParticipant;
      itemExposure: ExposureRef;
      itemKindAsObserved: string;
    }
  | {
      kind: 'activity';
      participant: PermittedParticipant;
      actionFamily: DefinitionPin;
      phase: 'ongoing' | 'outcome';
    }
  | {
      kind: 'observed-axis';
      exposure: ExposureRef;
      first: CapturedLocationSample;
      second: CapturedLocationSample;
      direction: { kind: 'unoriented' } | { kind: 'first-to-second'; support: FactKey };
    }
  | {
      kind: 'observed-motion';
      exposure: ExposureRef;
      earlier: CapturedLocationSample;
      later: CapturedLocationSample;
      correspondence: 'unambiguous-received-continuity';
    }
  | { kind: 'contact'; contact: ExposureRef; detail: 'present' | 'moving' }
  | { kind: 'impact'; contact: ExposureRef; feltOutcome: ExistingPermittedImpactDetail };

type CapturedLocationSample = CapturedCurrentFacet &
  Readonly<{
    value: Extract<SensoryFacet, { kind: 'location' }>;
  }>;

type ClaimTime =
  | { kind: 'unspecified' }
  | {
      kind: 'stated-interval';
      from: SimTime;
      through: SimTime;
      precision: 'exact-as-stated' | 'approximate';
    }
  | { kind: 'relative-words'; wordsAsHeard: string; anchor: FactKey };

type SupportedClaim =
  | { kind: 'danger'; where: LocationEvidence; when: ClaimTime; presence: 'possible' | 'asserted' }
  | {
      kind: 'person-detail';
      about: PermittedParticipant;
      detail: ReportedPersonDetail;
      when: ClaimTime;
    }
  | { kind: 'location'; about: PermittedParticipant; where: LocationEvidence; when: ClaimTime }
  | { kind: 'name'; about: PermittedParticipant; nameAsHeard: string }
  | {
      kind: 'relationship';
      about: readonly [PermittedParticipant, PermittedParticipant];
      relationAsHeard: string;
    }
  | { kind: 'unparsed'; wordsAsHeard: string };

type ReportedPersonDetail =
  | { kind: 'appearance'; descriptionAsHeard: string }
  | { kind: 'carried'; itemAsHeard: string }
  | { kind: 'activity'; activityAsHeard: string };

type AssociationProof =
  | { kind: 'continuity'; support: readonly FactKey[]; formedAt: SimTime }
  | { kind: 'cross-sense'; support: readonly FactKey[]; formedAt: SimTime }
  | {
      kind: 'profile-match';
      support: readonly FactKey[];
      formedAt: SimTime;
      inputs: RecognitionMatchSnapshot;
      match: 'recognized' | 'suspected' | 'ambiguous';
    }
  | {
      kind: 'seed-promotion';
      samples: readonly [FactKey, FactKey];
      sampleTimes: readonly [SimTime, SimTime];
      formedAt: SimTime;
      policy: DefinitionPin;
      comparison: SeedMatchSnapshot;
    }
  | {
      kind: 'visual-learning';
      body: FactKey;
      bodyConfirmation?: CapturedCurrentFacet;
      sample: FactKey;
      formedAt: SimTime;
      policy: DefinitionPin;
    }
  | { kind: 'authored'; definition: DefinitionPin; installedAt: SimTime }
  | { kind: 'attributed-inference'; support: readonly FactKey[]; formedAt: SimTime };

type SupportedInference =
  | { kind: 'source-kind'; hypothesis: InstalledSourceKind; basis: readonly FactKey[] }
  | { kind: 'individual-association'; association: SourceAssociation; proof: AssociationProof }
  | {
      kind: 'historical-attribution';
      original: FactKey;
      subject: ObserverSubject;
      association: FactKey;
    }
  | {
      kind: 'region-danger';
      where: LocationEvidence;
      presence: 'possible';
      basis: readonly FactKey[];
    }
  | {
      kind: 'reassessment';
      prior: FactKey;
      disposition: 'withdrawn' | 'weakened' | 'replaced' | 'corroborated';
      basis: readonly FactKey[];
      replacement?: FactKey;
    };

type RecognitionExemplarRef =
  | { kind: 'observed'; sample: FactKey }
  | {
      kind: 'authored';
      subject: ObserverSubject;
      seedRevision: number;
      definition: DefinitionPin;
      exemplarOrdinal: number;
    };

type RecognitionMatchSnapshot = Readonly<{
  policy: DefinitionPin;
  abilityValue: number;
  subject: ObserverSubject;
  subjectRevision: number;
  effectiveFamiliarity: number;
  actualCreditSupport: readonly FactKey[];
  authoredBaseline?: {
    seedRevision: number;
    definition: DefinitionPin;
    level: 'learned' | 'familiar';
  };
  exemplar: RecognitionExemplarRef;
  originalExemplarQuality: number;
  receivedSample: FactKey;
  sharedFeatureIds: readonly string[];
  pairQuality: number;
  distance: number;
  enumeration: CompletedRecognitionEnumeration;
}>;

type CompletedRecognitionEnumeration = Readonly<{
  recognitionOwnerRevision: number;
  complete: true;
  candidateIndividuals: number;
  nearestOther?: {
    subject: ObserverSubject;
    exemplar: RecognitionExemplarRef;
    pairQuality: number;
    distance: number;
  };
}>;

type SeedMatchSnapshot = Readonly<{
  sharedFeatureIds: readonly string[];
  pairQuality: number;
  distance: number;
  complete: true;
  distinctCompetitorCount: number;
  nearestOtherDistance?: number;
  priorBinding?: { subject: ObserverSubject; association: FactKey };
}>;
```

The base voice feature IDs are `pitch-range`, `resonance`, `texture` and `speech-rhythm`, with the ranges/weights in the world owner. B's visual family must declare its finite feature IDs, physical ranges, normalization, positive weights, identity fidelity and actual availability rules before installation; it needs at least three identity dimensions for reliable matching under this selected policy. Passing an arbitrary new ID does not create a visual recognizer. Every feature appears at most once, has ordered finite endpoints within its admitted family range and retains its actual received interval. A uses the world's common normalized feature/distance law and modality-specific received quality: visual quality omits voice's acoustic term. Ordinary outward views generally need only their permitted descriptive/quality result, not a numeric fingerprint.

`InstalledObservationLimit` initially distinguishes unavailable lexical content, unavailable identity features, source unresolved, approximate location and actually obscured admitted detail. B/C may add a narrow physical limit they can substantiate. Do not annotate “behind a wall” simply because the private ray intersected an unseen wall. That relation requires the observer's permitted map/surface knowledge and the received estimate; otherwise disclose only the supported muffled direction/region. A native quality field does not itself entitle the model to know the obstruction's identity.

The current speech adapter preserves `PerceivedSpeech.perception`, `intelligibility`, `segments`, permitted delivery and listener pose/direction. Replace canonical-only speaker/recipient assumptions with the permitted participant binding selected by SPK/A; preserve the original `nameAtTime` presentation where authorized. The `sourceId`, `targetId`, `intendedRecipientId`, `references` and `entityIds` projections must pass the same role admission. A nullable/unbound speaker never triggers a fallback to `WorldEvent.actorId`. Existing word masking stays committed and is not rerolled by recognition, summary or restore. A seen-but-unheard speech movement has no heard words. A self utterance uses its existing self-source, not fake hearing.

The appearance descriptor IDs and `ExistingPermittedImpactDetail` reuse the specific installed event/exposure disclosure fields already allowed by `observeEvent` and the base disclosure owner. Copy one admitted value at acquisition, not a pointer that will dereference the entity later. `carried` is an observed carrying relation, not ownership or a complete inventory; missing slots are unknown. A claim about an unseen spear can use its described participant/item wording without allocating an `itemExposure`: serialize the claim's described detail variant through the testimony owner rather than counterfeiting the direct `carried` variant. The body/detail schema and reported-detail schema share vocabulary, not physical grants.

`SupportedInference` is the closed union above; its envelope supplies `role: inference`, strength and interpretation time. Historical attribution retains the original fact's time and follows only the admitted association. A reassessment's `prior` and optional `replacement` must resolve to already accepted claims/inferences, including source-kind and individual-association hypotheses; original direct facts belong in `basis` and are not withdrawn by interpretation. `replacement` is required only for `replaced` and absent for the other dispositions. It cannot recursively embed an arbitrary new proposition or revise a direct event's occurrence. Region danger is a possible inference from the listed permitted basis, not F warning eligibility or proof of a hidden producer. Unsupported richer interpretation stays as labeled private prose under existing memory limits until its actual structured family is selected.

The recognition snapshot preserves the actual pre-learning familiarity, ability, selected exact exemplar, received features and completed competition result. Its bounded credit references describe the retained real supports; authored support has its installation reference instead of fabricated observations. The recognition owner produces the completion receipt only after candidate enumeration and both matching stages finish under one captured dependency revision. `nearestOther` records the minimum other-individual candidate distance used by the margin test, not the first row or presentation preview. Absence is meaningful only with that completed receipt. Retain the chosen result and sufficient supporting capsules through compaction; restoration reuses it rather than attempting to recreate all past eligible profiles from today's index. An original decision need not retain an unbounded snapshot of every rejected candidate. A later intentional reassessment is a new inference with its own completed inputs.

For `visual-learning`, `body` must resolve to direct detected-body evidence and `sample` to a qualifying direct sight-feature sample from the same observer/life, with unambiguous perceived body correspondence at the sample's measurement time. If the original body fact's interval does not cover that time, require `bodyConfirmation` captured from its eligible live support, with `original = body` and actual coverage of the sample. The association owns that immutable confirmation through the existing snapshot binding below; an earlier body onset is not a new sighting. Retain exact source/definition pins and the learning policy; the body reference cannot select an old identity by private canonical ID. Supporting facets precede the association. This proof grants a learned local pattern, not a new canonical association or body permission; the existing profile/source owner retains and invalidates its single actual credit.

For deterministic facet order, emit detection first, then location, then received features in the pinned family's feature order, observed detail in that producer's declared order, speech, source-kind, association, names and attributed claims. Same-source support uses local ordinals that refer only to earlier facets; later reinterpretation is a new source. When this contribution first recognizes a speaker/carrier, its earlier speech/detail facets bind the permitted exposure; the later association facet relates that exposure to the subject. They cannot point forward to an association that depends on their own features. An already committed eligible prior association may be referenced normally. Candidate association facets use the completed distinct-individual rank with explicit ties, never global emitter ordering. An explicitly authored record has its installation reference rather than fictional detection/time fields.

### Facet admission, timestamps and precision

| Facet                         | Admission and meaning                                                                                                                             | Cannot imply                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Detected cue                  | Completed supported physical evaluation plus A's detection rule; sense, original interval and observation limits.                                 | A known producer, definite personhood, current danger or an exact source coordinate.                                  |
| Location                      | B/C's permitted bearing, region or point with its precision. Persist original observer position and measurement frame.                            | A region's center as a true source point, a path through unseen geometry or a current location after reception ended. |
| Appearance/equipment/activity | Only the exact visible/felt installed fields, each supported for its own interval. Observing a spear does not require knowing its carrier's name. | Other slots, possessions, intent, future action or the same detail through a later hearing-only observation.          |
| Speech                        | The listener's actual detected/understood fragments and permitted roles, linked to the utterance occurrence.                                      | Unheard words, a full transcript, canonical speaker identity or truth of the words.                                   |
| Source-kind hypothesis        | Native classification from supported perceptual features, such as footstep-like or rustle.                                                        | A definitely existing human, count of hidden beings or hidden cause.                                                  |
| Individual association        | Perceptual continuity, a supported cross-sense observation or the selected learned-signature rule; exact supporting facets retained.              | A name, correct global identity, a live body or refreshing every fact about that subject.                             |
| Name/label                    | An actually understood claim, authorized personal label edit or authored starting knowledge.                                                      | Proof of a claimed canonical identity, unique name, public rename or stronger recognition.                            |
| Testimony/derived claim       | Attributed words or an explicitly committed interpretation with valid supporting evidence.                                                        | Direct observation of the claimed event or independent corroboration from every repeated account.                     |

For an immutable direct facet, `asOf` is the physical measurement time relevant to that acquired value and never changes under its original `FactKey`. `measuredFrom/Through` records its actually covered interval. `acquiredAt` is when the native owner actually admitted the result. They often coincide for an impulse but are not interchangeable. Continuous current confirmation has the separate lease/snapshot representation below; it does not rewrite the original fact's timestamp on every evaluation. An old recorded event learned later has an old occurrence time and a later acquisition. A reported claim may describe a separate asserted time/interval; store that inside the claim with its stated precision, while the speech hearing retains its own time. “Recently” in testimony is a quoted/understood relative claim, not a server-supplied exact timestamp.

Every current projection checks the fact's live supporting facet lease at the native snapshot. A live lease is derived state under the existing episode owner, scoped to observer life, sense, physical dependencies and the supported detail fields. It is not a new public object or one global `awareOfPerson` Boolean. A remembered fact remains valid historical evidence after its lease ends, until retention or explicit invalidation removes it. Summary coverage end, last record update and last known name revision never serve as `asOf` for unrelated facts.

### Continuous confirmation without rewriting history

The existing exposure owner retains one compact lease for each currently supported direct value/interval. This is its working state, separate from an immutable acquired observation contribution:

```ts
type LiveFacetSupport = Readonly<{
  leaseId: string;
  revision: number;
  observer: ActorLifeRef;
  exposure: ExposureRef;
  original: FactKey;
  modality: SensoryModality;
  value: SensoryFacet; // Current permitted value; direct supported variant only.
  valueMeasuredFrom: SimTime;
  valueMeasuredThrough: SimTime;
  valueAcquiredAt: SimTime; // When this resolved value actually entered native evidence.
  confirmedFrom: SimTime;
  confirmedThrough: SimTime;
  dependencies: ExistingPhysicalPolicyDependencies;
}>;

type CapturedCurrentFacet = Readonly<{
  original: FactKey;
  value: SensoryFacet; // Only the supported direct detection/location/detail/feature variant.
  valueMeasuredFrom: SimTime;
  valueMeasuredThrough: SimTime;
  valueAcquiredAt: SimTime; // When this resolved value actually entered native evidence.
  confirmedFrom: SimTime;
  confirmedThrough: SimTime;
  confirmation: EvidenceRef; // Existing native-exposure adapter, role: facet-confirmation.
}>;
```

Allocate a lease once through `nextId('perception-lease')` when that direct facet gains support, with local revision `1`. Retain its original fact link and current permitted value from completed B/C input; never dereference today's hidden body to fill it. Advance the working revision and covered support once only when B/C completes new uncovered provider-defined support or a value measurement. Repeated intervals and projection polls change neither. A changed semantic detail finalizes the old meaning and starts a new immutable fact/support interval. Preserve the continuously perceived body/contact lease and its local individual through appearance, form or public-detail changes; independent carried/pile support can replace its own lease. Provider-reported loss or an incompatible physical dependency ends the affected lease; a later return has a new lease. B's explicitly sampled law holds availability between canonical samples; C's interval law holds received anchors. Neither claims continuously measured geometry. Episode grace preserves correlation only, after the affected live leases have ended.

Keep provider-defined availability coverage separate from the value's measurement and actual acquisition. For unchanged dependency-proved facts, their supported intervals may extend together. For a changing received point or feature, keep only the latest permitted value, `valueMeasuredFrom/Through` and `valueAcquiredAt` in the bounded current lease. The selected [temporal target](#shared-temporal-source-and-receipt-target) separately retains admitted attended/required changes by exact receipt reference before replacement; it does not turn the lease into a history list. An instantaneous point has equal measurement endpoints at the actual physical sample; a held cell does not move those endpoints. `confirmedFrom/Through` records completed provider-defined availability, not a claim that the point was stationary or remeasured throughout. Retain immutable snapshots at meaningful acquisition/outcome, a required captured cut or admitted final loss. B/C alone select physical sample boundaries. A, a renderer, a server read and a cut do not introduce another sampling cadence.

The `native-exposure` adapter distinguishes immutable `observation-contribution` from mutable `facet-confirmation` roles in its private source binding. A contribution revision changes only through its admitted correction; a lease revision records actual confirmation changes. They are not interchangeable. Capture copies the lease's resolved value, both actual intervals and current confirmation reference into `CapturedCurrentFacet`, without allocating a new ID, source event, acquisition or learning sample. Its `valueMeasuredThrough` supplies the value's semantic freshness in that snapshot, while `confirmedThrough` supplies last actual availability support; `original` identifies the unchanged earlier fact. The snapshot is not a rewritten historical fact under that key. Its `valueAcquiredAt` records when that particular resolved value became available; the older original onset key cannot backdate it. Once a cut captures it, subsequent lease advancement cannot modify its value/time/support. No consumer may dereference the lease later to supplement that cut.

The owning captured cut/continuation, association proof or retained final capsule stores the immutable confirmation payload and exact lease-ID/revision binding it captured. That binding resolves against this owning snapshot, not the lease's latest working revision. Later validation checks the captured original source eligibility and current correction/forgetting, privacy, timeline and authority fences; ordinary lease advancement, changed physical pose/dependency revision or support loss cannot invalidate an otherwise eligible historical snapshot merely because current sensing differs. A genuine correction/revocation of its captured supporting source still fences it. Current body/action authorization is separately revalidated for the operation and is never renewed by a valid historical cut. Restore reconstructs these bindings from saved owning snapshots/capsules, with their payloads already resolved; it does not require a per-frame lease-version store or a lookup of today's value. A summary retaining such a capsule preserves the same original binding as an exact source alias.

At meaningful semantic detail change or support loss, close the just-ended supported interval once through the same native/personal-source owner. A retained confirmation contribution preserves the original fact key, final permitted value, actual measurement interval, separate availability interval, physical dependencies, `asOf = valueMeasuredThrough` and actual finalization acquisition time. For a stable continuously confirmed spear this is also `confirmedThrough`; a sampled moving position is dated only to its own actual sample. This is continuation confirmation, not a new signal onset, independent witness or familiarity credit. Its finalization receipt is the exact lease ID and ended revision. The current foundation writes final confirmations to memory; the selected [recording target](attention-and-scenes-tech-design.md#56-one-recording-boundary-and-lasting-retention) instead admits every finalization through the common experience owner. Passive support loss alone supplies no lasting-autobiography reason. An admitted attended sequence, retained cut, knowledge support or required native continuation keeps its necessary exact capsule even when the narrative encounter quota emits no departure story row. Memoryless consumers retain only what their installed native policy needs. Ending current support does not revise or erase the original fact; later expiry/forgetting follows each retained owner's policy.

For example, a spear first seen at time 10 and continuously confirmed through time 25 remains currently supported at a cut at 25, while its original onset fact stays at 10. If the hand becomes obscured at 26 after support through 25, the final capsule makes its last-confirmed time 25 even if the body remains visible through 40. Hearing that person's voice at 42 changes neither spear time 25 nor body time 40. Continuous unchanged exposure requires a bounded active lease, not a durable facet per frame. Persist active leases and the immutable snapshots/final capsules actually retained by their owners; do not retain every intermediate lease version.

`ObservationFrame` retains the original observer position and accepted orientation needed to interpret a bearing. The world direction/region is authoritative; “left” is relative to that saved observation pose. Turning does not rotate a historical ray. Moving cannot redraw the old bearing as though it originated at the current body. If G offers a present-relative reminder, it must derive it from the remembered permitted region/ray, visibly retain its age and uncertainty and not invent distance or a unique point. Store no hidden exact source position alongside an approximate location for UI convenience.

Continuous availability is facet-specific. A body may remain visible while its face or hands become obscured. End only those live detail grants that lost support; retain what B still supplies. At provider-reported full loss, expire live body/detail grants immediately even if episode correlation survives the configured gap. A later look creates newly acquired detail from B's new evaluation. The old spear fact is neither deleted merely by disappearance nor silently refreshed by a heard word.

### Claims, contradictions and non-omniscient subjects

The initial `SupportedClaim` forms are attributed existence/danger in a permitted region, attributed person detail/activity/location with a stated time, attributed name/relationship statements and an unknown proposition preserved as heard words. The native ordinary-warning adapter below supplies the selected timely danger form without a model call. Other structured interpretation may propose installed claims from actually understood speech; its native result has `role: testimony` and exact quotation-source support. It cannot create an unobserved canonical participant from a name string. An unbound or ambiguous name remains a heard label.

Directly hearing “Ada dropped the spear” is direct auditory experience of that utterance. The drop is testimony. Seeing Ada holding a spear earlier is separate direct visual evidence at another time. Store both with their own support and attributed time; do not use last-write-wins across them. A retraction is another attributed claim. A later direct event may support an inference that an earlier claim was false or outdated, but does not erase the fact that someone made it.

Native classifications and identity matches use explicit `possible`, `supported` or `ambiguous` qualifiers where needed; a raw signal level, spread or similarity score is not a calibrated truth probability. Facts such as “I heard those words” need no artificial percentage. A knows neither whether a speaker lied nor their sincerity from private intent. E/cognition may form a supported belief; that remains a separate interpretation. Fear, hostility, trust and surprise eligibility are not A claim fields.

### Received physical motion and configuration

B's finite physical descriptor allowlist supplies coarse form, material/colour/pattern appearance, refined form, visible count/dimension, body/head direction, raised/lowered limb configuration and moving/stationary-within-precision descriptions. Bind `appearance.descriptorId` to those admitted fields and their finite producer values; size wording preserves its rounding uncertainty. These are physical observations, not `activity.actionFamily/phase` read from a private action. The activity variant remains available only where the existing event-disclosure owner actually admits that semantic activity. No mechanical consumer may parse descriptive wording into more precise geometry.

`observed-axis` supplies two actually received extremity/outline locations of the same supported part at one physical sample, with their captured uncertainty, observer frame and actual acquisition. It is unoriented unless an acquired asymmetric physical form, such as the visible tip/grip relation, supports the first-to-second direction; retain that exact fact. Hidden attachment parents, target IDs and action stages cannot orient it. The two endpoints must have unique received correspondence under B and must not coincide within their admitted uncertainty. F can derive a bounded possible approach/intersection from this axis, but it supplies no intention, committed attack or exact target by itself. Missing precision or direction stays unresolved. Keep the latest supported axis as an ordinary live detail, without a pose history.

`observed-motion` is the typed geometric exception. Its two `CapturedLocationSample` payloads preserve their original permitted location and observer frame, exact original fact and immutable confirmation binding, measurement endpoints and `valueAcquiredAt`. Both are completed point measurements at ordered distinct times of one unambiguously corresponding permitted exposure under B's sampled law. A real observed loss, teleport/replacement or ambiguous correspondence breaks the pair. Keep at most the latest two eligible samples in the existing active exposure working state; this is not a trajectory history. Materialize a durable motion contribution only for meaningful observed motion, warning support or a required captured result. Admit that contribution through the ordinary native receipt only when both samples are available, never at the earlier measurement time.

F's world danger adapter consumes this support; separately acquired physical form/detail can refine its interpretation without becoming an extra mandatory gate. It derives conservative closing and forward received-displacement intersection with the observer's own body from permitted locations/uncertainty and the saved observer poses. Bearing-only or insufficiently resolved motion cannot become a precise incoming-flight warning. B/A provide no hidden velocity, intended target, projectile identity or private action stage; F owns danger classification and its warning retention. Mere current target existence does not provide motion.

### Native ordinary-warning testimony

Ordinary understood speech can produce a timely warning through the existing speech/observation intake. The [base-language warning policy](../worlds/base/perception-recognition.md#ordinary-spoken-warning-policy) owns its finite grammar, exact place-label matching and approximate interval. The A adapter consumes only the complete actually understood clause and a uniquely matching listener-permitted current or retained Known-place snapshot. A fixture called “the doorway” uses that ordinary authored/discovered place family. A heard gap anywhere in the clause or at an unestablished clause boundary, an unknown or ambiguous label, or unsupported wording remains ordinary attributed speech without a native F claim; incomplete required source preparation is a distinct hold, not an unknown label.

Resolve `now` once to `[utteranceAt, utteranceAt + toSimulationTime(2 normal-speed seconds))`, with `ClaimTime.kind: stated-interval` and `precision: approximate`. The producer uses the original direct utterance time, not later cognition, storage, replay or publication. The actual claim admission time must lie inside that interval; at its exact end the warning is no longer current. Copy the place snapshot's bounded permitted location without narrowing it. Create `claim.kind: danger`, `presence: possible`, outer `strength: possible`, `role: testimony`, and the actual heard speaker participant. Retain the exact understood span and place fact as support. This records what was said, not that danger exists or the speaker is truthful.

The complete heard/understood clause is acquired before the native warning adapter runs, and the resulting claim has its own ordinary actual acquisition receipt. A partial utterance cannot be retroactively repaired from hidden text; a replay cannot repeat admission. A bare “look out,” ungrounded “there,” future/past phrase or unsupported wording remains useful ordinary speech without the bounded current claim F requires. Other supported interpretation can form testimony later, with its own actual time. F receives this already grounded claim, does not parse speech or invent its interval, and applies its own warning lifetime after timely admission. SPK owns this producer integration and its actual freeform/player/NPC speech journey.

The existing place/experience owner retains a minimal permitted capsule for each eligible Known place: its acquired label, original permitted location and precision, measurement/acquisition time, and exact original source kind, ID and revision. Preserve an originally admitted bounded place extent through that existing projection when the encounter actually disclosed it. An older point-only place source remains point-only; no current hidden radius, landmark or global place definition repairs its precision. These capsules are the retained source-owned facts, not another writable place database or alias registry. Authored places retain their explicit installation authority and location rather than fabricated observation times.

Before activating an actor for native warning intake, the existing bounded preparation owner builds a source-complete exact-label index over that actor’s eligible current/retained place capsules. Rebuild only on activation/restore or relevant invalidation, and update the affected entries on acquisition, correction, forgetting or source loss. Enumerate all matching labels before declaring uniqueness; an index miss means unknown only under a completed source/dependency scope. While required preparation is incomplete, hold the coherent native prefix before dependent mutation and resume its deterministic cursor. Neither a speech callback nor a captured cut scans full historical accounts or performs SQL. No nearest-N/top-N place truncation is selected. SPK02/PP04/PP06 must qualify retained-place count/bytes and complete activation/dirty work under existing native/storage envelopes; a memory or work admission failure remains explicit.

## Recognition, familiarity and association

**Shared familiarity implemented for supported contacts.** The [world policy](../worlds/base/perception-recognition.md#shared-subject-familiarity-target) owns bounded subject-wide familiarity and its exact retained contact support. Modality samples establish learned-feature eligibility and exemplar diversity; they are not a second familiarity score. Physical feature quality, pre-learning matching, uncertainty and observer-local association remain required. Neither another observer's receipt nor elapsed unattended time supplies familiarity. [Core evidence](../verification/attention-and-memory-core.md) covers correction/restoration; future physical-feature producers and full PP03 acceptance remain separate.

### One identity owner, four distinct reference roles

Extend `ObserverIdentity` and its persisted `mind_recognition` representation to support a learned local subject alongside the current canonical variant. Allocate the new observer-local record through the existing domain `nextId` owner with a distinct non-entity prefix; the baseline has no separate learned-individual allocator. Reuse identity revisions, ownership and validation. A local key belongs to the observer's retained mind; its observations still record the observer's exact body life. It cannot be compared between observers, decoded into an emitter, or used in a world entity lookup. No fake Entity, separate voice-address database or second subject-note store is permitted.

The extended record needs the typed subject key, existing names and note association, authored/learned origin, eligible modality profiles, retained familiarity supports, optional evidence-supported canonical association and existing revision/invalidation scope. The base policy defines exact exemplar/credit selection. Store original received intervals and quality, their sample/root identity, original encounter and evidence references. Persist the modality's last admitted credit time and its admitted normal-clock conversion/deadline independently of exemplar selection; eviction, correction publication and save/restore cannot reset the rate allowance or bank an early sample. Store only the actor-permitted sample, never the source's full physical signature.

| Reference role                  | May do                                                                                                                                                         | Must independently acquire                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Anonymous exposure              | Refer to the detected sound/contact and its permitted direction, time, fragments and details.                                                                  | Individual identity, name and a physical target.                                  |
| Learned local individual        | Remember “that distinctive voice” or “the stranger who helped,” assign a private label and use a personal note.                                                | A canonical association or a currently targetable body.                           |
| Remembered canonical individual | Discuss an already supported person and use their permitted historical notes; SPK may admit its existing communication reference.                              | Current body location, live equipment/activity and physical action authorization. |
| Current body/contact target     | Act on the particular currently admitted physical body/surface under the action owner and exact life. The displayed identity may still be unknown or mistaken. | A stable individual, name or access to unrelated notes.                           |

The server's existing binder assigns disjoint roles to exposure, remembered individual, note-only edit, communication and physical target handles. Admission accepts only the role needed by the operation. A recognized voice behind a wall does not return that person's native body ID as the sound's target. A previously known canonical addressee can remain a valid SPK communication reference under SPK's conditions; an unbound local voice cannot silently become such an addressee. Ambient speech can ask “Who is there?” Existing movement/pose or later E investigation can use a permitted walkable region or direction under their own admission. A does not add a local-contact `Talk.targetId` command.

### Acquisition-time matching and learning

Implement the [selected base policy](../worlds/base/perception-recognition.md#matching-and-association) exactly through the world owner. The reusable matching mechanism operates on finite admitted received features, this observer's eligible exemplars and world-supplied thresholds. It must follow this order:

1. Validate the completed physical sample, source/root receipt, observer capability and detector/policy pin. Read the settled current Perception once where this world requires it. Retain the admitted value and feature availability with the interpretation.
2. Build candidate queries from received feature intervals only. Retrieve all potentially eligible local learned individuals through a conservative feature index. A true emitter ID, global name, source asset or unobserved clean feature must not narrow the query.
3. Compare the current sample against the **pre-acquisition** eligible exemplar set. Evaluate candidate and recognition-stage requirements separately, reduce exemplar results to distinct individuals, then apply the world competitor margin to other individuals. Complete the query before asserting uniqueness; otherwise return `incomplete` under required work or defer an optional later inference.
4. Acquire a recognized, suspected/ambiguous or unassociated result with explicit proof. A successful match is a fallible belief about a learned individual. It does not resolve the signal to that individual's actual current body.
5. Only after that result is fixed, admit qualifying learning samples. Voice learning compares short retained acoustic seed history across ordinary conversational pauses; current exposure grace is not its history window. Apply the world learning criteria and original sample/root receipts. Initial sight/voice learning uses the world's ability-dependent quality requirement at that modality's starting familiarity; voice promotion applies it to the pair, including both original exemplars and shared-feature resolution. Authored modality installation retains its admitted Perception with the seed, so current-format validation and restore check the original admission rather than today's changed ability. A good second sample cannot promote unusable first support. Lower-quality detections and history remain intact, and later learning into an established modality keeps its ordinary quality floor. A uniquely compatible sample that is too early for the second credit preserves the earliest eligible seed and records only this hearing/tentative correlation; it does not become a competing seed group solely because of its timing. Do not bank it, merge independently observed producers or transitively fuse similar groups. An ambiguous candidate cannot increase familiarity simply by being repeated as a guess. Sight instead admits one qualifying sample with an unambiguous observed body; a sight sample without that correspondence creates no new learned individual in this slice.
6. On initial voice promotion, install the observer-local learned individual (or use the independently admitted subject of a previously sight-bound seed), retain the two original credited samples, and append a separate `seed-promotion` association citing those samples and their times. Initial sight learning retains one actual sample and appends `visual-learning`; reuse an individual only through eligible recognition, continuity or cross-sense association, otherwise create a fresh local individual rather than select an old one by body ID. Both routes make the learned pattern immediately usable without rewriting the pre-learning result, rerunning it with new credits, granting a canonical identity/name/body, or duplicating a credit. A later compatible voice can complete a sight-bound seed without another visible meeting; that seed and its subject are one competitor. Successful existing-profile recognition uses later learning instead of allocating a duplicate individual.
7. Update bounded retained credit/exemplar state and its revision. Retain original recognition and learning support, so a later correction can invalidate descendants. Queue a meaningful evidence/association change for E and optional presentation, without directly requesting a model or selecting an action.

Learned prototype records are exact observed exemplars, not averaged secret signatures. Sight becomes learned with one qualifying actual sample; voice requires two. Both use the world matching thresholds, shared subject-familiarity benefit and bounded modality retention. A later visual sample requires the next actual canonical B sample at or after its existing credit deadline, or a dependency-proved constant-feature interval covering it. Dynamic sight waits at most B’s declared cell period; the learning deadline creates no additional sight sample. Elapsed time, held-value replay and polling supply no credit. The voice seed-history rule creates a fallible local pattern, not proof of one producer. Identical unknown voices can be misassociated; private source truth cannot resolve the ambiguity.

An explicitly authored modality seed is a distinct existing identity-owner record: subject, installed definition/source and local seed revision, modality, `learned` or `familiar` baseline, up to four authored exact feature exemplars with their declared original quality, installation time/order, and the admitted settled Perception used to validate initial quality. It creates no sensory interval, utterance, learning root or fictional credit. The learned eligibility equivalent is one for sight or two for voice; familiar is six. Shared familiarity has its own authored installation support and uses the maximum of eligible authored familiarity and actual contact points, never their sum. Retain at most 12 real modality sample records plus four authored candidates, with at most four total matching exemplars selected across that union by the world rule. Definition removal and current correction/forgetting overlays govern eligibility; restore cannot reseed revoked acquaintance. A starting name or biography alone grants neither modality. Starting acquaintances receive their intended modality entries through the current world construction owner.

There is no mandatory note or naming action to become familiar. Ordinary qualifying experience learns natively. Profiles and live body capability are distinct: a face hidden by clothing may prevent face matching without preventing current tracking of a visible moving body. A recognized individual seen in a new location still compares admitted individual features. Clothing, place, a weapon and companions may support a separately labeled contextual hypothesis, not permanent identity by themselves.

### Association, rebinding, mistakes and correction

An `AssociationProof` is a closed tagged form: permitted within-exposure continuity; simultaneous unambiguous cross-sense correspondence; learned-profile match; conservative two-sample voice promotion; one-sample body-supported visual learning; authored starting association; or an attributed/inferred hypothesis. It stores supporting fact keys, the original decision time and the admitted policy/ability inputs. Learning is an explicit new interpretation, never a canonical lookup. It never contains “same private emitter ID” as an epistemic proof. For anonymous sounds lacking enough individual information, a contact can be a broad pattern with unknown producer count.

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

B/C supplies immediate-detection admission or an installed nonnegative weak-support rate/impulse, provider-defined covered interval and physical dependencies. B's canonical cells and C's held acoustic spans are explicit physical laws. A consumes each uncovered duration once, schedules the first threshold crossing in that held interval and acquires only at that actual native boundary. A host publication or evidence cut can settle the same prefix but creates no measurement or extra duration. A physical/provider change settles the preceding span and then installs its next rate or gap. A does not reinterpret dB as probability, infer continuous visibility between visual samples or invent a light model.

For a continuous contribution, retain its admitted origin, last consumed through-time, detector/definition pin and residual progress. Only the uncovered part of a repeated or overlapping interval contributes. For a discrete contribution, consume the original observer/root/sample key once. Compatible sequential impulses can accumulate an anonymous regional pattern, using the world cadence/region rule. They need not have overlapping durations. A zero-rate interval is a gap and decays. Negative/nonfinite support is invalid family output; do not treat it as a permissive signal.

Correlation uses permitted continuity, compatible observed features and geometric overlap of the permitted estimates in their recorded world frame. It can establish a regional sound pattern without a known producer. It cannot use hidden emitter equality to join two sounds around a corner. If several contact hypotheses are equally compatible, preserve a broad ambiguous contact or separate facts without counting the same contribution twice toward a detection threshold. To avoid transitive chain fusion, each joined contribution must be compatible with the retained hypothesis support envelope, not merely one neighbor in a chain. B/C supplies enough actual path/interval evidence to justify any stronger continuity.

An ongoing signal can update native state without writing a story row per tick. Acquire a new durable facet at meaningful changes: first detection, changed permitted detail/region precision, actual new speech or discrete outcome, association change, or final confirmation at actual support loss. The final support capsule is independent of whether the narrative account policy emits a departure story row. Preserve distinct real occurrences even when the optional wakeup or renderer collapses repeated equivalent presentation. Narrative encounter throttles do not select evidence eligibility, last-confirmed time or learnable duration.

Expired idempotency receipts may be compacted only after the existing source/continuation owner proves it cannot redeliver that original input. Active continuous sources keep their consumed prefix; discrete committed sources retain their receipt through the existing acquired source identity/lineage. Do not add an unbounded second global “seen event IDs” set or evict receipts on a UI timer. Historical recall never invokes the acquisition path.

Learning-root eligibility and replay receipts remain in that existing durable personal/native source lineage and its actor-scoped index after exemplar eviction. The active recognition working set loads only the receipt metadata for roots actually entering the current acquisition, together with the bounded retained samples; it does not hydrate all prior observations or keep another ever-growing in-memory ID set. A genuinely new original utterance has a newly allocated original physical root. A future physical recording producer must preserve the original root/sample interval and prepare the observer's indexed receipt metadata through the existing loader before learning becomes a required native dependency. Missing required receipt preparation holds/defer work under that owner; it cannot be treated as an unseen root that earns fresh credit. No SQL lookup occurs inside an already captured cut. Compaction keeps sufficient exact receipt lineage, while actual forgetting/revocation applies its existing source eligibility rule. A still-recognized recorded sample cannot become a fresh meeting merely because its exemplar was replaced. Installing replayable recording families remains C/SPK work; stored-history reading, media preview and synthesis already remain outside physical acquisition.

### Exact evidence cuts

Implement `EvidenceCut.acquiredBoundary` as immutable captured membership and the already resolved native values needed by the consumer, attached to the existing native operation/continuation. Preserve `at`, original occurrence-order context and existing transition context. No new globally incrementing observation revision is needed. Two cuts may share time and world sequence while containing different evidence.

At capture, copy the relevant eligible facts, their observation/association qualifiers, live-versus-remembered meaning and exact source support into plain owned arrays/records. Source references document provenance and support later validation; the consuming evaluator does not re-read changing records to add facts. `lastIncludedOrder` is useful context/high-water information, not permission to include every source whose event order is lower. An older occurrence can be acquired after the cut.

| Same transition example                                                                                                               | Acquired membership                                                              | Consequence                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source event 41 exists; its receiver evaluation is unfinished and is not required to complete before this outcome. Cut X is captured. | Event 41 contributes no acquired fact to X.                                      | It cannot supply prior warning merely because 41 is old. If its required physical interval is due before the outcome, hold the outcome and do not finalize a usable cut. |
| Event 42 is observed and acquired; native work captures cut Y.                                                                        | Y includes the acquired event 42 facts, regardless of later awareness insertion. | Native response can use exactly those facts.                                                                                                                             |
| Receiver evaluation of 41 completes after Y; cut Z is captured.                                                                       | Z can include 41 and 42; X and Y remain unchanged.                               | Do not backfill 41 into earlier cuts or sort it into prior warning.                                                                                                      |
| An attack's impact creates event 43 after the pre-impact cut.                                                                         | Its injury/startle evidence belongs to subsequent cuts only.                     | It cannot defeat surprise for the impact that created it; F chooses actual eligibility.                                                                                  |

Continuous exposure support carries its actual covered interval and native source dependency, without a synthetic WorldEvent or fake event order. Required support must be in the complete active native working set before the cut; missing required cold state causes preparation/hold, never absence. Once captured, no SQL hydration, provider answer, summary, current location or newly restored identity can supplement it. F owns which warning/preparation meanings qualify, not A's timestamp ordering.

### Incomplete and missed observation

`not-detected` is a completed supported evaluation for its stated interval. It does not establish absence of all people or dangers. A's initial design does not automatically persist every negative sensor sample. If a later E search action promises a useful negative report, it must supply the actually completed area, interval, sense and detection limitations; the report means “nothing detectable under this search,” not omniscient clearance.

An `incomplete` required result retains the existing continuation and holds advancement past the dependent native boundary. It cannot produce invisibility, zero threat, no sound or surprise eligibility. An optional delayed interpretation may remain pending without blocking physical acquisition that is already complete; its uncertainty remains explicit.

If a transient never reached a capable observer, was below threshold or fell in an actually unobserved interval, it is missed. Later entering the area, restoring a save, reading a source event or receiving a full transcript does not reconstruct direct experience. B/C must evaluate real swept/temporal intervals needed by their laws before advancing; A cannot compensate for a producer that silently skipped a required transient by fabricating a later sighting. A heard report about that missed event is new testimony.

## Retention, correction and forgetting

### Three lifetimes, preserved meaning

Physical support, learned recognition and autobiographical recall have separate owners and lifetimes. The existing brief episode grace preserves correlation, not live observation. A learned individual can remain recognizable after that grace or the routine raw-recall window. The native working set required for current acquisition and outcomes must be complete even when the corresponding Awareness row is outside the resident personal-history tail.

| State                                                                         | Retention owner and behavior                                                                        | Boundary behavior                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active physical exposure, loss/return grace, accumulation and consumed prefix | Existing perception/encounter/contact owners; exact admitted progress and physical dependencies.    | End current facet grants immediately on actual loss; retain only the configured continuity/accumulation state.                                                                        |
| Anonymous learning seeds                                                      | Existing recognition owner, from permitted qualifying samples and the world's short history window. | Expiry removes automatic seed matching eligibility, without deleting the historical sound or proving another producer. No replay extends the window.                                  |
| Learned individual, exemplars and familiarity                                 | Existing identity owner and retained source support.                                                | No fixed acquaintance expiry is selected. Bounded support replacement, correction and explicit forgetting change future recognition; raw-history residency does not.                  |
| Current native warning/contact continuation                                   | Existing native exposure/response/preparation owner with actual life/region scope.                  | Retain exactly what the installed native policy needs. A does not extend animal danger timers or define F warning eligibility.                                                        |
| Raw actor recall and summaries                                                | Existing personal experience/memory retention and consolidation.                                    | Preserve typed meaning through selected retained records; the current routine window and speech protections remain their owner's policy.                                              |
| Authorized player's actual-history reading                                    | Existing personal-account history and privacy overlay.                                              | Reading a durable old source can differ from the character's current recall eligibility. Neither grants fresh current facts; actual forgetting/correction fences both where required. |

The inspected active history tail of 256 rows / 1 MiB is a residency bound, not an acquaintance limit or proof that an old fact was forgotten. Routine raw-memory consolidation eligibility begins after six simulation hours, while the newest 512 linguistic speech records retain their existing protection; neither is a lifetime history or recognition expiry, and A does not change those values. Existing consolidation batches of 128 sources / 512 KiB remain their owner's envelope. The [memory inventory](../limits/memory.md) owns those restrictions. The new typed payload must fit their exact serialization and preparation paths or cause explicit continuation/rejection under that owner; a limit cannot silently flatten protected evidence.

### Shared temporal source and receipt target

**Implemented for supported channels; combined qualification remains open in PS04-A.** [Attention and memory §5.3](attention-and-scenes-tech-design.md#53-recent-chronology-without-narrative-boundaries) owns the shared temporal records, atomic write flow, bounded retention and source reclamation. Extend the existing exposure/event and experience owners rather than a raw whole-world change archive. Common source fragments may serve several actual receivers; each observer retains their own exact acquisition, frame, precision, role, local association and coverage. Direct source references are usable only where the producer supplied that exact received value. Different masked/quantized values require their own immutable received variants; equal values can share payload without merging occurrences, witnesses or learning credit.

Compact receipt runs encode consecutive source entries that were actually acquired under the same supported conditions. Extending a run requires each real receipt; visible endpoints, private source equality or a later history read cannot fill a gap. Family-specific source revisions and the original permitted `FactKey` remain authoritative; receipt/chunk ordinals are storage locators, not another physical clock or a universal source revision. Captured cuts resolve only their observer's eligible receipts and retain their exact acquired membership. Sharing a source body does not authorize a consumer to hydrate another observer's receipt or expose the private originating entity.

The current broad scene and latest motion support remain available independently of detailed attention. There is no separate background-history sampler in this recommendation. Attention begins from the actual current receipt; earlier detail is eligible only if that actor independently retained it. Another observer's longer source history never supplies retrospective witnessing. Retain generic supported facet/event changes before current-value replacement, not raw entity diffs or a recorder-specific list of activities. Required evidence keeps its separate admission. Source death, attention changes and historical support release affect their owning lifetimes independently; source fragments are reclaimed after all entitled owners release them. Received terrain retains the actual clipped geometry and dependency revisions, never an entitlement to the whole shared map or recomputation against today's terrain.

### Lossless source and memory adaptation

Implement one native conversion for an acquired personal observation's structured body. Both `experience.ts:awarenessMemory` and the server `MemoryRepository.hydrate` route through it. Keep the source's existing kind, exact ID/revision and original event link rather than manufacturing a fresh acquisition from prose. Update the whole explicit projection chain together:

1. The observation and event-disclosure family creates only permitted facts.
2. Awareness stores their source-relative structured form and original acquisition metadata.
3. `speech.ts:EventEvidence`, `projectEventEvidence` and `validateEventEvidence` preserve supported speech and facet/participant meaning.
4. `personal-accounts.ts:personalEventEvidence`, codecs and current-format validation preserve the same admitted structure and original provenance.
5. Repository source rows, hydration, current/historical source validation and native memory adaptation preserve all supported fields.
6. Summary preparation/acceptance, retrieval and cognition context keep a structural manifest and exact source references independent of prose.
7. Client/history/prompt binders project only the requested audience's eligible values and role-specific handles after privacy/control revalidation.

A source link alone is insufficient if the reachable stored body has already lost who heard what, when, from which region, with what certainty. Conversely, do not copy the global event payload in order to become lossless. Losslessness is relative to the original observer-permitted record. Apply one supported projection definition across the memory paths; independently curated allowlists must agree and be covered by future PP04 whole-path acceptance.

Keep storage source kind distinct from epistemic role. `awareness`, `memory`, `summary` and personal account `perspective` are storage concepts; `direct`, `testimony` and `inference` describe meaning. A heard claim in an Awareness row remains testimony about its subject. A deliberate reflection can directly record the actor's own interpretation without becoming direct sensory evidence of an unseen event.

### Summary manifest and interpretation

Extend the existing `ExperienceSummary`/SPK structural coverage owner with native fact capsules. A summary body has its existing text and source coverage plus a deterministic manifest of the retained original facets, participants, original semantic times, precision, role, association proofs and correction eligibility. The model may propose concise interpretation; it cannot rewrite that manifest or supply omitted facts from its general knowledge.

For each selected source, construct the source-relative manifest before the provider request. The provider receives only the permitted text and structured fields needed for its task. Native acceptance verifies exact source preparation revisions and installs a manifest derived from those selected sources, not from parsing the returned summary prose. If essential facts cannot fit the permitted input/output or batch, continue in another admitted batch, retain those sources or use the existing non-provider fallback; do not publish a fluent but materially lossy replacement.

Deduplicate exact original fact keys and known aliases across raw observations and prior summaries. Do not turn one utterance repeated by several summaries into several independent supports. Keep incompatible testimony as attributed claims; optional prose can say they conflict. Coverage `from/to` describes the summarized span, not a replacement observation time. The summary “Ada was at the gate earlier and I heard her voice later” must still expose the old spear timestamp, later voice timestamp and current lack of visual location independently.

Retained fact capsules are not a second universal knowledge graph. They are the structural body of the already selected memory/summary records and the bounded native sufficient support needed by existing recognition/controller owners. Do not store every world state snapshot, full hidden signature or every rendered sensory frame. Where raw recall is deliberately condensed, preserve the minimum typed facets and source lineage needed for a retained claim/recognition. If a selected memory policy actually drops a fact, make that fact unavailable rather than reconstructing it from the source's current world object.

Consolidation is not a new learning opportunity. Its output time, imported alias, summary revision or embedding cannot add a detection, familiarity credit or independent witness. Source compaction and true forgetting are different operations: compacted support can continue through faithful retained capsules; explicitly forgotten support cannot.

### Correction, contradiction, revocation and deletion

Use the existing `invalidateExperience` and knowledge/recognition invalidation entrypoints. Expand original event/source aliases, action/result links, summary sources and correction relationships exactly as current ownership requires, then include the new fact/association/credit dependencies. Invalidate both `memory.id` and `memory.eventId` routes where either can reach the same experience. Existing source families can legitimately share an ID; invalidation and lookup always retain family, observer/world scope and exact version.

Different operations have different effects:

| Operation                                             | Selected effect                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New contradictory testimony                           | Add an attributed claim; retain prior direct observations and prior testimony. No automatic canonical history correction.                                                                                                                         |
| Actor revises an inference or withdraws an accusation | Add a later interpretation/correction relationship under existing private experience/knowledge authority. Old expressed belief remains attributable where eligible. Other listeners do not automatically receive the correction.                  |
| Authorized correction of an existing personal source  | Preserve original source/correction identity, retire or supersede affected facts, invalidate dependent associations/notes/recall preparations and recompute supported current projections.                                                        |
| Explicit forgetting/revocation                        | Remove eligibility through the existing overlay and clear affected learned recognition, claims, notes, preparations, embeddings/search results and pending projections. Do not revive a forgotten source through an older archived body or alias. |
| Storage compaction/summary                            | Preserve eligible typed support and original times; no new event, independent evidence, familiarity or privacy grant.                                                                                                                             |
| Source entity removed or life replaced                | Retire current body/source bindings according to physical/lifecycle owners; retain eligible historical observer experience without exposing hidden removal facts.                                                                                 |

Immediately fence native/UI/model results with the current source/privacy and authority generations when an invalidation commits. A future selective recomputation may preserve unaffected records only when dependency coverage is proven. Until then, the existing conservative clear of affected or all learned observer recognition is the safe selected implementation fallback; authored starting knowledge follows its explicit owner rather than accidentally masquerading as unrevocable learned evidence. Wider loss is visible loss of learned capability, not proof that the original event never happened. PP04/PP06 must record which conservative scope actually ships.

Before publishing an asynchronous summary, embedding, recalled account, name edit or response, recheck its captured source, timeline, observer authority/control and privacy scope. A stale result is discarded or reprepared under the existing owner; it cannot repopulate a forgotten subject. A current audience change also invalidates the binder's cached handles and payloads. No asynchronous worker independently commits knowledge outside the one existing mutation path.

A grants no new administrative operation to rewrite committed speech. The existing D66/open-owner limits on such rewrites remain controlling; these rules apply to already admitted personal-source correction, inference revision and forgetting operations. A spoken retraction is new words with a new occurrence. Any later general speech-edit feature must separately select and qualify its complete propagation policy before using these invalidation adapters.

Forgetting the cause of a committed bodily injury or startle does not reverse that physical result. D/F/other effect owners decide their existing consequences from the original admitted state; A only invalidates future evidence-dependent interpretations or preparation as their contracts require. Retraction does not force trust, apology or forgiveness. A useful social repair requires an actual new communication to the relevant people.

## Consumer integration and authority

### One permitted evidence boundary, different capabilities

Declare physical sensing, lexical understanding, individual recognition, durable personal memory, native response and reasoning capability separately. An animal without human notes can receive the same permitted sound bearing/quality as a reasoning actor at the same physical conditions. It may keep only an existing native contact/danger continuation. A human without comprehension can hear words as an unintelligible voice; a hearing-impaired actor can miss them while still seeing a body. Being the controlled player does not itself grant stronger sensory information.

| Consumer                           | Input from A                                                                                                                                                        | Responsibility outside A                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NPC cognition / private reflection | Selected permitted facts with individual times, modality, role, source support, current/remembered status and hypotheses; valid remembered/current reference roles. | E and existing cognition decide salience, thought, investigation, speech or voluntary action. A notification is not a command to reason.                            |
| Native animal/controller           | Required compact detected cue, permitted location/quality, local contact/association where that animal's capability supports it and exact acquired support.         | E selects its native response; D and F own condition/eligibility effects. No automatic language comprehension, named-human registry or autobiographical model call. |
| Player current presentation        | Same permitted current facets and eligible remembered reminders with audience-safe handles.                                                                         | G selects useful display duration, layout and controls while preserving time, precision and uncertainty. A marker or camera cannot disclose an unseen body.         |
| Player actual-history view         | Authorized exact personal source and its correction/forgetting overlay, with typed original evidence.                                                               | Existing history/control authority decides which person's account can be read; viewing it does not give another in-world actor that knowledge.                      |
| Physical action admission          | A current permitted body/contact/location grant of the correct life and action role.                                                                                | Action, geometry and reach owners decide if the chosen action is possible. Believed identity does not replace the physical target.                                  |

Use the same allowed underlying values, not a requirement to show identical text, have identical memory capacity or perform identical cognition. Native deterministic classification produces ordinary structured cues; prose and optional AI explain them. Tests must compare admitted semantic fields across consumers rather than expecting an animal to output a human sentence.

### Cognition, retrieval and notes

Extend the existing decision context and ActorWork dependency capture with meaningful A changes: a new detected signal, actually changed current detail, a supported association, source loss that affects a current action, a material corrected claim or a due native dependency. Coalesce repeated reason hints without collapsing the distinct acquired occurrences. E decides whether an innocuous rustle deserves no work, a native orientation response, a thought or an investigation. A does not automatically cancel an activity, turn every reasoning actor or wake an AI for every cue.

Retrieval candidates come from this actor's permitted source/subject space. Selecting relevant notes must not start by enumerating all canonical entities. Use existing actor-scoped subject and source indexes, then selected allowed handles. A name in a quoted utterance does not resolve an unseen person's notes by global lookup. A suspected match can refer to an already known person as a hypothesis; it cannot merge the new contact into that person's note as a certain encounter.

The current context builders that promote all visible IDs to recognized IDs must instead construct separate sets for visible body targets, recognized individuals, remembered people, anonymous contacts and note-only edits. Keep those sets as projections from one permitted state, not independent writable knowledge stores. `commitActorResponse` and `publishInnerWorld` validate the same typed subject variants. Model-returned reference strings are opaque handles from the prepared scope, never arbitrary canonical IDs or newly invented local subjects.

New observation cannot refresh an old note merely because the note is selected for a prompt. A note about Ada's spear remains a historical claim at its original time; the latest heard voice is a separate fresh fact. Arbitrary editable note prose such as “Ada is still carrying it” can remain the actor's attributed authored understanding, including mistakes; native validation does not certify the semantic truth of arbitrary prose. Never parse/promote that sentence into a direct/current field merely because it appears in a note. Any proposed structured fact, association, claim or inference must use the closed native validator through both `commitActorResponse` and `publishInnerWorld`, with the installed form, original support and role. No selected rule automatically extrapolates the current unseen location, equipment or activity.

### Presentation and privacy

Treat every outward projection as an allowlist. The A-native record's provenance refs are server-side bindings, not a JSON payload for a browser. Do not expose true producer/event actor IDs, hidden physical life, exact coordinates behind a permitted region, unseen inventory, physical signature values or source object hashes through labels, keys, URLs, ordering explanations, tool arguments, caption grouping or error messages.

G can show a short anonymous cue such as a left-side rustle, a known-name recognition qualifier and distinct last-seen/last-heard details. The data must let G show “Ada? Voice heard recently; last seen at the gate with a spear earlier” without using the newest timestamp for every chip. Candidate count/ambiguity is about this observer's considered learned candidates, not how many hidden people the backend knows exist. A bounded preview explicitly says more permitted candidates exist where relevant; it does not disclose their hidden identities.

An anonymous caption groups only through its permitted exposure/local-individual association. `PublicEvent.actorId`, source asset identity and equality of a private emitter cannot join captions. A speech bubble attached to a body requires a current admitted body/role relationship, separately from recognizing the voice. A transient display can remain readable after reception, but becomes a historical cue; its animation cannot preserve live hearing, tracking or an unseen speaker's activity.

Prepare only the role-specific handles actually needed for a permitted projection. Reuse the existing server binder and its world/timeline/control/audience/privacy fences. Revalidate after async work and before transmission/commit. Switching controlled bodies, observer timeline, authority or spectator scope retires inappropriate bindings and cached data. Authorized developer/world inspection is a different authority; it never silently feeds an ordinary actor's cognition or player controls.

## Scheduling, bounds and performance criteria

### Work and invalidation ownership

Extend existing physical/encounter preparation and ActorWork scheduling. No per-actor polling loop, new sensory message bus, universal graph traversal or separate AI scheduler is selected. Share immutable physical source/geometry preparation where B/C proves equality; keep each observer's reception, prior knowledge, recognition and current grants separate.

Invalidate only relevant work: physical source pose/profile/emission, observer pose/sense capability, B/C material/light/acoustic dependencies, source/observer body life, installed detector definition, selected Perception, eligible learned profiles and privacy/source changes. A name edit changes permitted presentation/subject revision, not sound propagation. An association correction changes recognition/notes, not original received signal level. A physical obstruction change can invalidate receiver samples, but a fresh summary need not recompute sight.

Retain active native sufficient state and indexes, including the source-complete Known-place label index above, before a dependent transition advances. Cold actor activation/restoration can prepare it through the existing bounded loader. A native cut cannot issue a synchronous history query or interpret a cache miss as no warning. Optional context/retrieval/consolidation is interruptible and can wait; required sensory/order work holds a coherent prefix when its existing native budget is exhausted.

Initial A work quanta are **64 physical contributions** per existing continuation slice and **128 exemplar comparisons** per recognition slice. These are proposed engineering scheduling sizes, not observed throughput, simulated time, listener caps or limits on an evidence set. Charge other operations through existing native accounting as their owners require. A slice retains original query/dependency scope and deterministic position; no partial candidate page establishes a unique identity. Do not install a second queue to enforce these quanta. If the existing owner cannot express the required continuation, extend that owner in PP02/PP06 and preserve an explicit required-work hold until available.

The [A limits inventory](../limits/perspective-perception.md) owns these quanta, bounded exemplars/credits, learning windows and candidate previews. Existing memory/history and native-work limits remain their owners. No total acquaintance count or total physically eligible listener cap is selected; that is an explicit growth dimension to qualify, not a claim of infinite capacity. Use conservative indexes and bounded resumable work, not a nearest-N rule that changes who could hear a sound.

### Conservative feature indexing

Store each observer's eligible exact exemplars under modality/family and usable feature masks in the existing recognition preparation/cache owner. A conservative numeric feature index may use interval/bucket ranges to find all candidates that could pass the world's maximum candidate distance. It may return false positives, never omit a potential best match or competitor. Filtering must consider the weighted mean over the actual mutually available dimensions; applying an all-dimensions distance rule before missing-feature handling can incorrectly exclude a valid match.

The initial correct fallback iterates that observer's bounded-per-individual exemplars in deterministic pages. It never scans all world beings, source assets or historical event bodies. Cache candidate preparation only under the exact observer identity/profile revision, received feature pattern, policy/ability inputs and privacy scope. Changing a name need not rebuild numeric physical features; changing profile support or forgetting does. Avoid caching a final “this source is Ada” result by hidden emitter ID.

Do not silently truncate candidate enumeration to the display preview. Continue matching until all possible competing local individuals are considered. Dense ambiguity can be returned as an explicit broad tentative result only if the completed computation actually establishes that result; incomplete work is not a guess. Required native consumers need only the completed A fields relevant to them; E may defer an optional expensive remembered-person inference while retaining an already completed anonymous detection, when no dependent rule requires identity at that boundary.

### Qualification workloads and pass criteria

PP07 records actual measured revision, environment, instrumentation and failures. The following are future workloads and operational criteria, not tests executed by this design task:

| Workload                                                                                        | Required observation                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Same source/observer interval as one advance, several smaller advances and repeated publication | Same detection crossing, acquired facets, source support, learning credits and final native state; only permitted optional presentation batching may differ.                                                                   |
| Strong cue while cognition/consolidation is delayed                                             | Native detection and required outcome inputs are available at the actual boundary without waiting for a provider; no extra reasoning request merely to classify.                                                               |
| 16, 64 and 256 sensing observers near 32 active emitters                                        | Count physical candidates, acquisitions, continuation slices, comparisons, queued optional work and p50/p95/tail delays; every eligible receiver remains represented or required work explicitly holds. No false-negative cap. |
| One observer with 32, 256 and 4,096 learned exemplars; ties at page boundaries                  | Complete candidate/competitor result, deterministic order and bounded per-slice work; do not declare uniqueness from an early page. Report total work growth.                                                                  |
| Add 1,000 then 100,000 irrelevant distant inert entities                                        | A's recognition/handle work does not enumerate them. B/C owns and separately measures conservative spatial selection.                                                                                                          |
| Grow cold eligible personal history from 1,000 to 1,000,000 source records                      | Routine native acquisition and evidence cuts use compact active state without hydrating that history. Exceptional correction/recall work is measured separately and remains fenced.                                            |
| Dense repeated equivalent cues versus distinct utterances                                       | Publication/render frequency adds no evidence or familiarity; legitimate distinct outcomes are not dropped by wakeup coalescing.                                                                                               |
| Cold activation/restore with active weak accumulation and source loss                           | Required native state becomes complete before advancing; same progress, grants, learning supports and outstanding continuations resume once.                                                                                   |
| Correction/forgetting during retrieval, consolidation and client projection                     | Stale outputs cannot disclose or recommit revoked evidence; report invalidation cost and recovery behavior.                                                                                                                    |

A native slice size does not prove wall-clock preemption or whole-world frame rate. Record the actual most expensive single physical evaluation and comparison, queue age/bytes, retained native/identity bytes, active-actor Known-place capsule count/bytes, complete index size, activation work and affected-entry invalidation work. If the required working set cannot be admitted within existing memory/native limits, surface the existing explicit preparation/hold failure. Do not simulate an unaware actor to hide overload. Once correctness and the stated growth risks are sufficiently qualified, stop optional stress expansion and integrate the useful gameplay cases.

## Body life, save and same-format restoration

Use SC02's `ActorLifeRef` at every bodily participant/cut/grant. The historical observer can retain experiences from an older physical life when the existing mind/control owner preserves that continuity. It does not follow that the old body can receive a new signal, carry a new condition or act on a current target. Replacement with the same actor ID but a different normalized `physicalLife` retires live body grants, active source/receiver exposure and old-life native continuations according to their owners.

A source death/removal can end emission and current bindings without becoming observer knowledge of death. A released impact or independent object can continue producing a physical effect after its actor dies. Its actual emitting object/location and original cause remain private; an observer learns the cause only through admitted evidence. A corpse's `remains.sourceId` is not sufficient recognition. Observed appearance, authored supported acquaintance or explicit later evidence may support a body association; otherwise preserve an unidentified body.

Historical “Ada was at the gate” may remain after Ada's body or entity disappears. A current remembered subject reference must not look up whatever new body currently has the same actor ID and return its hidden coordinates. Reincarnation/mind continuation applies only to the existing admitted player/body transitions; A does not broaden it to all NPCs or create afterlife rules.

Persist through the existing current-format state and `mind_recognition`, `mind_exposure_owners`, `mind_exposure`, `mind_awareness`, summary, correction/forgotten and source-version/summary-source owners. These tables are integration locations, not a mandate for an independent table for every notation type. The implementer chooses narrow columns/bodies through those current owners and updates their one schema/codec/validator path. No runtime migration, compatibility alias format or old-save converter is selected.

Save the actual needed state:

- Original permitted observations with source-relative facet ordinals, received features, intervals, original interpretation inputs, role/uncertainty and exact support links.
- Observer-local subjects/names, authored modality seeds with their installation ability and revocation eligibility, selected exact exemplars, bounded real learning credits and their original root/sample/encounter identities; the sufficient acquisition receipts, persistent last-credit/deadline state and source eligibility used by those records.
- Active channel/facet leases with original fact link, local working revision, latest permitted `value`, its `valueMeasuredFrom/Through`, `valueAcquiredAt` and separate `confirmedFrom/Through` availability interval; final retained confirmation capsules, actual support loss time, grace and weak accumulation progress/consumed prefixes under admitted policy and normal-clock conversion. Restore cannot substitute an old onset value for the saved latest sample.
- Existing native continuations and immutable evidence cuts with captured membership/value snapshots, exact body life and source-order context.
- Correction/forgetting overlays, lineage, owner revisions and the existing timeline/privacy authority required to prevent stale disclosures.
- Instantiated physical recognizability profiles under their physical owner, so restore performs no random regeneration or inference from current assets.

Current-format validation belongs at untrusted decode/install/publication boundaries, not repeated assertions in every trusted inner loop. Reject foreign-observer/world references, invalid subject variants, nonfinite/out-of-range profile fields or times, reversed intervals, nonexistent local ordinals, invalid family pins and impossible life/continuation relationships. Validate intra-source references without a self-hash and preserve exact external source kind/revision. A remembered facet may outlive its producer, but an active body grant must bind the currently valid life/support. Source-independent historical validity is not a reason to reject an otherwise valid saved memory of a removed person.

On restoration, establish current authority/timeline and load the required native working set before advancement; validate/rebuild disposable indexes from saved admitted state; reconnect continuations under existing lifecycle ownership; then project permitted views. Rebuilding an index does not acquire evidence or improve an old recognition with today's profile. Do not synthesize elapsed listening during downtime, rerun committed utterances, advance through an unobserved transient, recharge a familiarity root, retry a provider request automatically or reroll physical profiles.

Same-format save/restore should preserve semantic equality of permitted facts, native progress and next deterministic results. Byte-identical cache layout is not required. Body/control/privacy generations can legitimately invalidate old outward handles while the underlying permitted historical facts remain. G must obtain new valid bindings rather than preserve a stale live handle merely because it has the same printed name.

## Worked traces

These are exact design examples using hypothetical admitted inputs, not measured game results or new physical laws. Times below are simulation times unless explicitly labeled normal-speed seconds. B/C supplies the real physical observations; E/D/F/G choose their outcomes and presentation.

### Ada: old spear, fresh voice, no current position

At `t=100`, observer O first has a supported sight of Ada at the gate carrying a spear, with enough visual evidence to associate the person. The spear remains confirmed through `t=118`; the hand becomes obscured at `t=119`. The body remains visibly confirmed at the gate through `t=129`, before all sight is lost at `t=130`. At `t=160`, O receives a voice signal from an approximate region beyond a wall they actually know about; the learned voice match supports Ada, but sight remains unavailable. At `t=170`, O turns around. The same record can support “I heard Ada recently, but I do not know what she is doing now or exactly where she is.”

| Facet                     | Original time/support                                                                                                   | Meaning at t=170                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Person at gate            | Original direct sight at 100; last actual permitted location/body confirmation at 129 and supported visual association. | Last seen at the gate at 129; no current position supplied. The original onset FactKey still means 100. |
| Carried spear             | Original direct carrying relation at 100, independently supported item exposure; final spear confirmation through 118.  | Spear last observed at 118; neither later body-only sight, voice nor turn updates it.                   |
| Visual availability ended | Hand/detail support ends at 119; remaining body support ends at 130.                                                    | No current spear after 119 or live body target after 130. Episode grace does not extend either.         |
| Voice received            | Direct hearing at 160, original signal quality/limits and exposure.                                                     | Recent heard voice, now historical reception. Not a continuously speaking person.                       |
| Voice associated with Ada | Supported fallible profile inference formed at 160 using eligible prior familiarity and received features.              | “Ada's voice” or qualified recognition, according to result; no native emitter/body resolution.         |
| Bearing/region            | Permitted estimate measured at 160 from O's recorded position/orientation.                                              | Same old bearing/region at 170. It does not rotate with O or reveal Ada's present path.                 |

If the voice only weakly resembles Ada, the same detection/location remain while association is suspected. If it is a recording emitted there, the actual source of the audible signal can be the recording object; voice association alone does not establish Ada's current presence, life or activity. A heard name is a separate name claim. Summary, note retrieval and G's current prompt must reproduce these distinctions from structure without consulting Ada's current entity.

### Ambush and genuinely related weak cues

An unseen mover creates two C-admitted regional weak impulses, each `0.8` support, separated by `0.3` normal-speed seconds. With the selected decay of two units per normal-speed second, the first leaves `0.2` at the second reception; adding `0.8` crosses the threshold exactly. This produces an anonymous sound pattern and permitted direction/region. It may be classified footstep-like, with no assertion that a person definitely exists. If the impulses are `0.4` at the same cadence, the first decays fully before the next and the pair does not cross. Those numeric physical supports are illustrative C inputs; C must supply a justified ordinary-cadence example before claiming the actual footstep feature meets this behavior.

If the second cue belongs to an observed incompatible direction/pattern, do not combine it. Republishing the first cue contributes zero additional support. If one interval is evaluated in multiple steps, integrate only uncovered time. A strong crash admitted as immediate is acquired without waiting for another cue. E can choose to investigate, ignore or prepare from the anonymous cue; A does not require finding a culprit before it is useful. F uses the actual victim's already acquired cut and its own warning/preparation policy. The ambusher's eventual impact cannot provide prior warning for itself.

### A familiar voice behind a wall

The signal arrives with useful direction and identity features but without a visible body. If O has eligible learned voice exemplars and the match passes, record the association with original quality/support. Exact location is unavailable unless C actually provides it. “Behind that wall” additionally depends on O knowing the relevant wall/region; otherwise it is a muffled direction.

Detecting speech, understanding fragments, recognizing the voice, learning an individual pattern and knowing a name are independent. A known voice in an unfamiliar language or a supported nonverbal call can be recognized without words. Current low-margin same-language speech alone does not demonstrate that outcome under the selected quality mapping. An unfamiliar but clearly intelligible speaker remains anonymous. A prior known name can label a matched learned individual; merely hearing “I am Ada” cannot find the canonical Ada.

If the speaker is unbound, O may emit ambient “Who is there?” or use an ordinary permitted look/listen/movement action. No directed addressee, route endpoint or physical target is silently assigned from the private producer ID. A current visible stranger can still be addressed through a legitimate current body reference without needing a name or prior familiarity.

### Two similar-sounding strangers and an ordinary conversation

Two first-time voices are perceived from separately distinguishable source groups. Their received features are equal or too close. Their groups remain competitors; neither “sounds identical” nor private ID inequality/equality proves an individual association. Each hearing retains its fragments, direction and original time. A later high-quality distinguishing feature or unambiguous cross-sense observation can resolve selected facts; do not relabel the entire old transcript as certain.

For an initially unseen single distinguishable voice, retain a qualifying first anonymous exemplar. A second eligible utterance after an ordinary pause, within the world's seed window and at least its minimum learning interval later, can establish a fallible local voice pattern through complete conservative matching. Name and canonical association can remain unknown. Continued genuinely new qualifying samples at the bounded rate can reach familiarity during the same useful conversation. Leaving and returning grants no extra allowance. The character can voluntarily label the learned voice “the helpful stranger,” but naming is not a learning prerequisite.

If an unobserved imitator later matches that pattern and there is no permitted competing evidence, the observer can misrecognize the voice. That is a recorded belief, not the engine swapping the physical person. Subsequent contradiction or evidence can split an association. Existing facts retain their original uncertainty and source; correcting one guess does not delete the sound or make a social apology automatically succeed.

### A person disappears, returns differently, or dies

A clear sight initially supports a body, its actually exposed detail and whatever individual recognition is justified. Passing behind an occluder ends live grants immediately. Return within grace can preserve the episode's continuity but reacquires only newly supported facets. Return after grace can still match eligible learned features; a new place, coat or carried object neither guarantees nor prevents recognition by itself. An obscured face prevents unavailable facial features, while gait/other supported B features may or may not suffice under the declared family.

If the source dies unseen or a new physical life replaces it, O's memory is not updated with that hidden fact. Old-life current target/effect grants end under lifecycle ownership; eligible historical memory persists. A corpse found later requires its own observed association. If a legitimately retained mind recognizes someone from an old life, keep the original observer/body/measurement provenance while issuing only new current-life grants under the current owner.

### A rustle with no identified producer

Wind, an object, a small creature or an unseen person can produce a supported rustle family. O receives a direction with broad spread and no distinguishing individual features. The acquired detection is real; source-kind remains a hypothesis, and producer count/type can remain unknown. Do not create a hidden “unknown person” Entity or a remembered person pad to store it. Existing exposure/native continuation and ordinary personal memory are sufficient.

Repeated related rustles can justify a regional pattern. A danger warning about that area can be independently acquired testimony without a named danger. E may choose a safer route or inspect the region, and G can present a useful cue without a red target silhouette. A completed careful search might later support a bounded negative report under E's actual search contract; merely hearing nothing more does not prove the area safe.

## Acceptance matrices

These are **future implementation/qualification requirements**, not executed tests. PP07 maps the cases to the smallest meaningful existing native/server/storage/browser checks and to actual ordinary play. Keep mechanics, privacy, persistence and human usefulness evidence distinct. Every row requires the stated result through the real producer/consumer path relevant to that row; a serializer fixture alone cannot qualify sensing, and fluent model text alone cannot qualify structured truth.

### Acquisition, recognition and play

| ID     | Situation / input                                                                                                                          | Required result                                                                                                                                                                                                                                                     | Work             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| PP-A01 | Unknown rustle, no producer classification support.                                                                                        | Detected sound with permitted time/sense/location/limits; no person existence, canonical ID or invented name.                                                                                                                                                       | PP01–PP02        |
| PP-A02 | Footstep-like pattern with uncertain source kind.                                                                                          | Native inference stays qualified; useful anonymous contact need not denote one definite producer.                                                                                                                                                                   | PP01–PP02        |
| PP-A03 | The accumulating/decaying impulse pairs above, plus C's actual ordinary-cadence case.                                                      | Exact crossing only for compatible sufficient input; physically unsupported cadence remains undetected.                                                                                                                                                             | PP02, C          |
| PP-A04 | Identical supplied physical evidence, with a continuous support interval processed whole, partitioned, overlapped or repeatedly published. | Same progress, crossing time, meaningful acquired facts and credits; A/render publication frequency gives no advantage. B/C separately qualifies its physical measurement schedule; genuinely different received samples are not falsely declared identical inputs. | PP02/PP06, B/C   |
| PP-A05 | Strong immediate cue while optional AI work stalls.                                                                                        | Native detection and required consumer evidence at the actual boundary, no model prerequisite.                                                                                                                                                                      | PP02/PP05, E     |
| PP-A06 | Real fleeting sight/sound is not experienced.                                                                                              | No reconstructed eyewitness fact; a later report is testimony. Incomplete required evaluation instead holds.                                                                                                                                                        | PP02/PP06, B/C   |
| PP-A07 | Clear first unfamiliar speech.                                                                                                             | Actual words may be known; voice, individual and name remain separate; no canonical first-voice grant.                                                                                                                                                              | PP03, SPK        |
| PP-A08 | Preserved familiar timbre with unavailable language/nonverbal words.                                                                       | Recognized voice without lexical understanding through a supported producer; current low-margin-only limitation respected.                                                                                                                                          | PP03, C/SPK      |
| PP-A09 | Two ordinary separated unseen utterances qualify for initial learning.                                                                     | Stable local voice pattern, no canonical identity/name or rapid-submission/repeated-visit requirement.                                                                                                                                                              | PP03             |
| PP-A10 | Sustained conversation versus leaving/returning and duplicate delivery.                                                                    | New samples learn at the same bounded rate; shared time can reach familiarity; replay/presentation adds no credit.                                                                                                                                                  | PP03             |
| PP-A11 | Similar learned voices, competitor on a later page, equal vectors.                                                                         | Complete distinct-individual comparison; ties/near candidates stay ambiguous. No private ID tie-break.                                                                                                                                                              | PP03/PP07        |
| PP-A12 | Several exemplars for one individual, including two- and three-feature matches.                                                            | A person's exemplars neither compete against themselves nor suppress its valid reliable-stage exemplar.                                                                                                                                                             | PP03             |
| PP-A13 | Broad remembered interval, precise current sample.                                                                                         | Pair quality preserves remembered uncertainty; no narrowing/averaging into a perfect fingerprint.                                                                                                                                                                   | PP03             |
| PP-A14 | Unknown imitator matches a familiar pattern.                                                                                               | Fallible association can be wrong; true body/source unchanged, no hidden uniqueness oracle.                                                                                                                                                                         | PP03/PP05        |
| PP-A15 | Brief first qualified glimpse, body seen before usable face detail, changed clothing/context, or obscured/ambiguous first sight.           | One body-supported visual sample learns one local profile; later recognition uses prior permitted features. Insufficient evidence stays unresolved; no old-subject lookup by private body ID or credit from polling/time alone.                                     | PP03, B          |
| PP-A16 | First-seen unnamed person versus unbound heard voice.                                                                                      | Visible stranger has legitimate current address/body roles; unbound voice allows ambient clarification without hidden targetId.                                                                                                                                     | PP03/PP05, SPK/G |
| PP-A17 | Heard self-introduction and duplicate names.                                                                                               | Name claim/label only; no canonical lookup or subject merge by name.                                                                                                                                                                                                | PP03, SPK        |
| PP-A18 | Player/animal/NPC have equal physical permissions but different capabilities.                                                              | Same admitted cue, appropriate capability-specific retention; no human autobiography or AI call required for animals.                                                                                                                                               | PP05, C/E/G      |

### Fact time, history and association

| ID     | Situation / input                                                                                                                                   | Required result                                                                                                                                                                                                                             | Work               |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| PP-A19 | Ada gate/spear/voice trace.                                                                                                                         | Independent original times; hearing does not refresh unseen equipment, activity, location or life.                                                                                                                                          | PP01/PP04/PP05     |
| PP-A20 | Observer turns/moves; an observed room later rotates or relocates.                                                                                  | Historical world-frame bearing stays at original pose/time, not attached to today's body/room transform.                                                                                                                                    | PP02/PP05, B/G     |
| PP-A21 | Visibility gap inside grace and longer gap outside it.                                                                                              | Immediate live-grant loss in both; correct episode continuity within grace and independent learned identity after either.                                                                                                                   | PP02–PP03          |
| PP-A22 | Later identification of a formerly anonymous clue.                                                                                                  | Append supported association; preserve original time, limits and uncertainty without wholesale transcript rewrite.                                                                                                                          | PP03–PP04          |
| PP-A23 | Wrong association corrected/split; namesakes.                                                                                                       | Selected evidence/notes retain provenance; no automatic merge from a guess/name or entity swap.                                                                                                                                             | PP03–PP04          |
| PP-A24 | Contradictory witnesses, retraction and copied rumor.                                                                                               | Attributed claims coexist; known shared lineage is not independent support, unknown common origin is not magically disclosed.                                                                                                               | PP04–PP05          |
| PP-A25 | Heard assertion, currently supported written-account inspection/old letter or reported clock reading; copied memory when its producer is installed. | Receipt/authenticity proves expression/source experience only; not intent, claim truth or recipient eyewitness history. Do not implement a new memory-copy power to qualify the ordinary source path.                                       | PP01/PP04          |
| PP-A26 | No identified danger, but a permitted regional warning.                                                                                             | Useful identity-free danger belief; E/F choose action/eligibility, no hidden attacker required.                                                                                                                                             | PP05, E/F          |
| PP-A27 | Hot Awareness adaptation and cold hydration of the same source.                                                                                     | Equal typed meaning/source family/revision/times/association, not just equal flattened prose.                                                                                                                                               | PP04               |
| PP-A28 | Nested summaries plus raw-source aliases.                                                                                                           | Original fact deduplication and separate times/contradictions; no extra witnesses/credits from copies.                                                                                                                                      | PP04               |
| PP-A29 | Source outside resident tail/raw recall window.                                                                                                     | Native required state and retained acquaintance correct; actor recall and authorized history keep distinct eligibility.                                                                                                                     | PP04/PP06          |
| PP-A30 | Source exceeds existing summary/request envelope.                                                                                                   | Retain/continue or explicit supported failure; no silent essential-fact loss or invented completion.                                                                                                                                        | PP04/PP07          |
| PP-A31 | Perception/profile improves; old observation revisited.                                                                                             | Separately recorded later inference if selected; original acquisition and credits unchanged.                                                                                                                                                | PP03–PP04          |
| PP-A32 | Optional history/media read-aloud; actual familiar recording when a physical recording family is installed.                                         | UI replay/synthesis acquires nothing. A supported physical replay preserves original learning roots and cannot prove live speaker presence; that subcase is gated on its C/SPK producer rather than requiring new recording gameplay for A. | PP03–PP05, C/SPK/G |

### Authority, ordering, invalidation and recovery

| ID     | Situation / input                                                                | Required result                                                                                                                             | Work             |
| ------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| PP-A33 | Source IDs embedded in native episode keys, events or assets.                    | None leaks through handles/captions/model context or decides individual matching/continuity.                                                | PP01/PP05        |
| PP-A34 | Partial source/detail visibility and an exact hidden coordinate.                 | Only allowed fields/precision leave the server; no full-object fallback, hidden point or source-attached bubble.                            | PP01/PP05, B/C/G |
| PP-A35 | Nested recordEvent callback and delayed awareness insertion.                     | One compact acquisition, original order retained, acquired membership exact; no duplicate learning or reordered effects.                    | PP01/PP06        |
| PP-A36 | Same-time/sequence cuts and older occurrence acquired later.                     | Frozen memberships differ correctly; timestamp/order alone never backfills. Due unfinished required work holds.                             | PP01/PP06, F     |
| PP-A37 | Own impact produces injury/startle evidence.                                     | Evidence enters subsequent cuts only; original pre-impact facts do not include their own effect.                                            | PP01/PP05, D/F   |
| PP-A38 | Forget/correct during summary, recall, note edit or client preparation.          | Source aliases and current privacy/authority fence stale completion; no resurrected identity or body grant.                                 | PP04–PP06        |
| PP-A39 | Prepared outcome loses eligibility/authority before commitment.                  | Existing owner discards/reprepares; a historical cut is not edited or reused as fresh authority. Committed physical results are not undone. | PP05–PP06, D/F   |
| PP-A40 | Same actor ID/new life, unseen death, unidentified corpse.                       | Old-life live grants end; old facts retain provenance; private replacement/death/remains link gives no knowledge.                           | PP03/PP06        |
| PP-A41 | Save during weak progress, between learning samples or after native acquisition. | Restore preserves progress/receipts/facts, resumes once, does not reacquire or reroll.                                                      | PP06             |
| PP-A42 | Native cut before personal serialization; source-owned local facets.             | Synchronous native reference; non-cyclic stored ordinals and external containing revision.                                                  | PP01/PP04/PP06   |
| PP-A43 | Summary/awareness/memory IDs overlap across source families.                     | Exact kind/ID/revision selects the owner; no hash-to-number coercion or counter substitution.                                               | PP01/PP04        |
| PP-A44 | Observer/control/timeline change and stale handles.                              | Fenced projections and operations; no cross-observer local-key joins or restored stale target.                                              | PP05–PP06, G     |
| PP-A45 | Required work exhausted, cold state missing or family unsupported.               | Explicit hold/continuation/unsupported result, never absence, zero threat or false unique recognition.                                      | PP02/PP06/PP07   |
| PP-A46 | Growth workloads in the performance section.                                     | Complete required semantics, bounded resumable work and honest latency/memory evidence; no all-world/all-history hydration per cue.         | PP07             |

### Precision cases for learning and continuing observation

| ID     | Situation / input                                                                                                                                                  | Required result                                                                                                                                                                                                                                                                                                                                               | Work                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| PP-A47 | Qualifying unknown samples at normal times 0, 1 and 2 seconds, with a unique compatible seed and no observed competitor.                                           | The early sample at 1 adds hearing but neither credit nor a competing equivalent seed; samples 0 and 2 promote one local pattern and append its immediately usable association. Original detection/results remain unchanged.                                                                                                                                  | PP02–PP03           |
| PP-A48 | One qualifying voice sample independently bound to a seen subject, then one conservative matching voice after an ordinary pause with no current sight.             | Eligible two-sample promotion can establish that subject's voice familiarity without a second visible meeting. The subject-bound seed is not its own competitor; no body/equipment refresh or duplicate credit.                                                                                                                                               | PP03, B/C           |
| PP-A49 | Authored name alone, explicit authored learned/familiar modality, later real credits, and forgotten authored support restored from save.                           | Name alone grants neither modality. Authored learned equivalence is one for sight or two for voice; familiar is six. Declared exemplars, max-based familiarity, bounded selection and revocation survive restore without fake samples.                                                                                                                        | PP03/PP06           |
| PP-A50 | An unchanged visible spear is confirmed over many evaluations; its hand then disappears before the rest of the body.                                               | One bounded live lease per facet advances actual confirmation without changing old FactKeys or writing each frame. Ended spear/body capsules retain their separate last-confirmed times even when no departure story row is written.                                                                                                                          | PP01–PP02/PP04/PP06 |
| PP-A51 | A cut captures live confirmation, then the lease advances, ends or a later hearing arrives; validate it later and after restore, then revoke its original support. | Its owning snapshot resolves the captured value/interval/reference without the latest lease revision; ordinary advancement/loss preserves historical eligibility. Actual source correction/revocation still rejects stale use, and current action grants remain separate. No later lookup adds support.                                                       | PP01/PP06, F        |
| PP-A52 | Familiarity support/exemplars are evicted; the last-credit deadline or a repeated original learning root is encountered after restore.                             | Persisted rate and indexed source receipts prevent early/replayed credit. Required missing receipt preparation holds; no all-history scan, unbounded duplicate registry or SQL inside a cut.                                                                                                                                                                  | PP03–PP04/PP06      |
| PP-A53 | A note falsely says “Ada still has the spear”; response or reflection also proposes structured current equipment.                                                  | Attributed note prose may be mistaken. Both publication paths reject unsupported promotion to direct/current evidence; accepted structured reassessment has an installed form and exact support.                                                                                                                                                              | PP04–PP05           |
| PP-A54 | A newly recognized utterance has speech/detail before its same-source association.                                                                                 | Earlier facets bind the exposure or an eligible prior association; later local ordinals supply the new association with no forward support cycle or containing-body self-hash.                                                                                                                                                                                | PP01/PP04           |
| PP-A55 | A continuously visible person moves through changing permitted point samples.                                                                                      | Bounded current location updates without a durable point per poll; captured/final positions retain their own measurement time, never a claim that the final point held for the entire visibility interval.                                                                                                                                                    | PP02/PP04/PP06, B/G |
| PP-A56 | Boundary-quality first sight/voice, poor first voice seed and clear second utterance; changed ability after authored installation.                                 | At default ability, sight quality .55 retains observation while .575 can learn. Minimum-ability voice promotion needs pair quality .65; a clear second utterance cannot rescue poor first support. Authored installation retains admitted ability; restore never rechecks it against changed ability. Distance/competition and replay rules remain unchanged. | PP03/PP06           |

### Ordinary usefulness and distinctive play

PP07 also requires uncoached human use of the feature's ordinary scenarios: recognize an unnamed returning helper; make a worthwhile choice from a rough cue; compare partial witnesses; respond to an unseen voice; separate recent hearing from older equipment; and repair a mistaken attribution through actual social conduct. Record what the player understood and did, where information helped, and where it produced busywork or false certainty. Do not grade only avoidance of leaks. Partial knowledge should be useful without a detective interface, compulsory notes, constant confirmations or an AI thought for every ambient cue.

## Exact shared source revisions

SC02 preserves the exact representation of each existing source owner:

```ts
type EvidenceRef = {
  [F in ExistingEvidenceFamily]: Readonly<{
    observer: ActorLifeRef;
    family: F;
    id: string;
    revision: ExistingEvidenceRevisionByFamily[F];
  }>;
}[ExistingEvidenceFamily];
```

`ExistingEvidenceRevisionByFamily` describes real adapter versions; it is not a runtime registry or counter. Stored personal-account, `CurrentMemorySource` and `RetrievedMemory` bodies use exact string digests. Other adapters retain their owning native representation; native versions are not universally numeric. `ExperienceSummary.revision` is a distinct local integer and cannot replace the personal body's digest. Preserve the underlying storage kind in the opaque adapter identity when shared `memory` covers both memory and summary. Equal bare IDs from those stores are not the same source.

The complete first-family revision map is fixed below. These are documentation aliases to the actual primitive/source contracts, not cross-layer runtime imports or a new registry:

```ts
type ExistingEvidenceRevisionByFamily = {
  awareness: string;
  memory: string;
  'action-result': string;
  'private-condition': string | number;
  'native-exposure': number;
  'native-response': number;
};
```

| Shared family       | Exact owning source and selected adapter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `awareness`         | Existing personal-account body revision, exposed by `RetrievedMemory.revision` / `CurrentMemorySource.revision`: exact string digest. Bind underlying `awareness` storage kind and ID.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `memory`            | The same exact personal-account string revision for the owning `MemoryRecord` or `ExperienceSummary` body. Bind underlying `memory` versus `summary` explicitly; the summary’s local numeric revision is not this digest.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `action-result`     | The existing action-experience owner’s permitted committed `ActivityOccurrence.outcome/view` result snapshot, separate from its mutable running progress. That baseline has no content revision; the selected native adapter uses the existing `contentLabel(canonicalJson(capturedPermittedResult))` string convention and exact canonical-body validation, as native perceived-event appraisal evidence already does. Store the immutable required result under its existing result/receipt owner, binding occurrence/result identity. The content label is not a collision-proof hash or authority without that body/identity check. A later personal result has its separate exact personal-source alias. |
| `private-condition` | Preserve `AppraisalCause` condition/disposition `sourceVersion: string` where that process supplies the fact. A native status/contribution adapter instead preserves actual `StatusEffectInstance.contribution.revision: number`, with its episode/definition/life. The opaque binding retains the private source-role discriminant; a number and string are not interchangeable. A missing required version is unsupported, not zero.                                                                                                                                                                                                                                                                        |
| `native-exposure`   | A’s selected immutable acquired contribution has local numeric content revision starting at 1; only admitted correction advances it. A facet-confirmation role uses its existing lease’s local numeric working revision and resolves against the exact captured payload. They have distinct bound roles, not one episode-wide source version. These small fields are PP01/PP02 additions to existing owners, not claims of delivered baseline fields.                                                                                                                                                                                                                                                         |
| `native-response`   | A distinct response fact, if emitted, requires an immutable permitted contribution and local numeric content revision starting at 1 under the existing native response owner. The inspected baseline has no such content revision. The initial sensory-cause path uses `native-exposure`; `proposalGeneration`, route revisions and episode phase are never substituted. A consumer cannot request a separate response fact before that owning adapter is implemented.                                                                                                                                                                                                                                        |

All native adapters retain resolved immutable payloads required by a cut/source binding. Exact-body checks use those bounded captured bodies and current eligibility, not a replay of lifetime history or today's hidden source. Required local source/version fields are implemented with their owning producer, codec and validator; no implementing agent needs to choose another revision scheme.

Revisions from different owners are not numerically comparable or interchangeable. Attach the containing source revision outside its canonical body, with local facet ordinals inside. This integrated correction resolves SA-D02 without changing observation permission, acquisition ordering or cut membership. Dependent PP01 implementation remains unstarted; it no longer waits for a revision-representation design decision. The selected [SA-D01](../maintainers/decisions/characters-and-evidence.md#sa-d01--psychological-fear-for-controlled-characters) authored native controlled-player policy remains separate, with exact profile rules and qualification owned by emotional physiology.

## Implementation sequence and consumer contracts

[PP01–PP07](../maintainers/perspective-perception.md) contains the execution checklist and exit conditions. Follow one admitted source end-to-end through current channels rather than adding isolated types while old projections remain active. Begin current-format persistence with the first new owner field. Then add detection/recognition policy, faithful memory/consolidation, consumers and whole-path qualification. Recheck the actual development base before editing: source inspection used the exact contracts commit, not delivered implementation of the integrated B/C/E designs.

| Owner                       | A hands over                                                                                                              | Required return / remaining owned design                                                                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B — vision                  | Facet leases, source/interval refs, received features, recognition capability and original observation frame.             | Finite physical identity features/ranges/normalization/weights and received fidelity, masking/light/occlusion loss, detail/precision, actual sample or constant-feature intervals and loss boundaries. A owns learning/matching; B owns rays and available features. |
| C — acoustics               | Detection/accumulation, anonymous contacts, voice sample/quality, original-root receipts and lexical/identity separation. | Actual emission/receiver coverage, propagation, direction uncertainty, material/fidelity mapping, producer versus cause, ordinary-cadence weak example and genuine continuous duration. No hidden clean profile in A input.                                          |
| D — fear/startle            | Original acquired facts and source/body-life refs.                                                                        | Actual native effects and supported effective Perception changes through the common attribute owner; no A condition stack or automatic emotion. Forgetting does not reverse committed bodily effects.                                                                |
| E — attention/investigation | Same current/remembered facts for all receptors, meaningful-change intake and incomplete/negative limits.                 | Cue relevance, native/AI response, ordinary investigation/stopping and honest negative search with actual area/time/opportunity coverage. Useful uncertainty needs no named target.                                                                                  |
| F — surprise/preparedness   | Actual-victim acquired cuts, separate fact times, anonymous region warning and current-body grants.                       | Warning/preparation relevance, expiry/generalization and surprise. No after-impact warning, hidden attacker or timestamp-only membership.                                                                                                                            |
| G — player experience       | Audience-scoped facts/roles, original frame/time, live/remembered state and preview completeness.                         | Readable cue duration/layout, ambiguity, accessible presentation, stale-grant clearing and ordinary actions from allowed direction/region. Camera/admin truth and hidden source attachment remain unavailable.                                                       |
| SPK / voice media           | Local/canonical participants, voice versus words/name, exact listener evidence and summary manifest.                      | Same subject union throughout speech/introductions/captions/memory. Local-contact directed calling, recording/relay and timed phrases need their actual selected command/physical contract. UI synthesis acquires nothing.                                           |
| Final integration           | Required pair/tracker, world policy/limits, existing-doc reconciliation and repertoire scope.                             | Use the integrated exact source adapters and producer contracts; preserve unrelated product/runtime gates and the shared owners of central navigation/priorities.                                                                                                    |

No in-scope product question is left for the implementer to guess: ordinary acquisition, familiarity, names, claims, fact freshness, current permission, retention and correction have selected rules. B/C's physical inputs and E/D/F/G choices are explicitly owned dependencies. Initial numerical tuning is selected and revisitable under PP07, not empirically qualified. Source-local directed calling, complete disguise/illusion, natural long-term memory decay, recording/magic media and broader NPC life continuation remain separately selected extensions; contrast examples do not make them A delivery commitments.

## Maintained records

- Feature and repertoire scope: [feature specification](perspective-perception-feature-spec.md).
- Implementation and delivery: [PP00–PP07](../maintainers/perspective-perception.md); shared coordination [SAD-A / SAI-A](../maintainers/stealth-awareness.md).
- World choices and restrictions: [base perception/recognition](../worlds/base/perception-recognition.md), [A limits](../limits/perspective-perception.md), [policy review triggers](../maintainers/revisitable-policies.md).
- Persistent ownership: [events/perception/reactions](../events-perception-and-reactions.md), [perceived events](../perceived-world-events.md), [memory](../memory-architecture.md), [identity/references](../identity-and-references.md), [knowledge](../knowledge.md), [hearing/speech](../hearing-and-speech.md), [base knowledge](../worlds/base/knowledge.md).
- Speech integration: [SPK feature](speech-and-social-perception-feature-spec.md), [SPK technical design](speech-and-social-perception-tech-design.md), [SPK work](../maintainers/speech-and-social-perception.md).
- Exact integrated representation: [SA-D02](../../archive/05-project/open-decisions.md#sa-d02--evidence-source-revision-representation); the separate authored native controlled-player policy is selected in SA-D01.

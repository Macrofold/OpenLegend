# Persistent appraisal and character-owned social continuity — technical design

**Status:** approved and implemented for this project’s scope; [verification](../verification.md#foundation-priorities-15--implementation-evidence) records evidence and limits. [Feature specification](appraisal-social-continuity-feature-spec.md) owns behavior; [ACT07/ACT08 delivery slices](../maintainers/actor-model.md#priority-5-implementation-slices) own implementation and evidence. CR owns accepted mind/knowledge publication, EPR owns intake, P1 provides typed owner conventions and P4 bounded dependencies. This project does not replace any of those authorities.

The source audit and staged sequence below retain the design baseline. Current behavior is in the linked canonical owners; focused trackers record completed delivery and separate parent work.

## 1. Source audit and discrepancies to reconcile

Inspected main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041`:

| Current implementation                                                                                    | Consequence for this design                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [social.ts](../../packages/domain/src/social.ts): `appraiseEvent`, `activeAppraisals`, `establishKinship` | Reuse this appraisal/kinship boundary. Current appraisals are damage-derived fear/discomfort, keyed by feeling/target, fixed linear decay and strongest-16 retention. General continuity is not implemented.         |
| [world-record-schema.ts](../../apps/server/src/world-record-schema.ts): `mind_appraisals` keyed by `id`   | Current Appraisal has no `id`; the record encoder falls back to list position. Introduce real stable identities and migrate references; do not add a duplicate appraisal table.                                      |
| [knowledge.ts](../../packages/domain/src/knowledge.ts): `editKnowledge`                                   | Subject notes already own full-text replacement, expected revision, character limits, tombstones and current evidence checks. Reuse them for directional relationship text.                                          |
| [CognitionMaintenance](../../apps/server/src/cognition-maintenance.ts): `reflect`                         | Reflection already resolves supplied references and passes knowledge/name/goal edits through `publishInnerWorld`. Add optional typed appraisal changes at this publication boundary rather than another harness.     |
| [mind.ts](../../packages/domain/src/mind.ts): old document/facet types                                    | Typed facets such as relationship/appraisal are not permission to revive a second writable relationship/feeling authority. Preserve required legacy provenance while routing current meaning to the accepted owners. |

The [memory architecture](../memory-architecture.md) now explicitly places assessments of other people in actor-owned subject knowledge; About me is self-understanding. Older domain README/social comments about inner-world relationship ownership must be reconciled during implementation. Current save policy permits checked in-place upgrades despite older rejection-only wording. Neither discrepancy warrants resetting character history.

## 2. Ownership and code structure

Keep native appraisal state and policy validation in `social.ts` or split a focused `appraisals.ts` only when implementation size justifies it. Base-world labels, thresholds and source mappings belong under `worlds/base/`, registered through the existing admitted manifest/family boundary. Core code owns stable identity, valid references, revisions, lifecycle and protected disclosure—not a fixed universal emotion list.

`knowledge.ts` remains the only writer for external subject notes. Kinship remains `establishKinship` and its objective native records. Operational obligations remain the current commitments/agency owners. A relationship view is a read projection with an exact document revision, never a stored independent biography, sentiment field or graph edge that can be edited separately.

`WorldService` coordinates current authority, source validation, native transactions and after-commit invalidation. Existing repositories persist appraisal records, accepted text/source versions and notes. Existing reflection scheduling/execution/reservation/accounting remains unchanged except for its optional output extension. No IO, provider calls or wall-clock queries enter the domain.

Planning envelope: approximately 1,500–3,500 production logic lines across native appraisal policy/state, current record migration, source/privacy integration, accepted publication and permitted views. ACT07.1 refines this estimate from actual readers and source-referrer paths before implementation. Broader emotion language quality, arbitrary mental effects and CR/EPR redesign are excluded.

## 3. Policy and instance schema

Use an exact installed appraisal definition/policy pin. A definition declares applicable actor capabilities, supported cause kinds, qualitative label or optional typed intensity scale, source binding, stacking policy, allowed lifecycle operations, relevance/notification bands and bounded recurrence. Definitions may use native reviewed implementations only; prose or a new JSON key cannot add a cause evaluator.

Proposed instance shape:

```ts
interface AppraisalInstance {
  id: string;
  actorId: string;
  revision: number;
  definitionPin: DefinitionPin;
  targetRef: ActorSubjectRef | null;
  cause: AppraisalCause;
  stackKey: string; // computed by the admitted owner, not arbitrary caller authority
  state: 'active' | 'resolved' | 'invalidated';
  value: { kind: 'qualitative' } | { kind: 'scaled'; value: number; scalePin: DefinitionPin };
  lifecycle: AppraisalLifetime;
  createdSimTime: number;
  lastChangedSimTime: number;
  sourceVersion: string;
}

type AppraisalCause =
  | { kind: 'perceived-event'; evidenceRef: PerspectiveSourceRef }
  | { kind: 'remembered'; evidenceRef: MemorySourceRef; recallEpisodeId: string }
  | { kind: 'condition'; conditionRef: NativeConditionRef; episodeId: string }
  | { kind: 'disposition'; policyPin: DefinitionPin; opportunityId: string }
  | { kind: 'authored'; authorizationReceipt: string; sourceRefs: readonly SourceRef[] };

type AppraisalLifetime =
  | { kind: 'persistent' }
  | { kind: 'expires'; atSimTime: number }
  | { kind: 'decays'; policyPin: DefinitionPin; anchorTime: number; anchorValue: number }
  | { kind: 'condition-sustained'; conditionRef: NativeConditionRef; episodeId: string }
  | { kind: 'recurring'; processRef: string };
```

Names are internal design notation; reuse existing pin/source/reference types instead of creating parallel ones. Every source ref includes the owning actor/audience, source identity and version/epoch needed by the current data model. A canonical world event ID by itself is not proof that the actor perceived it. Remembered testimony stays testimony; imagination remains imagined. Target references may identify remembered/retired subjects without granting recognition or current action targeting.

New persistent definitions have no implicit decay. A numeric scale is optional and family-defined; qualitative labels never acquire fabricated values. Existing native fear/discomfort retains its explicitly pinned linear-decay behavior during extraction. Changing that policy for existing actors is a deliberate definition transition, not a hidden side effect of migration.

## 4. Native admission and cause lifecycle

Add a closed optional update union such as create from a permitted cause, reinforce/reframe with expected revision, resolve and invalidate. Do not expose unrestricted replace-whole-appraisal-store or raw target-state paths. The server supplies actor, source bindings, current authority/timeline and permitted subject map. The native owner validates applicability, definition pin, expected revision, typed value/scale, source eligibility and bounded stacking.

For observed causes, resolve actor-private perspective/awareness and verify the source remains eligible. For remembered causes, use actual supplied recall and its current version; do not treat opening a memory page as a new event. Enduring conditions reference a native owner and episode, with no manufactured external occurrence. Disposition policies must be explicitly installed: free-text personality descriptions remain descriptive until a supported rule selects them.

Stack identity is derived from actor, policy, supported cause episode and target/aggregation group. Repeated processing of the same cause and update ID returns its receipt or no-op; it cannot create another active feeling. A new independent cause either creates a new supported instance or contributes to a family-declared aggregate. Do not allow a caller to remove another source by guessing its stack key. Reframing changes interpretation/current state and provenance, not the immutable source occurrence.

Resolve/invalidate keeps a revisioned lifecycle outcome and required history. Repeating the operation is idempotent; an older create or reinforcement cannot resurrect a later resolution. A later genuinely supported recurrence uses a new admitted opportunity/episode and links its predecessor explicitly rather than reusing a stale command.

The first two unlike new consumers are persistent event/memory-linked grief and an internal condition/disposition-linked state. They share source/revision/lifecycle protection but not a compulsory numerical curve or event-only source. Existing fear/discomfort is the compatibility consumer. These are opt-in world/demo policies; no claim is made that every character with kinship must experience a particular feeling.

## 5. Time, randomness and bounded persistence

Persistent inert instances have no periodic native or paid task just to remain active. Fixed expiry and supported decay use simulation-time deadlines/band boundaries through existing scheduling. Native reads may calculate current value from a saved anchor and pinned curve, but a read does not mutate the anchor, emit evidence or consume RNG. Persist meaningful transitions and required next deadline, not a rewritten record every display frame.

When a decay policy crosses a meaningful notification band, its owner emits one transition under saved episode/hysteresis state. Reading at different frequencies cannot change crossing count or lifetime. Pause and restart do not advance simulation time or grant unrequested offline catch-up. No generic “all feelings decay each hour” loop is introduced.

Internal randomized opportunities use the world's saved RNG at explicit ordered native opportunities, with a saved opportunity identity and next phase/deadline. A failed/duplicate proposal does not reroll. Do not add RNG draws to ordinary perception/context queries or alter existing wilderness draws during extraction. A policy capable of repeated generation must satisfy P4's positive-time, burst, live-state and descendant bounds; a new record ID cannot reset its allowance.

Separate durable cardinality from hot context/working-set limits. Do not replace the old strongest-16 truncation with a new arbitrary silent eviction of persistent feelings. Resolved history and inactive unchanged records can remain cold in current repositories; active queries are scoped and paged. An admitted policy states its aggregation/live-work bound. Storage or work exhaustion yields an explicit pending/rejected appraisal update while retaining the underlying evidence and existing active state, never silent emotional amnesia or a fabricated successful appraisal. Native damage/survival still commits through its own required owner; optional appraisal interpretation cannot block it waiting for inference. A mechanically coupled required effect must reserve its complete envelope before its own admission.

Any deferred appraisal intake uses existing EPR durable evidence/cursors and bounded pending work, not an unbounded second queue. An unavailable optional interpretation is not assumed complete. Actual storage failure uses the existing persistence error boundary. Partial hydration must use the data owner's explicit completeness contract so saving a working subset cannot delete unseen canonical appraisal rows.

## 6. Accepted reflection and response integration

Add optional `appraisalChanges` to the existing reflection schema, prompt, decoder, Macrofold adapter output and publication call as one coordinated change. Default is empty. The model receives only supplied appraisal/subject/source handles and current revisions; it does not choose canonical identities, define new world policies or request another actor's emotional state. It may propose a supported self-appraisal/reframe/resolution under the installed policy, including uncertain subjective interpretations.

The current `CognitionMaintenance.reflect` already builds a prepared actor context, resolves `knowledgeChanges`/`nameChanges` and calls `publishInnerWorld` through `WorldService.transition`. Extend that exact path and its source-version/timeline fencing. Revalidate current evidence, notes/appraisals, obligations, actor capability and authority after generation and inside the publication transaction. A successful provider run is not successful game publication.

For reflection, validate the complete changed-output set before publishing coupled self-understanding, note/name/goal/appraisal changes and receipt. A stale or invalid coupled proposal retains prior accepted state; do not commit text claiming an appraisal was resolved while silently rejecting that resolution. Existing immediate response operations may retain their independently receipted dependency semantics; this project does not rewrite them into a new all-or-nothing response protocol. A future immediate appraisal operation must explicitly use those existing dependency/fulfillment contracts.

Accepted About me remains free self-understanding, not an authoritative mirror of all appraisals or social notes. Model context adds a permitted native appraisal projection sourced from its current revision and supplies relevant subject knowledge through the existing section/attention path. Avoid duplicate sections or rewriting About me every time a native intensity changes. Generated prose alone never mutates a native emotion, protected obligation, goal or inventory.

Reflection is optional. Native persistent appraisal and permitted manual knowledge editing work with no provider credentials. Current workspace publication's PostgreSQL/provider prerequisites remain honest; this project does not claim SQLite provides an unavailable accepted-workspace service. Native state/notes and save tests can cover both database adapters; accepted workspace publication requires its actual supported adapter and separately authorized live quality checks.

## 7. Directional relationship projection and edits

A relationship view is `{actorId, subjectRef, knowledgeDocumentRevision, text, sourceVersion}` from the actor's current subject knowledge. Reuse `editKnowledge`'s full replacement and expected revision, code-point limits, source evidence and empty revisioned tombstones. Do not add a `relationshipText` copy, mandatory relationship field, sentiment score, categorical friendship tier or reciprocal update.

Subject notes may include practical facts and mixed feelings; the system must not require another generation call to extract a “pure relationship.” The initial social view displays the accepted permitted note, with its subject binding and revision. A later shortened/search projection must remain explicitly derived and stale-safe, and cannot become the target of independent edits. Existing invention graph readers may link these source-bound views for authorized inspection; the graph never owns their content or access rights.

Use existing observer/encounter tokens and document-only references. A retained note about an absent/dead subject remains editable under the current knowledge contract, but its reference does not make that person visible, recognized on re-encounter or targetable. Revalidate bindings on delayed output. Same-name matching and raw canonical IDs from a model are not acceptable substitutes.

Objective kinship comes from its native record, and perceived knowledge of it still follows disclosure. Group membership and commitments remain separate; no text phrase creates/removes membership, repays a debt or changes parentage. Changes to Ada's note about Bo invalidate Ada's social/context view only, not Bo's note or everyone's relationship graph.

## 8. Privacy, correction, forgetting and retention

Native appraisals are owner-private by default. NPC creator inspection uses existing explicitly authorized access; human-private appraisals, causes, notes, summaries, counts and derived embeddings are not exposed to a creator merely through world ownership. Public expression requires an actual speech/action/native-expression source with its own permitted audience. P2 scopes cached views and delayed publication; P4 supplies source/authority invalidation.

Bind current appraisal/knowledge queries to source eligibility and correction/forgetting revisions. Current `activeAppraisals` only filters direct cause IDs; the new multi-cause contract must also handle memory summaries, condition-derived private sources and accepted prose. Introduce reverse source-referrer lookups in the existing data/erasure owner where needed, not an independent privacy ledger.

Use the current conservative forgetting rule unless complete provenance proves safe selective retention. Invalidate affected appraisal instances, derived views/context/embeddings and pending publications; clear the relevant accepted mind/knowledge/recognition through their current owner when required. Clearing presentation alone is insufficient if a private cause remains queryable. Preserve minimal non-disclosing revision/receipt tombstones needed to prevent stale recreation under the approved retention policy.

Do not reconstruct forgotten historical cause text from a definition, private debug artifact or retained save. A currently valid independent native condition may later generate a new appraisal from its own source, but it must not inherit the erased identity, quotation or explanation. Source correction invalidates unsafe dependent use; a new subjective interpretation may be admitted without the engine enforcing one psychologically “correct” feeling.

Ordinary history compaction is distinct from erasure. An appraisal may retain an authorized compact cause/perspective reference after raw history becomes cold or summarized, with coverage honestly described and lineage/source versions preserved. It cannot claim verbatim recall whose source was not retained. SL restore reapplies current forgetting/access overlays before any mental projection is served.

## 9. Storage, migration and restoration

Extend existing `mind_appraisals` record codecs with stable ID, actor, revision, policy pin, lifecycle, source identity/version, stack identity and deadline/query columns consumed by this feature. Keep complete family payload within its owned record; do not split every qualitative value into an EAV table. Add actor/current-state, source-referrer and due-deadline indexes only for actual queries. Do not create another appraisal table beside the current canonical owner.

Migrate each current record deterministically from actor, retained cause/key and source position as necessary for collision-safe stable identity. Preserve actual current intensity/anchor/time and explicit existing decay; do not reset fear at upgrade time. Register the native compatibility policy pin. Validate source/target references and retain unresolved/forgotten distinctions without inventing missing observations. The old strongest-16 cap may already have discarded records; report that historical coverage limitation rather than reconstructing nonexistent appraisals.

Changing current array/list storage to keyed records, if chosen, requires a checked source-revision migration of `world.appraisals` and its record IDs. Avoid positional identity on future sorting/removal. Scope the conversion through WorldRecords/upgradeWorldState and preserve one writer, source checksums, receipts, unrelated state and exact definitions. Unknown shapes fail before replacing the current world.

Do not migrate inner-world prose into subject notes by parsing names or opinion keywords. Current subject knowledge remains canonical; any older duplicated relationship facet/file requires an explicitly reviewed source-to-subject mapping and preservation of original provenance before retiring its writable role. This is migration work, not an invitation to delete unrecognized character text.

SL00 capture includes appraisal state/IDs/lifecycle, policy pins, permitted compact cause lineage, explicit recurrence/opportunity state, subject note revisions/tombstones and accepted source versions. Restore validates completeness, rebinds current timeline/authority, applies current privacy overlays and rebuilds due/source indexes. It must not re-appraise every past event or rerun generation. Removing a definition uses INV/EWF retirement: retain pins needed by active/history/save references or perform an explicit supported transition; do not silently resolve all feelings to make removal easy.

## 10. Dependency, UI and performance integration

The owner emits semantic change keys on creation, meaningful value/lifecycle/source transition and note revision. EPR04/common intake creates owner-private evidence where applicable; it does not broadcast feelings through ordinary spatial audience logic. A record's continued presence generates no repeated wake. P4 acknowledgment prevents a newer internal cause from being cleared by an older reflection completion.

Use existing actor inspection/owned-character panels and knowledge editors. Display an appraisal's permitted qualitative label, optional authored scale, persistence/status and useful cause coverage, not raw hidden entity IDs. Keep editable relationship text in the existing subject-note editor with stale-revision feedback. A read-only social card links to that owner rather than adding a competing edit form.

Cognition receives relevant appraisals and subject notes under existing context budgets, preserving complete accepted About me, required evidence, conversation and protected obligations. Page/filter by actor and actual relevance before expensive text/vector work. Native ordinary animals do not enter this path simply because they are living actors. No per-frame full appraisal/social scan, no per-tick paid call and no provider request merely to inspect a card.

## 11. Delivery and acceptance evidence

[ACT07.1–ACT07.7 and ACT08.1–ACT08.4](../maintainers/actor-model.md#priority-5-implementation-slices) sequence actual baseline/caller audit, stable policy/state, cause/lifecycle execution, accepted publication, privacy, persistence and qualification, plus directional subject views and objective-fact separation. Basic native persistence uses current semantic change hooks; complete P4 and live reflection are not circular prerequisites.

Required native/manual fixtures: old damage fear/discomfort trace; persistent grief across quiet time; one internal condition/disposition source; repeated evidence/recall deduplication; meaningful decay bands where explicitly configured; unrelated objective kinship/obligation; two conflicting directional notes; retired/unrecognized subject; duplicate/stale publication; forgotten/corrected source; save/restart/restore during a pending proposal; many persistent records with bounded context; and missing provider support. Use actual domain/query/publication callers, not only schema examples.

Compare saved IDs/source pins/intensity/time before and after migration, and verify no repeated native RNG draw or paid admission on passive reads. Inspect current network/context/creator payloads for human-private causes and counts. Exercise both native database adapters, and the actual supported accepted-text adapter separately. Record runtime evidence in Verification and current behavior in Architecture; preserve ACT/CR/EPR/SL remaining gates and default no-automated-suite instructions. Live characterization quality remains a separately capped, explicitly recorded evaluation, never inferred from fixtures.

## 12. Decisions and rejected alternatives

Rejected: mandatory decay, universal emotional axes, event-only causes, strongest-N deletion of meaningful persistent state, inference from arbitrary trait prose, hidden paid appraisal loops, a second social graph store, mandatory relationship labels, interpreting free prose as native effect authority and retrospective recreation of lost/forgotten evidence.

Proposed choices are one extended current appraisal owner with stable source-aware identity, policy-defined lifetime/scale, actor-owned subject notes, current accepted publication and conservative privacy invalidation. There is no unresolved product decision blocking these foundations. Additional world vocabularies, clinical claims, compulsion and social/economic laws are not implied by this design.

## Maintained records

- Implementation: [Feature tasks](../maintainers/agent-agency.md).
- Limits and constraints: [Feelings and social continuity inventory](../limits/feelings.md).

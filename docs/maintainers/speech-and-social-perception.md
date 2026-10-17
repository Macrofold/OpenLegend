# Speech and social perception work

## Status and ownership

**Selected design complete; runtime implementation has not started.** This tracker owns the implementation of ordinary ambient/directed speech, reliable recipient awareness and recognition, complete permitted experience, shared natural presentation, dialogue without membership, uniform freeform AI availability and animal acoustic responses. Design-document review is recorded under SPK00. All runtime acceptance remains unchecked until supported by actual evidence.

Design owners: [feature specification](../projects/speech-and-social-perception-feature-spec.md) and [technical design](../projects/speech-and-social-perception-tech-design.md). [Feature scenarios SP-A01–SP-A28](../projects/speech-and-social-perception-feature-spec.md#acceptance-scenarios) are the behavior acceptance owner; reference them rather than duplicating their scenario table here. Current cross-project contracts remain in [Hearing and speech](../hearing-and-speech.md), [Narration and conversations](../narration-and-conversations.md), [Memory architecture](../memory-architecture.md) and the bundled world's [Knowledge](../worlds/base/knowledge.md).

Limits: [Narration](../limits/narration.md), [Hearing](../limits/hearing-and-speech.md), [Memory](../limits/memory.md), and the reused [Cognition](../limits/cognition.md) / [Native work](../limits/native-work.md) inventories. An accepted design is a target. It does not establish runtime delivery, measured model quality, capacity, human enjoyment or permission for paid trials.

The source-reviewed baseline is `Macrofold/OpenLegend`, GitHub `refs/heads/main`, `465ace1e8d7ee94a267e762d2d93970de17b2ed0`. Before implementation, reconcile the actual selected development base and refresh affected callers. Do not treat the source-owner map as proof that later code has no additional consumers.

## Design disposition and existing work

The selected ordinary-speech/social-perception slice of [ND16](needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) is **Done — designed** through this pair and SPK00–SPK11. Broader propagation, new language/voice/timed-speech/waking and optional media remain with their existing decision/work owners. This project does not close the entire ND16 entry.

- [NC05–NC06](narration-and-conversations.md) retain the evidence of the old implementation, while their ordinary enrollment/merge requirements are superseded by SPK05. NC14–NC17's delivered compaction, retention and source-integrity foundations remain useful; removing membership must preserve those guarantees.
- [HE01–HE04 / HE05](hearing-and-speech.md) retain delivered hearing/history/caption evidence and the broader unperformed qualification. SPK changes selected addressing, naming, receiver eligibility and new consumers; it does not mark existing dense, accessibility or provider acceptance complete.
- [CR12](cognition-redesign.md) and [CE05 / DG02](character-experience.md) consume the new experience/recognition/animal behavior. Their whole-life, later-consequence and live behavioral acceptance is broader than this project.
- [DG18 / PS04](product-scalability.md#ps04--coherent-scenes-and-limited-attention) consumes ordinary speech without membership. Optional attention/crowd/background mechanisms retain their own designs and implementation status.
- ND19/DG23's transformation, conditional ND20/DG04 evaluation, remote/private communications, World Agent/provider sessions, independent cooperation and unrelated correction policy are unchanged in scope. Never close them because a shared speech primitive is designed.

## Execution order

Use the same semantic owner for a mutation, its dependent updates and its derived invalidation. Current producer/consumer/schema changes form one current-format contract; do not publish a mixed interpretation of the old and new target fields. Internal checkpoint commits can be unfinished if labeled, but no stage may be called delivered while a required caller or storage path still uses the replaced meaning.

| Work  | Depends on                                      | Deliverable and acceptance boundary                                                                |
| ----- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SPK00 | This design task                                | Cross-linked selected design, reconciled owners and executable task breakdown.                     |
| SPK01 | SPK00                                           | Single-address speech occurrence and truthful per-observer evidence.                               |
| SPK02 | SPK01                                           | Installed direct-address and reliable-recognition rules with separate names.                       |
| SPK03 | SPK01–SPK02                                     | Shared participant, speech presentation and complete model-evidence projection.                    |
| SPK04 | SPK01–SPK03                                     | Full structured memory, typed lineage, cold recall and faithful consolidation.                     |
| SPK05 | SPK01–SPK04                                     | Ordinary dialogue without membership and bounded source-owned preparation.                         |
| SPK06 | SPK01–SPK02, SPK05                              | Consistent player admission and ambient/directed NPC speech.                                       |
| SPK07 | SPK01–SPK03                                     | Memory-independent sound intake, permitted sensory records and bounded opportunities.              |
| SPK08 | SPK07; shared current action/AI contracts       | Animal choices execute and finish through existing cognition/native action owners.                 |
| SPK09 | SPK03, SPK05–SPK06                              | Coherent composer, captions, history and accessibility.                                            |
| SPK10 | Starts with SPK01; completes across SPK01–SPK09 | Current-format persistence, authority, late-result and receipt integrity for every changed record. |
| SPK11 | SPK01–SPK10                                     | Integrated behavior, privacy, recovery and workload qualification with reconciled final status.    |

SPK10 is a cross-stage obligation, not permission to postpone serializers or validation until after new records ship. SPK07 can run alongside the membership/UI work after shared evidence/presentation is stable. Coordinate writes to shared speech, cognition, records and schemas explicitly.

## SPK00 — Complete the selected design and reconcile its owners

- [x] Capture Mike's decisions: one optional addressee; audible receipt without sight; stable recognition separate from names; no ordinary enrollment or semantic reply field; NPC ambient/directed choice; shared no-AI gate; quiet labels without the middle dot; full experience distinct from presentation; and animal hearing/reactions now.
- [x] Inspect the current producers and downstream perception, memory, consolidation, context, UI, availability, animal and recovery consumers; distinguish defects/old behavior from accepted targets.
- [x] Produce distinct feature/technical files, concrete stages, owner mappings, field meanings, privacy boundaries, failure behavior, trial tuning and scenario acceptance.
- [x] Reconcile affected canonical docs, UI guidance, limits and existing trackers; keep useful history and broader unresolved work rather than closing whole parent projects.
- [x] Finish complete affected-diff review, internal-link/anchor checks, new-separator check and changed-document formatting; commit every task-owned documentation change through the authorized repository workflow.

**Documentation evidence, October 17, 2026:** reviewed the complete affected documentation diff and reconciled the paired design, canonical owners and trackers. All 288 newly added relative links resolve, including their anchors; added lines contain no middle-dot character. All 22 changed documents pass the repository's Prettier 3.6.2 configuration. SP-A01–SP-A28 are defined and mapped to implementation work. These are documentation checks only; runtime scenarios, live model behavior and performance have not been exercised by this design task. Task changes are committed on `codex/speech-perception-design-20261016`.

**Exit:** the implementation can follow the selected contracts without inventing product decisions or interpreting display text as memory. The final design check closes only SPK00, not any task below. This task contains no runtime or paid-model verification requirement.

## SPK01 — One authoritative utterance and observer-specific speech evidence

**Owners:** [kernel](../../packages/domain/src/kernel.ts), [speech](../../packages/domain/src/speech.ts), [events](../../packages/domain/src/events.ts), [experience](../../packages/domain/src/experience.ts), [response](../../packages/domain/src/response.ts), current domain command/type/schema owners, server event/history projections and protocol. Contract: technical design §§3–4.

- [ ] Make a speech event's required actor the speaker and optional target the single intended addressee. Absence means ambient. Remove the speech-specific duplicate `intendedRecipientId` from commands, events, awareness and every current reader; no alias, fallback reader or parallel schema remains.
- [ ] Validate a selected reference through existing observer/current-control and target-kind admission. Preserve a valid intended target independently of whether it hears; refuse an invalid target without retargeting or converting to ambient. Keep occurrence-time origin, exact accepted words, delivery, order and request identity.
- [ ] Calculate acoustic contact for eligible senses independently of memory, language and speaking ability. Commit the occurrence and all required observer evidence atomically; actual audience is derived from permitted exposure, never from selected target or social membership.
- [ ] Store full permitted speech roles, exact heard segments/gaps, acquisition, intelligibility and available participant identities/labels under the existing experience owner. Preserve self-authored speech distinctly from hearing others and seen-only speaking cues distinctly from heard addressing.
- [ ] Derive response triggers, relationship labels, text/index content and entity-reference projections from one shared role selector. Do not let a producer independently write contradictory addressed/overheard/ambient facts.
- [ ] Reconcile every command constructor, response converter, event emitter, receipt/fingerprint, history projection, debug consumer and current validator using the actual source search. Update corresponding generated/runtime schemas together.
- [ ] Exercise the actual downstream paths for SP-A01–SP-A06 and SP-A28, including listeners hearing different fragments and a target that cannot hear. Verify exactly one utterance and one permitted observer/event record, with no partial committed audience.

**Exit:** the event and every observer record have one unambiguous direction meaning; missing hearing never becomes remote delivery and visual cues never gain unheard words. SPK10's applicable persistence and authority checks must already hold for these new records.

## SPK02 — Addressing, recognition and names through installed world policy

**Owners:** [base knowledge policy](../../packages/domain/src/worlds/base/knowledge.ts), the current authored knowledge definition/configuration, domain perception/knowledge, [entity references](../../apps/server/src/entity-references.ts), [knowledge context](../../apps/server/src/knowledge-context.ts), [recall](../../apps/server/src/recall.ts). Contract: technical design §§2, 4–5; canonical bundled-world knowledge owner.

- [ ] Install the selected simple rule: a linguistic recipient who detects directed speech knows it addresses them without sight or a minimum understood-word requirement. Keep hearing/comprehension/recognition as separate facts. Withhold unknown third-party recipient identity while preserving directed-other meaning.
- [ ] Establish the canonical person association at first supported sight/voice exposure and reuse it later, including first unseen/zero-word human calls, independently of prior familiarity, encounter-token continuity, learned name, nickname, subject note or completed exchange. Reuse current observer knowledge/reference ownership; do not create a second identity registry.
- [ ] Keep recognized unnamed individuals distinct in memory, optional recall, summaries and model handles; shared permitted descriptions or local ordinals can disambiguate otherwise identical display labels. Remove name-dependent grouping that collapses different recognized people; duplicate labels must not merge identities.
- [ ] Learn self-introduction claims only from permitted understood words and the supported source association. A recognized unseen speaker can be associated without a visibility-only rejection; never leak a generated annotation's unheard name or authoritative private name.
- [ ] Separate a valid speech/communication reference from a currently visible physical-action target. No recognition lookup grants exact hidden position, current possessions or reach. Source disappearance can leave history valid while making a new action invalid.
- [ ] Preserve correction/forgetting and observer-label behavior through the owning mutation and current-format restore. A later name can improve current presentation without rewriting the original utterance or historical name knowledge.
- [ ] Exercise SP-A03–SP-A08, SP-A15 and SP-A24 using a returning unnamed person, duplicate names, a known unseen voice and a materially different capability profile.

**Exit:** characters can recognize whom they are dealing with and know when they are addressed while remaining ignorant of facts they have not learned. Recognition is a selected world rule consumed consistently, not hard-coded human/world behavior in every layer.

## SPK03 — Shared natural presentation and complete model evidence

**Owners:** [language package](../../packages/language/src/index.ts), [domain narration](../../packages/domain/src/narration.ts), speech/experience presentation selectors, server perceived-event/response/recall preparation and protocol view models. Contract: technical design §6 and the feature's presentation examples.

- [ ] Implement the shared participant-role and quotation operations in the technical design. The input is an already permitted structured experience plus explicit perspective/name policy/render purpose. These functions perform no world lookup, memory mutation, authorization decision or provider call.
- [ ] Produce semantic speech view parts shared by captions, personal logs, person history and accessible text. Components own layout/density; they do not duplicate the combinatorial speaker/addressee logic. Personal account uses I/me naturally; caption/control perspective can use you.
- [ ] Preserve literal quotations, embedded pronouns, punctuation, line breaks and markup-like characters safely as text. Participant grammar never rewrites quoted words. Unknown/unnamed/forgotten identity and partial/no-word speech receive explicit truthful wording, never IDs or fabricated content.
- [ ] Expose complete task-permitted structured `ExperienceEntry` meaning to models with opaque, permitted participant/source handles. Optional shared prose accompanies that source; it never replaces it. Keep server-only authority bindings private without stripping meaning, units or uncertainty.
- [ ] Update attention, response generation, appraisal, knowledge editing, compaction, consolidation, recall and Narrator preparation consuming the same experience together. Model prompts explain self/addressed/overheard/directed-other/ambient directly instead of asking a model to infer them from prose.
- [ ] Audit affected text builders and remove redundant attribution/role logic. Keep rendering caches derived and revision-dependent; never add a second writable memory/display record as the new source of truth.
- [ ] Exercise SP-A12–SP-A14 and SP-A28 through different surfaces and model-preparation consumers, including `Ada said to me: “…”`, unchanged pronouns inside quotations and no middle-dot separator.

**Exit:** one permitted experience has consistent natural wording across surfaces and retains its full semantics in AI input. An implementer cannot fix a missing-role bug solely by improving a display sentence.

## SPK04 — Complete memory, recall and consolidation with exact provenance

**Owners:** [domain experience](../../packages/domain/src/experience.ts), [records](../../packages/domain/src/records.ts), [memory repository](../../apps/server/src/memory-repository.ts), [memory consolidation](../../apps/server/src/memory-consolidation.ts), [cognition maintenance](../../apps/server/src/cognition-maintenance.ts), recall, source dependencies and embedding preparation. Contract: technical design §7.

- [ ] Make the complete existing tagged experience required in retrieved/maintenance source preparation. Remove lossy handoffs that select only the generic memory projection, including native no-database paths; optional scores and text stay derived.
- [ ] Persist and hydrate the complete observer-permitted payload equivalently in hot and cold storage before active retention trims it. Preserve source kind, native ID, actor/world partition, exact source revision and current status. Update indexes and current serializers/decoders atomically.
- [ ] Replace untyped summary source-ID lists with the selected typed source-reference collection and exact revision semantics. Update all summary creation, edit, invalidation, protected-source, commitment/appraisal dependency, editor-entry, recall and restore consumers; no compatibility alias remains.
- [ ] Supply the summarizer complete selected sources and optional shared prose. Validate native coverage and current revisions; preserve protected originals in full. Invalid, unavailable, incomplete or oversized output leaves prior records intact with truthful failure and no automatic paid repair.
- [ ] Implement the required native-derived attribution manifest on experience summaries and automatic speech compaction, with exact indexed coverage, deterministic equivalent-role grouping, atomic publication and bounded source expansion. Models receive it structurally; a missing/stale/oversized optional manifest makes that summary unavailable, not text-only. Keep multi-utterance summaries derived and source-linked rather than attaching one misleading speaker/target pair. A particular claim’s who-to-whom, permission/commitment, knowledge attribution or action reason requires bounded original-source preparation before final model work; group-level roles do not attach themselves to every summary sentence. Unavailable exact attribution stays unavailable. Later recall can access retained original experience where needed; it cannot hydrate raw world truth to fill missed words or missing roles.
- [ ] Derive embedding text from full permitted source meaning, including meaningful roles/acquisition. Preserve exact required-source paths when similarity ranking/indexing is unavailable; no embedding is not no memory.
- [ ] Respect existing correction, forgetting, retention, source revision and generation rules through summary lineage and caches. Do not create a new automatic historical rewrite or expand the owner's no-cascade policy.
- [ ] Exercise SP-A07–SP-A08, SP-A14–SP-A15, SP-A26 and SP-A28 through actual PostgreSQL cold/reload and maintenance boundaries. Demonstrate the original recipient survives consolidation and later recall without relying on display prose.

**Exit:** the complete remembered event remains usable after every selected storage/summary boundary, with faithful scope and traceable derivation. No source shape is quietly downgraded on a less common reader.

## SPK05 — Ordinary dialogue without membership

**Owners:** [domain conversations](../../packages/domain/src/conversations.ts), events/response/current world state, [conversation context](../../apps/server/src/conversation-context.ts), memory repository, WorldService/HTTP, AiDirector/ActorWork, [reply previews](../../apps/server/src/npc-reply-preview.ts), narration/history/protocol/client consumers. Contract: technical design §8 and its complete removal checklist.

- [ ] Replace ordinary active-group context with actor-scoped, snapshot-bound selection before hydration: required current causes, a bounded useful exact recent suffix, valid optional summary coverage and older relevant evidence through scoped recall. Do not reinterpret all lifetime speech as required input.
- [ ] Adapt existing compaction to exact selected-source coverage without a social group key. Preserve source ordering, retention, privacy, current revisions and protected originals. Optional old summary/compaction failure cannot block a valid decision whose essential evidence fits; required-source failure stays explicit.
- [ ] Keep complete retained history accessible through existing actor/person-scoped paging. UI grouping and person-history filters are presentation/query choices, never proof of participation, hearing or consent.
- [ ] Replace membership-based inference ownership with exact thinking actor, source event(s), request/component, world/timeline/control generation, evidence revision and native publication dependencies. A new unrelated utterance must not cancel all pending decisions.
- [ ] Preserve conservative provisional-reply hearing/attribution and exact request/component reconciliation. Provisional words remain viewer-private and never become events or memories before final admission. Canceling inference removes its preview, not committed speech.
- [ ] Remove ordinary join/leave/merge transitions, auto-enrollment, one-active membership, inactivity/disconnect membership cleanup, membership notices, state/indexes, API controls and all former permission/response gates. Search secondary debug, cursor, narrative, save and bootstrap consumers before declaring removal complete.
- [ ] Preserve World Agent/provider session conversations and independently owned commitments/cooperation. Remove no independently accepted duty, physical action or legitimate narration provenance merely because its source speech used an ordinary Conversation ID.
- [ ] Introduce no authoritative semantic `replyTo`, replacement conversation graph, hidden time-gap boundary or deterministic consent inference. Keep operational triggering-source links explicitly distinct from meaning.
- [ ] Exercise SP-A10–SP-A11, SP-A17–SP-A18, SP-A25–SP-A27, including intersecting exchanges, late replies, irrelevant long history and independent cooperation after panel closure.

**Exit:** ordinary conversation works as people speaking/hearing/choosing, with complete useful evidence and bounded preparation, while every former membership-dependent consumer has a safe actual replacement.

## SPK06 — Consistent player admission and NPC speech choices

**Owners:** application freeform admission in HTTP/WorldService/AiDirector, native-command wrappers and receipts; [cognition contracts](../../apps/server/src/cognition-contracts.ts), provider schemas/decoders, entity references, response admission. Contract: technical design §§3 and 9.

- [ ] Centralize the server-owned availability decision used by ambient Speak, Speak-to and freeform Act, including current authority, installed capability, usable provider/configuration and existing allowance/operational conditions. Busy and unavailable remain different; no paid probe or generated explanation is required to compute availability.
- [ ] Apply it before new player freeform work is committed through every supported entry point, including direct requests and alternate menus. Existing deterministic actions retain their own availability; the shared application rule is not a universal physical law about vocal cords.
- [ ] Recover an identical admitted request's receipt before evaluating availability for a new operation. Keep an uncertain send's identity and draft until reconciled; known unavailability rejects new work without automatic retry or send on recovery.
- [ ] Preserve a committed utterance and actual listener evidence if later AI work fails. Report the computer's failure plainly without inventing a character reply, deliberate silence or second utterance.
- [ ] Make NPC talk's addressee nullable consistently in local types, provider JSON schemas, partial/final decoders, reference binding and native admission. Null is ambient; a non-null reference must be permitted. Never substitute a prior interlocutor.
- [ ] Preserve valid no-talk outcomes and independently valid response components. A character may continue work or make an admitted nonverbal choice; an HTTP chat caller must not force spoken text solely to have a reply.
- [ ] Exercise SP-A09 and SP-A16–SP-A18 through actual server admission, request recovery and provider result parsing. Use valid fixture outputs for wiring; do not call fixture selectivity live behavioral evidence.

**Exit:** all player freeform speaking/acting paths agree about AI availability, and NPCs can freely choose ambient or directed speech or no speech with exact receipt behavior.

## SPK07 — Hearing without human memory and coalesced sound opportunities

**Owners:** domain acoustics/perception/speech/events/experience, current world/profile/body/spawn/record owners and [ActorWork](../../apps/server/src/actor-work.ts). Contract: technical design §10's sound and opportunity definitions; animal values in the hearing limits inventory.

- [ ] Bind the narrow installed animal-response profile through one authoritative current definition pin. Use it for starting animals, creator-spawned animals, body construction, sensing, schema validation and offerings; do not copy species rules into unrelated engine/client/server branches.
- [ ] Remove memory/speech/inner-world eligibility from physical hearing. Ordinary nonlinguistic animals receive listener-local intensity/margins/bearing and legitimately associated visible source evidence, with no words, addressee relation, private name or exact hidden source position.
- [ ] Reuse one observer/event Awareness record with the selected sensory-retention class and absolute simulation expiry. A linguistic listener may have sound and speech in that record. Speech must not emit a duplicate sound event solely to wake an animal.
- [ ] Route existing supported acoustic emissions through the shared typed intake, with speech as the production emitter and a non-speech native fixture proving reuse. Do not make every impact/footstep/scenery object emit a newly invented sound.
- [ ] Keep unexpired sensory evidence available to the actor's immediate context while excluding it from autobiographical memory, embeddings, consolidation and inner-world/editor APIs when those capabilities are absent. Record every admitted occurrence without new arbitrary listener or utterance clipping.
- [ ] Use the exact shared sector/null/elevation projection, detection-relative intensity bands and active-signature set comparison from the technical design, including lower-inclusive boundaries, independent fixed event expiry versus renewed signature idle expiry, and the existing coalesced ActorWork ticket. Repetitions update occurrence/coverage facts without entering a duplicate generic new-memory/new-speech wake path. Save considered opportunity identity/expiry and acknowledge only the captured snapshot.
- [ ] Apply shared source/byte/operation limits before hydration or partial commitment. Preserve required causes, count honest grouped coverage, and expose deferral/backpressure when complete required work cannot fit; prompt limits are not sensory-retention limits.
- [ ] Exercise SP-A19, SP-A22, SP-A24–SP-A26 with memory/cognition/speech capability contrasts, repeated two-source chatter, a meaningful changed sound, expiry, restore and dense fan-out.

**Exit:** an eligible memoryless body hears faithfully and supplies useful bounded decision evidence without human language, lost occurrences, duplicate events or one paid opportunity per repeated sentence.

## SPK08 — Animal decisions that execute and finish

**Owners:** ActorWork/AiDirector, decision/context/response preparation, installed action offers/native admission, [base bodies](../../packages/domain/src/worlds/base/bodies.ts), [base animal behavior](../../packages/domain/src/worlds/base/animal-behavior.ts), current active-action/movement/cancel/results owners. Contract: technical design §10's shared preparation and native continuation.

- [ ] Admit configured cognitive native animals through current participant/capability indexes and scheduling. Remove the relevant minds-roster, memory and NPC-controller assumptions; retain player-control exclusion and one owned outstanding opportunity. No second animal provider, queue or spending policy.
- [ ] Branch shared preparation before constructing a human mind or long-term recall. Supply body condition, authored disposition, current activity, visible surroundings, permitted sensory evidence and actual available physical choices. Omit unavailable speech/inner-world/knowledge output components.
- [ ] Implement the narrow installed hold/escape bridge specified by the technical design using ordinary action validation, active-action ownership, replacement, cancellation and results. Ordinary move owns approach/retreat. Provider proposals carry no hidden coordinates, arbitrary path or remote actor authority.
- [ ] Enforce one movement writer. Advance the exact admitted animal response without allowing routine wandering or another action to move the same body concurrently. Respect life/incapacitation, clearance, action priority and existing attack protection.
- [ ] Continue makes no new physical intervention; hold stops interruptible locomotion and expires; finite approach/retreat finish under normal navigation; escape uses permitted observed-position or bearing evidence, clearance-aware steering and finite calming, including when trapped.
- [ ] Equivalent repeated speech does not renew sound-linked flight automatically. A new chosen response requires a valid opportunity/admission. Existing attack-triggered escape remains separately effective; speech alone does not mark an attacker or deterministically set fear/flight.
- [ ] Preserve ordinary native movement/body/wandering during AI outage. Distinguish deliberate continuation, no offered choice, invalid output, uncertainty, cancellation and unavailable inference; none is fabricated as a spoken or emotional reaction.
- [ ] Exercise SP-A19–SP-A24 and SP-A26 through actual movement, obstruction, active-action interruption, lifecycle and restore. Qualify contrasting dispositions/content-independent animal acoustics using the evidence tiers in SPK11.

**Exit:** supported animals can choose a plausible response to sound and the body's action actually happens and ends; no human autobiography, scripted universal flight or parallel locomotion service is required.

## SPK09 — Composer, captions, logs and accessible speech history

**Owners:** protocol and server view/perceived-events/person history; client text controls, action menu, [conversation UI](../../apps/client/src/ui/conversation.tsx), [speech captions](../../apps/client/src/speech-captions.tsx), [world events](../../apps/client/src/ui/world-events.tsx), [memory history](../../apps/client/src/ui/memory-history.tsx) and reply-preview rendering. Contract: technical design §9 and feature presentation examples.

- [ ] Right-click Speak-to selects one visible permitted person; expose and allow clearing that target in the composer. Ambient mode has no inferred recipient. Remove join/leave/merge and active-membership UI while preserving useful person selection/history.
- [ ] Bind drafts to the existing owner/world/timeline/mode/target scope and exact submitted draft revision. Retain valid text on rejection and uncertain sends without moving it to another actor/target; keep IME, keyboard, focus and selected-person behavior consistent.
- [ ] Render directed text at the speaker with a quiet label outside the quotation and an equivalent accessible phrase. Unseen voice display uses existing non-spatial/bearing presentation, never hidden body anchoring. No middle-dot separator is introduced.
- [ ] Use shared semantic speech view parts for natural personal logs and other read modes. Preserve role-aware I/me/you wording, known-vs-unknown labels, partial words, readable times and safe literal text. Display DTOs contain only viewer-permitted facts.
- [ ] Preserve chronological/source-key paging, stable row/preview reconciliation, reading position, control-change clearing and no replay of old captions on history load/reconnect. A name update does not change utterance identity or restart its caption lifetime.
- [ ] Display the same server availability reason across Speak/Speak-to/Act and prevent automatic sends when it changes. A later failed AI decision does not erase confirmed player speech or create fake NPC silence.
- [ ] Exercise SP-A02–SP-A06, SP-A12–SP-A13, SP-A16–SP-A18 and SP-A28 through real UI surfaces, keyboard/assistive labels, narrow/zoomed layouts and overlapping captions. Reuse existing visual/accessibility cases where they cover these changes; broader HE05 qualification remains separately tracked.

**Exit:** the player can choose whom to address and read what happened without seeing schema fields, misleading private identities or social membership controls.

## SPK10 — Current-format persistence, authority and exact recovery

**Owners:** existing WorldService mutation owner, [world records](../../apps/server/src/world-records.ts), [record schema](../../apps/server/src/world-record-schema.ts), memory repositories, domain records/validators, save/restore, command/response receipts, source dependency and UI authority fences. Contract: technical design §11 and [Save and load](../save-and-load.md).

- [ ] Update all current stored/wire/source shapes with their producers: intended target, observer speech roles, typed summary provenance, recognition, sensory expiry/scene opportunity and animal response bindings. Remove ordinary Conversation storage/indexes only with their actual replacement consumers.
- [ ] Validate complete identity/scope/revision relationships, source kind, legal target/payload combinations, finite acoustic values and profile/deadline/action ownership at the owning untrusted/storage boundaries. Preserve atomic writes and exact affected-derived invalidation without redundant speculative validators.
- [ ] Preserve a coherent save cut and actual current record hydration for complete hot/cold experience. Rebuild derived indexes without replaying hearing, learning names again, consuming randomness, regenerating captions or purchasing inference.
- [ ] Fence delayed decisions/previews/reads by actual principal, controlled actor, world/timeline, source revisions and relevant body/action generations. Use current authority after awaits; a source/job link is not semantic reply intent or permission.
- [ ] Preserve immutable committed speech and exact native effect/receipt identity across timeout, disconnect, save/restore and recovery. Paid reservations/accounting retain their independent owner; no automatic paid retry or invented reply.
- [ ] Handle actor/source disappearance, expiry, forgetting/correction, missing current profile and changed control explicitly. An admitted native action has enough permitted cause/stopping data to finish safely without restoring expired optional sensation or tracking an unseen entity.
- [ ] Follow the root development policy: one current format, no legacy API aliases, old-save readers, migrations, version-suffixed replacements or compatibility fixtures. A development-state replacement, if later necessary and authorized, is reported; this design task replaces no save.
- [ ] Exercise SP-A14–SP-A18, SP-A21–SP-A23 and SP-A26–SP-A28 across current save/load and delayed publication, including the actual PostgreSQL source/summary/attribution path and current command receipts.

**Exit:** no new record or late operation can lose, duplicate, misattribute or disclose speech/animal evidence through persistence or changed authority. All applicable checks accompany the feature slice that needs them.

## SPK11 — Integrated qualification and final reconciliation

**Depends on:** all runtime tasks above. Follow the repository's verification and spending policy when implementation is actually authorized. This design does not dispatch providers or increase any budget. Do not substitute newly written mirror tests for exercising the actual changed downstream paths.

- [ ] Review the complete affected implementation diff and current producer/consumer search. Check one authoritative field meaning, no ordinary membership assumptions, no display-only memory handoff, no name-based identity merge, no hidden-source lookup and no memory gate on hearing.
- [ ] Run appropriate existing static/build/schema checks and focused existing runtime tests. Add automated cases only where the repository policy or a concrete high-risk invariant requires them; document exact revision/environment and what each check actually establishes.
- [ ] Exercise all SP-A01–SP-A28 through their real boundaries. Record native/fixture, PostgreSQL, browser/accessibility and live behavioral evidence separately; do not claim an unperformed scenario passed because a nearby one did.
- [ ] Qualify natural NPC selectivity across direct/ambient content, personalities, ongoing work and ambiguous replies. Qualify animal continuation/hold/movement/flight and later calm across differing disposition and actual permitted acoustics. Valid fixture output proves execution wiring; it cannot prove spontaneous character judgment or enjoyment.
- [ ] Measure the concrete changed workloads: many audible listeners, many memoryless animals, repeated chatter plus a meaningful new cue, growing actor history, selected cold structured sources, summary dependencies and open log/caption views. Select before hydration; report native fan-out, server preparation, retained bytes, pending/coalesced work, model input/cost and browser behavior separately.
- [ ] Preserve the inventories' actual bounds and overflow behavior. No cap on retained utterances/listeners means admission and storage cost remain real; no social membership means query scoping still matters. Required-work failure is explicit; optional old evidence selection/compaction cannot block an otherwise complete current decision.
- [ ] Exercise corruption/stale-source/current-format rejection and privacy/recovery failures without exposing hidden words/names/locations, losing committed occurrences or re-running paid work. Include same-name and unseen-source invariance, not only happy-path replies.
- [ ] Record detailed actual evidence in the appropriate existing verification owner (or one focused new report if this integrated feature needs it) and link it from this tracker. Keep generated logs/screenshots outside the repository unless expressly requested.
- [ ] Reconcile canonical contracts, project status tables, SPK task state, affected limits and NC/HE/CR/CE/ND references against delivered scope and actual evidence. Preserve unrelated open gates and historical results; move the pair to completed only when the entire selected runtime project satisfies its acceptance.
- [ ] Commit all implementation/review/doc changes using the authorized workflow, verify no task-owned edits remain, and report delivered behavior, consequential tradeoffs, actual checks and remaining in-scope blockers honestly.

**Exit:** the selected feature works end to end with faithful memory, readable UI, independent natural response, animal sensing/action, privacy/recovery and meaningful workload evidence. If an explicitly required live/browser/capacity check cannot run, its acceptance remains open and the project is not reported fully qualified.

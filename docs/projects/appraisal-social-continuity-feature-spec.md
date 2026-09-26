# Persistent appraisal and character-owned social continuity — feature specification

**Status:** proposed implementation scope. Priority 5. [Technical design](appraisal-social-continuity-tech-design.md) defines mechanisms; [ACT07/ACT08 delivery slices](../maintainers/actor-model.md#priority-5-implementation-slices) own work. CR, EPR04, EWF and SL retain their existing responsibilities. [Foundation package](foundations-1-5.md) applies.

## 1. Intended experience

A character can carry grief, unease, affection or another supported appraisal beyond the moment that caused it. A feeling need not evaporate because a timer elapsed, and a new feeling need not require a new external event. Memories, an enduring condition or an explicitly supported disposition may sustain or regenerate it. Reflection and later experience can reframe, resolve or contradict it without rewriting what actually happened.

Separately, each character can maintain a freely written, directional understanding of another person. “I trust Bo, although I am upset about yesterday” is not a numeric friendship tier and need not match Bo's view. Editing it changes neither objective kinship nor an accepted promise. These are fictional character systems, not diagnoses or inferred psychological attributes of the human player.

## 2. What is already present

Main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041` has a native appraisal owner in [social.ts](../../packages/domain/src/social.ts). It currently produces fear/discomfort from personally received damage, applies fixed decay and retains at most 16 entries. That is a narrow starting mechanic, not the persistent multi-cause contract. Its records lack the stable `id` expected by the current `mind_appraisals` record-list key; the implementation must establish true stable identity during conversion.

Actor-owned subject knowledge already has revision-checked full-text replacement in [knowledge.ts](../../packages/domain/src/knowledge.ts). Current reflection already proposes `knowledgeChanges` alongside accepted self-understanding through [CognitionMaintenance](../../apps/server/src/cognition-maintenance.ts). The project extends those owners instead of creating a new relationship score store or emotional text database.

[Accepted appraisal continuity](../../archive/03-design-proposals/agents-and-social-simulation.md#accepted-appraisal-continuity), [memory architecture](../memory-architecture.md), [knowledge](../knowledge.md), [engine/world boundaries](../engine-and-world-boundaries.md), [events and perception](../events-perception-and-reactions.md) and [save/load](../save-and-load.md) govern the design. Newer actor-owned subject knowledge is the relationship-text authority where older prose still mentions inner-world relationship files.

## 3. Concrete journeys

### A. Grief persists without repeated events or calls

A memory-capable character learns of a personally meaningful death through permitted evidence. A supported world policy or an admitted character interpretation establishes grief. The engine does not infer grief from a globally visible death record the character never perceived, nor automatically require every relative to react identically.

The grief remains active through a quiet afternoon, sleep, restart and save/load unless its admitted policy or a later accepted change resolves it. No mandatory hourly decay or repeated paid appraisal call is required. A later recollection may bring an existing feeling to attention without creating a duplicate grief instance or another death event.

Reflection may change the character's understanding and explicitly propose a supported reframe or resolution. Invalid or stale output leaves the previous state intact; failure to generate prose does not erase the feeling. A deceased subject can remain a remembered person without an active body, ghost simulation or live targetable entity.

### B. An internal source creates or sustains an emotion

A configured fictional disposition or enduring bodily/contextual condition can produce an internally arising appraisal under a reviewed policy. For example, an opt-in demonstration character may become restless after a native condition changes, or regain calm through a supported internal process.

Traits' existing descriptive text does not automatically become a numerical multiplier. The world must install an explicit mapping/native policy. Ordinary animals or actors without this optional capability receive no compulsory emotion records, cognition, speech or provider calls. Any randomized internal occurrence uses the saved native RNG at declared opportunities, not a random draw every rendering frame or query.

The source is labeled as internal/dispositional/remembered, not fabricated as a witnessed event. A private feeling is not automatically outwardly visible; visible expression requires its own actual action or native effect.

### C. Independent views of the same relationship

Ada writes in her subject note about Bo: “I trust his practical judgment, but I do not want to lend him my tools.” Bo's note about Ada says: “She seems distant; I do not know why.” Both may be valid character interpretations. Neither needs an objective classifier, reciprocal label or friendship score.

Ada revises her note after a conversation through ordinary accepted knowledge editing or reflection. Bo's note remains unchanged. An objective sibling/parent fact and an outstanding promise remain unchanged. There is no automatic progression from acquaintance to friend to lover, and a word in the note cannot authorize access to inventory or force another actor's behavior.

The subject note is free text. The interface must not require a special “relationship” heading, parse a mandatory sentiment field or move the opinion into a second writable summary. A social view presents the accepted note or a clearly derived, source-revision-bound view of it.

### D. Same evidence, different interpretations

Two actors hear the same statement but have different memories, beliefs or dispositions. Their appraisals and notes can differ. The engine validates who heard it, source identity, current grants and supported update operations—not whether every subjective interpretation is objectively correct.

A speaker's claim is not automatically verified knowledge. The character may qualify, doubt or imagine a claim in its own notes. Native kinship, inventory, learned mechanics and obligations remain independently validated facts. A generated sentence cannot rewrite them.

### E. Correct, forget or lose access to a source

A permitted correction or forgetting operation removes access to evidence that contributed to an appraisal, note, accepted self-understanding or derived view. The current privacy invalidation boundary wins over persistence. A supposedly permanent emotion cannot secretly preserve the forgotten quotation, identity or source through its reason text, counts, embeddings or cached context.

The initial implementation uses the repository's conservative forgetting behavior when selective provenance cannot prove safe retention. Independently valid later conditions may cause a new appraisal, but they cannot resurrect forgotten evidence or pretend the erased episode was remembered. Correcting evidence need not prescribe one objectively correct emotional reaction; it invalidates unsafe source use and lets the supported owner re-evaluate through permitted inputs.

### F. Two humans and creator inspection

A human's owned character may expose its permitted appraisals and subject notes to that account. Another player or creator does not gain access to human-private mental content merely by owning the world. Ordinary observers receive only actual permitted speech/actions/expressions, not hidden emotion labels or relationship graphs.

Creator inspection of NPC minds follows current explicit permissions. Such inspection is not character knowledge. The system neither diagnoses the human behind an avatar nor coerces human controls because an authored emotion says the character is afraid. NPC context and choices use the existing agency/response boundary; unsupported cross-actor compulsion remains a separate feature.

## 4. Required state and behavior

### Optional, sparse and policy-defined

Only applicable actors hold appraisal records. Each active appraisal has stable identity, supported definition/policy, owner, cause/target bindings, lifecycle and current revision. Qualitative feelings need no invented intensity number; a numeric family supplies an explicit scale and meaning. Labels and optional intensity/decay policies belong to the world package, not a universal engine taxonomy.

Support these lifetime modes as implemented policy choices: persistent until explicit supported resolution; fixed expiry; native decay with an admitted curve; condition-sustained; and explicit recurrence/regeneration under a bounded native rule. Persistent inert state has no timer merely to remain present. A policy cannot schedule infinite same-time self-renewal.

Stacking and repeated-cause behavior are explicit. Re-observing the same cause or recalling the same existing episode does not multiply it. A new independently admitted cause may contribute separately or aggregate through a supported policy. No unconditional “keep the strongest 16 and forget the rest” is allowed for meaningful persistent state.

### One owner for each meaning

Native appraisal state belongs to the appraisal owner and its canonical records. Accepted self-understanding can describe feelings but is not a second mechanically writable emotion snapshot. Typed optional changes, not arbitrary prose parsing, update the native state.

Relationship descriptions belong to the actor's subject knowledge document. A graph, card, context snippet or search result is derived from that exact revision. Objective kinship, group membership, operational plans and protected obligations retain their own owners. The same character can have an active feeling, a nuanced relationship note and an obligation without those becoming duplicate representations of one field.

### Meaningful integration rather than constant thinking

Appraisal creation, important change, resolution and supported threshold crossings can produce owner-private evidence and a coalesced reaction opportunity through EPR. They are not mandatory paid decisions. Native survival and ongoing work remain independent of inference availability.

Context shows relevant permitted appraisals once, alongside selected relationship knowledge and required evidence. Preserve complete accepted About me and existing context priorities. A busy display refresh or a stored feeling's mere existence must not wake the actor repeatedly.

## 5. Delivery stages

**Stage 1:** stabilize current appraisal identity and migrate the existing fear/discomfort state without losing its current magnitude, source or explicit native decay policy. Register optional policy/lifetime/cause types and preserve current behavior during extraction.

**Stage 2:** add persistent grief and one explicitly configured internal/disposition example through the same native owner, with cause deduplication and meaningful EPR changes. These are demonstration policies, not mandatory human psychology or a complete emotion vocabulary.

**Stage 3:** extend existing accepted reflection/response publication with optional typed appraisal updates, and expose directional relationship notes through the existing knowledge/editor/query path. Native persistence does not require a working reflection provider.

**Stage 4:** qualify privacy, correction/forgetting, save/restart, source/definition lifecycle, ordinary actor/UI use and bounded scheduling through the current data foundation.

## 6. Non-goals

No universal psychological simulator, compulsory numeric happiness/trust axes, clinical personality inference, mind-reading, forced player speech/movement, automatic relationship reciprocity, new promise parser, resurrection/ghost system or autonomous paid emotional-analysis loop. Rich mental influence mechanics require explicit target-owner operations and human-control policy; a generic appraisal record grants none of those powers.

Do not create a separate social graph authority, another LLM harness, a second inner-world workspace, a new memory store or a global relationship recomputation. Full emotional-language quality, calibrated interpretation and broader AG/CR/EPR acceptance remain separately qualified work.

## 7. Acceptance

ACT07/ACT08 child tasks must demonstrate persistent grief, one internal-source feeling, current fear/discomfort compatibility, no duplicate appraisal on repeated cause/recall, independent directional notes, unchanged objective kinship/obligation, strict subject-reference scope and human-private isolation.

Required failure/lifecycle cases include unknown/forgotten/corrected source, stale appraisal/note revision, duplicate publication ID with changed body, unsupported label/scale/lifetime, invalid mixed reflection output, load during pending generation, quiet-time persistence, source retirement, missing definition pin, many persistent entries and current provider unavailability. No source may gain authority simply by being copied into prose.

Measure actual record cardinality, changed-owner work, context size, wake count, cold-source queries and save/restore cost. No routine full social graph or per-tick model call is acceptable. Native/manual fixtures establish correctness, not live characterization quality. Retain CI and record separately authorized behavioral evaluation as uncompleted when not run.

## 8. Decisions and open questions

Proposed defaults are no implicit decay for newly authored persistent appraisals; exact policy-defined decay for existing native fear/discomfort; one stable cause-aware appraisal owner; typed optional reflection changes; directional free-text subject notes; and conservative privacy invalidation until selective retention is proven safe.

**Blocking product questions: none for the foundation.** World-specific vocabulary, balance and additional mental-effect mechanics remain authoring/feature choices. This design does not require selecting one universal emotion taxonomy before useful continuity can ship.

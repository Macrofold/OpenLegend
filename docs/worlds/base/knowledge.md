# Knowledge and observer identity

The base world uses editable notepads for current understanding and observer-assigned given names for individuated subjects. [Engine knowledge](../../knowledge.md) owns document validation, references, persistence and privacy; [Memory architecture](../../memory-architecture.md) owns experiential memory and cognition integration.

The accepted [speech and social perception feature specification](../../projects/speech-and-social-perception-feature-spec.md) and [technical design](../../projects/speech-and-social-perception-tech-design.md) select reliable recognition of legitimately associated individuals, keeping names separate. The connected evidence/recognition implementation is installed; [SPK](../../maintainers/speech-and-social-perception.md) retains the remaining model, memory, membership and interface qualification.

## Notepads

`packages/domain/src/worlds/base/config/knowledge.yaml` is the authored policy source. Its generated JSON stays beside it; the domain reads generated data without filesystem or YAML I/O. `knowledge.policy: editable-notepads` selects the bundled native policy. `knowledge.maxCharacters.general` is **5,000** and `knowledge.maxCharacters.subject` is **1,000**. They count Unicode code points. Changing these definitions cannot bypass engine request/storage limits.

General knowledge describes the actor's external understanding. Subject pads describe what it knows or believes about one individual or object. Keep uncertainty and contrary evidence. Do not copy live inventory, body state, executable techniques, operational goals or event histories into a competing authority. At capacity, rewrite rather than append; no automatic paid rewrite is authorized. Existing self-description workspace quotas are separate.

Fresh base-world construction installs these defaults once. Ada's initial understanding of her camp and practical background is an explicitly authored general knowledge document, preserving the previous wording without presenting it as an observed memory. The missing-belonging opening likewise supplies Mara's and Tavin's authored starting understanding with explicit origin and no fabricated experiential evidence. Ordinary changed edits replace that source with an ordinary publication; restart never reseeds accepted knowledge or converts older self-description files.

Immediate cognition may propose optional `note` and `name` operations. Reflection returns optional-in-purpose `knowledgeChanges` and `nameChanges` arrays, normally empty. Each edit replaces a pad under its supplied revision; creator edits use the same engine mutation through god-only inspection. Accepting a name or writing a note is not required for speaking or acting.

## Identity and recognition

### Stable recognition policy

The base world uses stable individual identity as its ordinary recognition simplification. A supported visible encounter or audible linguistic voice exposure establishes or reuses the observer's reference to that same canonical individual. A first-time voice can establish this association even when the speaker is unseen and no words are intelligible; prior familiarity, an introduction and name knowledge are not prerequisites. Later supported face/voice exposure reconnects the same individual without a matching model or recognition score. Leaving sight, closing Talk or speaking to someone else does not erase that binding. Recognition does not depend on conversational enrollment, a paid naming decision or creating a subject notepad. Preserve it through save/load and ordinary memory/context transformations while its source and identity policy remain valid.

Keep three facts separate: the actual subject's stable engine identity, the observer's permitted reference to that subject, and the observer's known or chosen name. Cognition uses a scoped exact reference with a permitted label such as “a person”; recognizing that person does not disclose the global entity name. Repeated species labels can refer to distinct people without name matching. A later name or introduction attaches to the existing recognized subject, preserving its earlier experiences and their event-time labels. Current labels may change without rewriting old quotations or pretending the name was known earlier.

This is a world-owned reliable-recognition rule, not a biometric face/voice model or universal perfect knowledge. A reference does not grant a hidden current position, unseen activity, unheard words, an unlearned name or another observer's knowledge. The [hearing contract](../../hearing-and-speech.md#received-direct-addressing--accepted-target) lets an audible recipient know it was addressed without sight; the selected linguistic voice policy also supplies the speaker association on that exposure. Source identity and addressing remain separate facts even when both are reliably acquired. No supported exposure means no new identity knowledge. Ordinary nonlinguistic animal sound retains its separate source-disclosure rule. Other worlds can supply supported disguise, mistaken identity or recognition rules through the existing perception/identity owner. [SSP-M01](../../limits/memory.md#ssp-m01--stable-recognition-and-known-names) records the selected simplification and remaining qualification.

### Current delivered binding

`observerIdentity.policy: observer-given-names` selects the bundled naming behavior. `givenName` is the observer's preferred individual label, limited to 120 characters as a short label, not additional prose storage. Ada may call someone “the beggar” while Mike calls the same person “Tomas.” Accepting an introduction may update the preferred given name. Its canonical subject association preserves earlier memories; no global entity rename or unbounded alias list is required.

A supported human face or linguistic voice establishes an unnamed individual association. Seeing an ordinary animal does not give it a name or human-style recognition association. Unnamed or name-unknown actors have bare canonical observer labels such as “person” and “deer,” with a species and a scoped exact reference. Profiles show “a person” or “a deer”; compact menus use bare labels; prose chooses its article through the shared [naming contract](../../entity-names.md). An explicitly assigned name “Deer” is still a name. Self-name comes from the actor's authored identity; other global entity names are not revealed by visibility. Deliberate naming or creation of a subject pad establishes an individual record.

The installed `wilderness:social-perception` definition selects reliable
individual recognition for human sources through sight or detected linguistic
voice. Its exact definition pin is stored in the world manifest. The existing
observer identity record can have an empty `givenName`; it persists after an
exposure episode ends. Exposure episodes and the 30-game-second encounter linger
still govern current physical observation and its recording, rather than whether
a known person is forgotten. Explicit authored acquaintance remains supported.
An omitted linguistic policy creates no inferred face/voice association. Actual
forgetting/revocation and current-body checks remain independent boundaries.

Targeted teaching, attacks and gestures keep the target's global name out of their shared event text. When an actor witnesses one, the event owner writes that actor's own target label into its stored perspective: a learned name, a species label, or “me” for the target itself. Later name learning does not rewrite what the actor originally witnessed. Words inside attributed quotations are preserved. The same perspective feeds World Events, conversation presentation, memory search and cognition.

This is the current v1 specificity: the policy lives in `packages/domain/src/worlds/base/knowledge.ts`, separate from generic documents. The installed definition selects the stable rule above, while the same observer knowledge owner retains names and associations. Physical faces/voice analysis, distinguishing marks, disguise, mistaken identity and other worlds' identity rules remain separate consumers of the perception owner. This is deliberate reliable identification, without physical face/voice analysis. No plugin loader or knowledge-graph framework is introduced.

## Spoken introductions

Generated speech includes nullable `talk.selfIntroduction`: the exact name or preferred label the speaker explicitly introduces in that utterance. It is a communicated claim, potentially an alias, not the speaker's authoritative global name. Mentions of other people, quotations and ordinary self-descriptions are not introductions. The same generation supplies this annotation; no second model call or English-pattern parser is needed.

Committed speech carries the annotation in its event. The base reception policy
accepts it only through the listener's permitted stable speaker association and
actually understood name words; sight is not required. It uses the normal
observer-name mutation, including for player-controlled listeners. Repeated
identical introductions do not advance revisions. Invalid, oversized or
absent-from-speech annotations are discarded without rejecting speech. Unheard
name words cannot reveal a name, and a recognized source does not supply missing
words. Original occurrence-time labels remain unchanged.

The public entity and conversation labels update from the listener's knowledge. A private `name` operation changes the acting observer's labels and is not a way to introduce oneself to another actor. Historical speech without an introduction annotation remains unchanged; a fresh supported introduction can teach the name. Raw player speech remains ordinary text, which NPC cognition can interpret through its existing observer-name operation.

## Maintained records

- Implementation: [cognition](../../maintainers/cognition-redesign.md) and the accepted [SPK target](../../maintainers/speech-and-social-perception.md).
- Limits: [knowledge and memory](../../limits/memory.md), including [stable recognition](../../limits/memory.md#ssp-m01--stable-recognition-and-known-names), and the current [encounter policy](../../limits/cognition.md#cg10).
- Related design: [speech and social perception feature specification](../../projects/speech-and-social-perception-feature-spec.md) and [technical design](../../projects/speech-and-social-perception-tech-design.md).

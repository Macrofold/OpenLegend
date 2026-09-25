# Knowledge and observer identity

The base world uses editable notepads for current understanding and observer-assigned given names for individuated subjects. [Engine knowledge](../../knowledge.md) owns document validation, references, persistence and privacy; [Memory architecture](../../memory-architecture.md) owns experiential memory and cognition integration.

## Notepads

`packages/domain/src/worlds/base/config/knowledge.yaml` is the authored policy source. Its generated JSON stays beside it; the domain reads generated data without filesystem or YAML I/O. `knowledge.policy: editable-notepads` selects the bundled native policy. `knowledge.maxCharacters.general` is **5,000** and `knowledge.maxCharacters.subject` is **1,000**. They count Unicode code points. Changing these definitions cannot bypass engine request/storage limits.

General knowledge describes the actor's external understanding. Subject pads describe what it knows or believes about one individual or object. Keep uncertainty and contrary evidence. Do not copy live inventory, body state, executable techniques, operational goals or event histories into a competing authority. At capacity, rewrite rather than append; no automatic paid rewrite is authorized. Existing self-description workspace quotas are separate.

Immediate cognition may propose optional `note` and `name` operations. Reflection returns optional-in-purpose `knowledgeChanges` and `nameChanges` arrays, normally empty. Each edit replaces a pad under its supplied revision; creator edits use the same engine mutation through god-only inspection. Accepting a name or writing a note is not required for speaking or acting.

## Identity and recognition

Delayed actor-target references use the same policy: self and creator-authored acquaintances retain identity, while other targets must match the captured continuous encounter. A raw entity ID or an old preferred name cannot re-identify a later anonymous exposure. The shared `subjectReferenceCurrent` helper supplies this decision to native action binding; action execution still validates current perception, reach and capability separately.

`observerIdentity.policy: observer-given-names` selects the bundled naming behavior. `givenName` is the observer's preferred individual label, limited to 120 characters as a short label, not additional prose storage. Ada may call someone “the beggar” while Mike calls the same person “Tomas.” Accepting an introduction may update the preferred given name. Its canonical subject association preserves earlier memories; no global entity rename or unbounded alias list is required.

Merely seeing “a beggar” or “a deer” does not individuate or name it. Unnamed or name-unknown actors appear as “a person,” “a deer,” etc., with a species and a scoped exact reference. An explicitly assigned name “Deer” is still a name. Self-name comes from the actor's authored identity; other global entity names are not revealed by visibility. Deliberate naming or creation of a subject pad establishes an individual record.

The first recognition policy supports **uninterrupted observed encounters and explicit authored acquaintances**. Saved perception episodes preserve continuity across restart and save/load. Once an unseeded individual leaves perception, its knowledge remains saved but a new sighting does not automatically reconnect to it. A stale response cannot name or annotate a different exposure using the old binding. God-authored subject knowledge may explicitly seed acquaintance. Existing worlds acquire no inferred starting acquaintances.

This is intentional v1 specificity: the policy lives in `packages/domain/src/worlds/base/knowledge.ts`, separate from generic documents. A future recognition consumer—faces, voice, distinguishing marks, disguise, mistaken identity, or another world's identity rules—extends/replaces this binding policy through the perception owner. Current continuity does not claim visual recognition or perfect identity tracking. No plugin loader or knowledge-graph framework is introduced.

## Spoken introductions

Generated speech includes nullable `talk.selfIntroduction`: the exact name or preferred label the speaker explicitly introduces in that utterance. It is a communicated claim, potentially an alias, not the speaker's authoritative global name. Mentions of other people, quotations and ordinary self-descriptions are not introductions. The same generation supplies this annotation; no second model call or English-pattern parser is needed.

Committed speech carries the annotation in its event. The base-world reception policy accepts it for actual listeners who can see the speaker and have a supported current identity binding. It uses the normal observer-name mutation, including for player-controlled listeners who do not run autonomous cognition. Repeated identical introductions do not advance revisions. An invalid, oversized or absent-from-speech annotation is discarded without rejecting speech. Unheard or unidentified speakers cannot reveal an entity's name; introduction metadata does not bypass the recognition rules above.

The public entity and conversation labels update from the listener's knowledge. A private `name` operation changes the acting observer's labels and is not a way to introduce oneself to another actor. Historical speech without an introduction annotation remains unchanged; a fresh supported introduction can teach the name. Raw player speech remains ordinary text, which NPC cognition can interpret through its existing observer-name operation.

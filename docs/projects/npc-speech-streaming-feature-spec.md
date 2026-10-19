# Shared NPC speech streaming — feature specification

| Status      | Current progress                                                                            | Last updated |
| ----------- | ------------------------------------------------------------------------------------------- | ------------ |
| In progress | Selected behavior is designed; NST01–NST10 implementation and qualification remain pending. | 2026-10-18   |

## Purpose and selected decisions

An NPC's public words should appear while the response is being generated. Ten, twenty or fifty players who are entitled to hear an utterance receive their permitted versions of the same growing speech occurrence. They do not ask the model separately, and their computers do not decide what anyone else heard.

Mike selected immediate progressive text, without naturally paced speaking or interaction between the progression and the physical environment. He also selected **all public NPC dialogue**, including NPC-to-player replies, NPC-to-NPC replies, overheard responses and autonomous remarks. These choices are settled for this project. Generation, screening, durable acceptance and network delivery take time; the game adds no typewriter delay, speaking-duration calculation or per-word simulation action.

This is an additional designed slice of [ND16](../maintainers/needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) and the public-speech portion of [NC19](../maintainers/narration-and-conversations.md#nc19--progressive-display-of-structured-conversation-replies). It extends the accepted [speech and social perception design](speech-and-social-perception-feature-spec.md), preserving that design's optional single addressee, independent response choice, complete permitted experience and separate recognition/name rules. It does not close their runtime work or the remaining ND16 acoustic/media proposals.

The normative behavior owners are [Hearing and speech](../hearing-and-speech.md), [Narration and conversations](../narration-and-conversations.md), [Memory architecture](../memory-architecture.md) and [Save and load](../save-and-load.md). Their current implementation descriptions remain historical/current evidence; accepted target sections link this pair. **This documentation does not enable streaming in the runtime.**

## Maintained records

- Implementation, ordering and acceptance: [NST00–NST10](../maintainers/npc-speech-streaming.md). This is the sole owner of the new task bodies.
- Exact contracts, source map and verification fixtures: [Technical design](npc-speech-streaming-tech-design.md).
- Selected new constraints: [NPC speech streaming limits](../limits/npc-speech-streaming.md). Existing [hearing](../limits/hearing-and-speech.md), [narration](../limits/narration.md), [interface](../limits/interface.md), [memory](../limits/memory.md), [cognition](../limits/cognition.md) and [native work](../limits/native-work.md) owners retain their shared limits.
- Related delivery: [SPK](../maintainers/speech-and-social-perception.md), [HE](../maintainers/hearing-and-speech.md), [NC](../maintainers/narration-and-conversations.md) and the existing [production admission gate](../maintainers/production-deployment.md#adult-content-and-companion-safety-release-requirements).

## The player-visible contract

### One growing utterance

The first approved, durably committed words create an ordinary speech occurrence with one identity, original occurrence time and history position. Later approved words extend it. The existing world caption grows, and an open Events row updates in place. A suffix is not a second event, another caption, a correction, another player request or another opportunity to buy an NPC answer.

Published words are already accepted speech. They survive generation failure and reconnect. The system never swaps in a differently worded final answer, erases a shown prefix or exposes a retractable public draft. Text that is still being parsed, screened or saved has not been spoken.

The utterance has a small presentation lifecycle: open, complete or interrupted. These states describe whether accepted text may still grow. They do not describe a physical speaking action. An interrupted record retains exactly the accepted words; it receives a neutral non-fictional status in Events, without inventing a spoken apology, finishing a sentence or displaying provider diagnostics. The requesting player's existing request-status surface may explain a technical refusal or unavailability under its own permissions.

### Hearing is decided once

At the first accepted public text, the native speech owner evaluates the ordinary hearing rules once. It fixes the occurrence's actual audience and each observer's permitted evidence: whether they detected it, clarity, allowed speaker/addressee attribution, names at that time, delivery and permitted direction. This is the same single emission-state decision used by instantaneous speech, extended with an appendable text body.

The choice has deliberate, testable consequences:

- An originally eligible person receives the remainder of this utterance even if they later walk away or a door closes.
- A person arriving after first acceptance receives none of this utterance merely because they are now nearby. They may hear the next utterance.
- Movement while the model is still thinking, before any words have been accepted, affects the ordinary first-publication snapshot.
- A speaker's later motion does not move the historical source, reroll hearing or disclose a hidden live location. Existing authorized visible-speaker caption anchors can still follow the ordinary presentation policy.
- Whispering retains its actual acoustic meaning; it is not a private network channel or a promise that nobody else can hear.

Current account grants, controlled-character access, forgetting, erasure and timeline boundaries still govern which sessions may read an observer's evidence. Frozen fictional hearing does not bypass those security checks. Disconnecting a player does not stop an otherwise valid NPC generation or revoke the character's retained experience.

### Every listener receives only their evidence

Clear listeners and the speaker's permitted self account receive the accepted words. A partial listener receives only the stable permitted fragments and coalesced unintelligible gaps. A listener who detects a sound without understanding language receives their permitted sound evidence, never a manufactured quotation. An observer who cannot detect the occurrence receives no speech item.

Partial hearing must remain consistent as text grows. The current whole-utterance word selection cannot be run again on each prefix because it could reveal or hide earlier words. The technical design selects a deterministic, persisted incremental mask with conservative lexical boundaries. Its small additional buffering affects partial listeners only; it does not promise identical display latency across hearing tiers or writing systems. Provider token boundaries never determine what a character heard.

An initially hidden fragment must not remove an originally eligible partial listener from the audience. Attribution, addressing and physical clarity remain separate from whether the current display contains a readable word. Later text cannot reveal hidden counts, offsets, identity or source position through revision numbers, status labels, accessibility text or repeated empty updates.

### All public NPC dialogue uses one path

The following producers use the same speech publication owner:

| Producer                                      | Expected behavior                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| NPC reply to a player                         | Eligible nearby observers share the accepted utterance; the requester has no exclusive claim to its public words.                           |
| NPC reply to another NPC                      | Same publication and hearing rules, including when no human is present.                                                                     |
| Response to overheard speech                  | Same publication path; overhearing does not compel a response or make the listener the addressee.                                           |
| Autonomous remark                             | Same publication path, with an optional explicit addressee.                                                                                 |
| Permitted higher-model response               | Same original decision/operation ownership; it cannot race or repeat an already publishing answer. Observe-only evaluation remains private. |
| Completed generated or authored public speech | The same native speech owner admits the complete text in one transaction; no artificial streaming is added.                                 |

The feature does not turn every generated string into dialogue. Private thoughts, reflections, model reasoning, appraisals, Narrator prose, invention descriptions, World Agent authoring messages and private remote channels retain their separate owners. A current public-speech route that has not passed progressive-output qualification uses the same completed-output admission path. It must not advertise early streaming or use a second paid request to manufacture it.

One response can contain more than one utterance and other operations. Each utterance has its own fixed audience snapshot at its own first acceptance. Text cannot jump ahead of an earlier unresolved action or dependency. Such speech waits for that existing admission boundary; progressive display is not permission to claim that an action succeeded. The technical design gives an exact ordered record contract and conservative barrier rule.

### Reactions and memory use a closed utterance once

Human captions and Events may display accepted open text. Semantic consumers wait until the utterance closes, then use its complete accepted prefix once. This includes NPC attention/reaction selection, response preparation, recall used in model context, embeddings, summaries, reflection, Narrator selection and other meaning-based consequences.

An NPC therefore does not reconsider its life every time a few words arrive. A later unrelated event cannot cause an open prefix to leak into opportunistic model context. Closing an older occurrence still makes it newly eligible even if the actor has already considered more recent events. Its original chronological history position does not change.

An interrupted prefix is real retained speech, with an interruption marker available to semantic preparation. Consumers must not invent its missing ending or treat an incomplete promise, condition or negation as a completed assertion. As with ordinary speech, an eligible NPC may respond, defer or remain silent. Native physical hearing/recognition facts captured at the beginning do not repeat per passage. New word-derived naming, commitments or other semantic changes wait for terminal eligible evidence and their existing owners.

## Journeys and failure behavior

### A question in a crowd

Ada asks the innkeeper where the bridge is. The server starts one admitted response. Once the first passage is validated, screened and saved, the innkeeper's single caption appears for the applicable observers. As more passages are accepted, each observer's existing caption and Events occurrence grows with that observer's evidence. A nearby player may read clear words while a more distant player sees fragments. No player receives the provider's structured document or another character's private context.

The number of human recipients changes delivery and projection work, not the number of provider requests for that response. Fifty listeners is an acceptance workload to measure, not a capacity result established by this design.

### Walking into and out of earshot

Beren hears the first accepted words and then walks outside. Beren continues receiving this utterance's permitted suffix. Cyra enters after first acceptance and does not acquire it. If the innkeeper begins another utterance, its own audience is calculated at that new occurrence. Opening a door, changing the simulation speed and rendering more frames do not schedule speech syllables or change the first occurrence's listener set.

### A connection misses updates

The client receives a newer cumulative permitted body for the same event. Duplicate delivery cannot duplicate words. If its game-patch baseline is missing, the existing scoped reset supplies the latest permitted state, including any utterance still open for this observer. Reconnecting does not rerun generation, re-evaluate hearing or republish semantic consequences. Finished historical speech does not replay as fresh captions.

### Generation stops after some words

Only saved, approved words remain. Pending text is discarded. The speech occurrence closes interrupted once, and its existing caption receives an ordinary readable ending. Its history stays available subject to the observer's current access. A late provider result may settle the original cost but cannot reopen the utterance or replace its text. A retry requires the existing explicit/new-decision rules; there is no paid automatic repair of already spoken words.

If nothing has been accepted, no empty world speech event or fake NPC error line is created. Operational status belongs to the originating request and its authorized operator surfaces. A rejection of one output does not halt unrelated native gameplay.

### The world is saved, paused or restored

Every displayed batch has passed the existing synchronous durable commit boundary. A save captures accepted text and frozen observer evidence, not an in-flight parser or unscreened suffix. Restart or gameplay restore closes a captured open utterance as interrupted through the same native owner, without starting a provider call during load. Operational receipts and uncertain charges remain in their existing non-rewound owner.

Existing caller pause and cancellation policies remain controlling. A surviving explicit player request publishes no new effects while paused; an autonomous request follows its existing cancellation policy. No new speech clock or environmental interruption system is introduced. Losing current generation/control/actor authority fences the remaining output and preserves the already committed prefix.

### A busy or slow display

Appending words does not occupy another caption slot or increment missed-caption counts. Existing density, priority, overflow and accessibility rules remain in force. A currently visible open caption does not disappear merely because its first short prefix exhausted its original reading time. Already read text is not repeatedly replayed or announced. Long utterances advance through the existing readable chunks; overflow remains recoverable from Events.

A slow client cannot delay durable acceptance, other listeners or provider settlement. Existing bounded game-delivery queues coalesce replaceable cumulative updates or disconnect/reset a stalled connection. The authoritative audience is never sampled to satisfy a caption or transport limit.

## Scope and implementation boundaries

This project adds no audio generation/playback, microphone, voice transport, lip sync, word timing, naturally paced typewriter, physical speaking duration, interruption by footsteps or doors, sound propagation over elapsed time, per-chunk hearing, richer room acoustics, language system or crowd-attention model. [Voice and calls](voice-and-calls-feature-spec.md) and the remaining ND16/DG26 work retain their separate decisions. Existing [simulation time](../simulation-time.md) and physical action semantics are unchanged.

The implementation extends existing native speech/evidence, response admission, WorldService commit, history, game-update projection and UI owners. It adds no independent message broker, speech server, speech database, browser-held provider credential or per-NPC client connection. Broader multi-process world ownership and production capacity remain in their current projects.

SPK's ordinary speech/evidence/context contracts are the required implementation baseline; the [NST dependency order](../maintainers/npc-speech-streaming.md#dependency-order) defines the minimal shared cut. Animal controllers, optional media and completion of every broader SPK/HE/NC acceptance item are not prerequisites. Designs may be implemented in one coordinated branch; a dependency does not require an intermediate deployment.

## Acceptance

The technical design's [qualification matrix](npc-speech-streaming-tech-design.md#qualification-matrix) gives exact fixtures and expected observations. Feature acceptance requires all of these outcomes:

1. **Shared early display:** one provider execution produces one growing occurrence for 10, 20 and 50 entitled connected players, with permitted text visible before a deliberately delayed final provider result on each qualified route.
2. **All public producers:** player-directed, NPC-directed, ambient, overheard and permitted escalation responses share the same owner; private and observe-only outputs never enter it.
3. **One occurrence:** stable identity, original time/order, one observer account, one history row and one caption per utterance through appends, duplicates and completion.
4. **Fixed hearing:** initial complete audience and stable listener-specific evidence survive movement, door changes, unrelated events, reconnect and restart; newcomers acquire no suffix.
5. **Durable prefixes:** every delivered word exists in committed retained evidence; failure never replaces, retracts or completes the prefix speculatively.
6. **Single semantic readiness:** all semantic reads omit open utterances and terminal evidence becomes eligible once, even after a later occurrence has crossed the actor's considered watermark.
7. **Exact authority and privacy:** access loss, forgotten evidence, stale timelines, wrong attempts and hidden fragments are handled through the existing owners without disclosure.
8. **Readable continuity:** caption/Events growth preserves reading position and avoids per-passage narration, new-row notices, accessibility repetition and false missed-caption counts.
9. **Bounded work:** delivery/storage/parser buffers obey their owning limits, no listener purchases another model call, slow connections do not block the world, and measured results include CPU, storage, network and full provider cost.
10. **Honest enablement:** required output-admission, provider, persistence and deployment qualification is recorded before player-facing progressive output is enabled. Unqualified routes remain explicitly completed-output-only.

## Design disposition

No product decision remains open for the selected text-only scope. NST00 records this design as done; implementation and qualification remain unchecked. The outstanding provider adapter, content-admission, storage, UI and workload work is specified delivery work, not a reason to keep this slice in the needs-design queue. Broader acoustic/media, private-caller and production-policy decisions are neither silently adopted nor closed.

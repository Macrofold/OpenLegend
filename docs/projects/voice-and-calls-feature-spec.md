# Spoken words, private calls and readable conversation

| Status      | Current progress                                                                                                        | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG26 product proposal prepared; adoption, technical design, media delivery and gameplay qualification remain open. | 2026-10-08   |

This is DG26's product proposal for ND15, ND14's calls and a selected ND16 doorway exchange. It preserves the existing [hearing evidence](../hearing-and-speech.md), [conversation contract](../narration-and-conversations.md) and complete text play. [The optional world profile](../worlds/base/voice-and-calls.md) owns authored availability and physical meaning. No microphone, synthesis provider, media service, new starting equipment or runtime implementation is established here.

## 1. The benefit to earn

A player asks a resident whether they still want to meet at camp. They can hear the resident's actual answer while looking at the surroundings, read the same permitted words, answer by typing or review a dictated draft, and continue their outing. When two consenting people have separated, a deliberately answered slate call lets them adjust a plan together without searching the map or exchanging messages blindly.

The desired improvement is easier, more expressive communication during an enjoyable activity. Audio should help someone follow a brief exchange, use a preferred input method or share a moment. It must not require a microphone, make every resident deliver long speeches, replace independent activity with compulsory conversation, or purchase an AI response whenever someone makes a sound.

The first useful capabilities are independent: optional reading of committed words, private microphone drafting and a two-person call carried by text. They can succeed before live human audio or elaborate acoustics. [Research 04](#research-04--accessible-participation-in-the-same-conversation) supports including different input and reading methods within the same conversation; it does not justify a separate inferior channel for someone who cannot hear.

A selected later doorway exchange asks a different question: can entering a room, closing a door or stopping mid-sentence change what a character actually learns? That needs genuine timed speech and actual geometry. It is not the meaning of the first audio playback.

## 2. Current truth and proposed stages

Current speech commits once and instantaneously, recording what each eligible listener understood at that moment. Captions then provide reading time. A lingering caption is not an ongoing sound. Current main has no delivered microphone, synthesized speech, raw voice transport or private call. [HE01–HE05](../maintainers/hearing-and-speech.md) and [Architecture](../architecture.md#hearing-captions-and-perceived-events) distinguish delivered text evidence from remaining qualification.

The [DG24 message-slate proposal](world-text-messages-feature-spec.md) supplies a future authored device, contact consent and asynchronous text. It too requires technical and runtime delivery. Its contact permission authorizes private text, not automatic calls or microphone access.

The selected sequence is:

1. Let the player request an optional reading of already permitted speech, with a narrowly scoped preference for new direct replies.
2. Independently let the player dictate into a private editable draft and explicitly send chosen words.
3. Complete a live, consented, two-human slate conversation using short textual turns and optional reading/dictation.
4. Qualify a separate short timed doorway exchange with speaker-approved words, real physical boundaries and suitable mechanical pacing.
5. Consider characteristic human recordings or unrestricted simultaneous voice only after their distinct disclosure, caption, interruption and cost problems have a demonstrated solution.

These are independently useful delivery boundaries, not five mandatory systems for the next playable release. A project implementing one stage must complete its own failures, accessibility, authority and recovery rather than hide those obligations in a later stage.

## 3. One meaning for words and knowledge

A player hears only a rendering of the words their controlled person is entitled to know. Another listener may receive different fragments or no words. Synthesis starts from that listener's permitted rendering; the forbidden original cannot be sent as a muffled file, hidden subtitle, preload or recoverable alternative. Whole-utterance permission cannot be inferred from room membership, intended addressee, conversation membership or visible text styling.

Unknown speakers use a neutral reading voice. A stable distinctive voice can reveal a person even when their label says Someone; removing the label is insufficient [Research 10](#research-10--a-voice-can-reveal-identity). The first playback adds no familiar-voice recognition, emotional diagnosis or accent-derived character facts. A known speaker may retain their permitted label, but playback never discovers their current position or changes old unknown attribution.

Partial speech remains explicitly partial. Render only actual surviving words with a consistent neutral separation for gaps, without suggesting missing wording or reproducing exact hidden durations. Unintelligible speech has no invented quotation. An optional reading of its permitted descriptive cue is interface assistance, not reconstruction of a secretly available voice. Audio controls and descriptions must make that difference understandable.

The text, sound and history represent the same accepted communicative act. A claim is not automatically true; a question is not an agreement; silence is not assent. Existing teaching, commitments and physical actions retain their own requirements. Saying “I give you the berries” does not transfer them, and a transcription service cannot turn nearby speech into a native action.

Three controls have distinct meanings. **Cancel draft** discards words that were never sent. **Stop playback** stops this device's rendering of already committed evidence. **Interrupt the speaker**, if offered by the later timed family, attempts a new in-world intervention. None is a synonym for the others [Research 07](#research-07--framework-interruption-is-not-world-authority).

## 4. Optional playback of an actual reply

**Read aloud** is available beside a permitted speech entry. It reads that complete eligible rendering under ordinary media admission. It does not open a new conversation, replay a world event or ask the NPC to repeat itself. Reading old history is an explicit separate action, labeled accordingly; it never makes an old utterance seem newly spoken.

The initial automatic option is **Read new direct replies**, off until chosen. It concerns new committed replies in the player's current focused exchange, including supported private call turns. It does not synthesize every overheard crowd, the player's own words, background history or every resident's thoughts. Changing the preference affects subsequent presentation and purchases no retrospective backlog.

There is one active reading and at most one pending reading. A pending new reply must start within ten real seconds of its commitment; otherwise its text remains available and automatic playback is skipped. Newer arrivals may replace a pending reading without interrupting a sentence already being heard. The audio control can identify an unplayed entry without inventing a failure in the character's dialogue. These are proposed attention bounds, not measured optimal values or restrictions on who actually heard the event.

A player can stop, mute, adjust volume or choose text at any moment. These controls affect their device, not fictional acoustic strength, awareness, an NPC's memory or an already made promise. A quieter playback does not turn a shout into a private whisper. Preserve current keyboard focus, the Talk/Invent arrangement, unsent drafts and older reading position.

The speech caption remains available through ordinary permitted history and accessible text. A player need not race the recording or hear an alert to know that words arrived. Automatic audio does not seize the camera or cancel walking. It also gives no bodily protection: normal time, needs and danger continue under the current world rules.

Synthesis may finish after the player closes the exchange, loses access or changes the controlled person. Then it must not play or become accessible through an old control. Stopping after paid dispatch does not imply a free cancelled request. Costs retain their original receipt, while obsolete media remains unavailable.

The private NP05/NC19 preview is excluded. It may show a validated draft operation before final speech admission, but creates no heard event, caption or memory. Speaking that preview would teach the human words the game might later refuse. New optional audio therefore waits for actual commitment; existing pending NPC UI remains dots only, with no provider, queue or estimated-generation prose inserted into the character transcript.

## 5. Microphone input produces a private draft

The microphone control means **Dictate a draft**, not Speak to the world. Its nearby explanation states that recording becomes editable text and nothing is sent until the player chooses Send. Capture starts only after an explicit action and the device's actual permission. Permission denial, no microphone or an unsupported transcription service leaves ordinary text entry fully usable.

While recording, the control visibly identifies the selected destination and offers Stop and Cancel. The first recording stops at thirty real seconds and preserves what was captured for review. That duration protects attention and limits one capture; it does not establish an encoded-byte, provider-request or total-cost bound. Those complete admission limits must be qualified before the route is offered.

The transcription appears as an editable unsent draft. The player can correct a name, remove an accidental remark, replace the entire result or discard it. Recognized silence, uncertain text and failure must not become a confident automatic utterance. Transcription is fallible; even a fluent result can invent words [Research 09](#research-09--transcription-can-invent-words).

The player explicitly submits the chosen text through the same native speech or call operation as typed input. Ordinary input bounds still apply; an oversized transcript stays editable, without silent truncation or automatic splitting into purchases. A transcription result cannot select a different person, change whisper/shout, approve an agreement or override a blocked channel.

Preserve the composer's existing explicit-send and text-focus behavior. IME confirmation must not send; world shortcuts must not react to editing or dictation controls. If a draft already exists, offer to replace it or append at the current edit position before capture; do not overwrite it when a delayed result arrives. A result tied to an older draft or destination requires deliberate review instead of silently attaching itself to the new exchange.

Only one capture/transcription attempt belongs to the current draft at a time. Stopping capture requests transcription once; cancelling prevents submission and further capture. A lost result remains a technical state beside the dictation control, not a fictional message. Reconcile the existing attempt before offering a separately authorized new request. There is no automatic paid retry, alternate provider or background listening after reconnect.

The human's microphone is an interface input. Recording a draft does not force the fictional person to speak aloud. The same is true when the destination is a private slate. A later actual voice-emission mode must use a different explicit control and disclosure; microphone permission alone cannot enable it.

## 6. A call is an answered private conversation

The first call is between two human-controlled people already connected through the selected DG24 world affordance. Each separately enables **Allow calls from my contacts**. Enabling it permits an invitation, not automatic acceptance, recording or microphone capture. No NPC calls, voicemail, conference calls, external notifications or account-wide calling are selected.

The installed slate family must explicitly support the extension. Existing primitive inventory does not change. A person needs the actual carried valid bound slate and current operating capability; contacts, history and private authority still belong to the person. The item remains ordinary finite property, with DG24's recovery and replacement behavior.

From a known contact, choose **Call**. The request names the actual permitted contact and explains that answering opens a private two-person conversation. It has no message-body preview from another channel, remote location, online indicator or hidden status. At most one outgoing request per person remains pending; at most three new requests across contacts are allowed per sender in sixty real seconds. These proposed allowances follow the stable sender across devices, tabs, restart and rewind.

A request lasts thirty real seconds. The recipient may accept, decline or ignore it. Blocked, unavailable, privately declined or unpresentable requests produce the same caller-facing **No answer** at expiry. Avoid “Ringing” unless that claim is true and intended to disclose recipient delivery; the first interface says **Requesting call**. A recipient can dismiss their own offer immediately without explaining their state to the caller.

Acceptance is different: it deliberately reveals that this correspondent has joined now. It does not prove continuous human attention, good hearing or willingness to accept a proposal. The caller may cancel while waiting; a racing answer resolves the one original request rather than creating two calls or an unexplained late connection.

### One active conversational commitment

An accepted call occupies the person's first active conversation place. If either person is talking locally, show **Leave the local conversation and answer** or the equivalent caller choice before proceeding. There is no silent merge of local participants into the call, and no private call history moves into a local thread.

While an outgoing request is pending, changing the local-conversation context withdraws it. A later answer cannot unexpectedly pull the caller out of a different exchange. On the recipient side, acceptance rechecks the present situation and obtains the relevant leave choice. A person already in a call receives no stacked takeover prompt; other callers get the same eventual No answer.

Ordinary local hearing remains. A caller can notice nearby speech and danger under HE even while privately conversing. Replying locally is an explicit choice to leave the first call and engage through normal Talk. The first scope does not provide simultaneous independent conversation memberships, though it preserves all already acquired local evidence.

### The slate's local sound rule

The selected magical slate conveys the submitted words privately to the accepted pair. **Send in the call produces no automatic nearby spoken utterance.** Optional playback is the human client's reading aid, not an in-world loudspeaker. Microphone drafting does not create obligatory mouth speech. A bystander receives neither the caller's submitted words nor the remote side through the device.

This is an openly authored world law, not a claim that an ordinary telephone is inaudible. The slate description explains it before calling. Someone may separately leave the call and say words aloud; that new act has the normal actual audience. Speakerphone, audible radios and overheard call speech would be different authored profiles requiring explicit admission and complete local/remote audience behavior [Research 03](#research-03--private-groups-and-local-audio-are-different-choices).

### Text completes the same call

The pair shares one call view with exact submitted turns, clear speaker labels from contact knowledge, optional audio controls and a permanently available text composer. Dictation is optional. The person who types and the person who listens participate in the same ordered exchange. A call cannot require a second separate text thread to ask a voice participant to repeat something.

The first submitted turn is an instantaneous private communicative occurrence. It reaches the recipient's fictional knowledge only through its actual permitted active-call presentation. Acceptance of the sender's request is not proof that the other human read every word. No typing, read or continuous presence signal is added. A text accepted immediately before the connection becomes uncertain retains its actual delivery outcome; never invent a hearing receipt merely to keep the exchange looking smooth.

Private call text uses the existing private evidence/history owners without becoming local spatial speech. Its history can be revisited by permitted participants, but no call recording is created. An optional reading can fail while exact text remains usable. If text itself cannot be delivered with trustworthy evidence, stop new turns and show the channel problem in its controls; audio cannot carry on as an unrecorded semantic alternative.

## 7. Ending, losing access and returning

Hang up is always available and ends the call without erasing acquired words. Closing a call through its explicit close control means Hang up; merely hiding its panel preserves it while the controlling game session remains active. Show a small ongoing-call control so the player can find and end the exchange without keeping the transcript open.

Manual world pause, maintenance, hidden-control disconnection, actual control loss, death, incapacity that removes operation, loss of the active device or service disablement ends the call. Pause does not hold a paid line open or silently queue an utterance for resume. Existing received text remains readable as history where current authority permits it. This sacrifices seamless paused calls for a clear first lifecycle; it must be assessed against actual interruption frequency.

Tell each participant their own known reason when appropriate. The other person receives a neutral **Call ended** or **Connection interrupted**, without a diagnostic about death, blocking, device theft or another tab. An explicit farewell remains an ordinary utterance. Ending is not proof of why a person left.

If a submitted turn's acknowledgement is lost, reconcile that submission before offering a new copy. A call ending cannot delete an already committed turn or resend it into a subsequent call. Unsent text remains a private draft within the current permitted scope; capture stops and never resumes automatically. Account/world changes and logout clear inaccessible drafts and media under the ordinary editor policy.

Reconnection establishes present authority and shows permitted call history. It does not rejoin, reactivate the microphone, replay missed audio or resurrect an expired invitation. A new call requires a new explicit request and answer. The same applies after same-format restart or world restore.

A restored fictional history can contain a formerly active call's accepted words, but not an operational open connection. Current privacy, erasure, blocks, control and device revocations still apply; DG25/SL10 governs any offered private historical cut. No discarded-future audio or post-cut call text returns as new inbox material.

Changing embodiment never transfers another person's private call corpus. The first human-only route avoids the still-unqualified NPC derivative problem. Adding NPC calls later must satisfy NC22's participant-restricted thoughts, summaries, outward outputs, creator inspection and control transitions before they are offered. “The NPC will keep it secret” is not enforcement.

## 8. The selected doorway extension

The narrow ND16 consumer is a useful short exchange across an actual doorway: a resident inside says where they left an ordinary object, someone outside approaches, and a door's real open or closed geometry changes which later words are understandable. It tests intelligibility and late entry, not a complete acoustic environment.

First prove the existing simpler version. Two separately committed short sentences, one before and one after the actual door change or movement, should produce the corresponding current direct-path evidence. A player can ask “What did you say?” as new speech. No rooms graph, reflection simulation or voice-recognition subsystem is needed to make this ordinary sequence useful.

A genuinely mid-sentence version is a separate timed family. Its first proposed turn contains one short speaker-reviewed passage. Dictation may supply the draft, but the speaker approves the exact words before emission. Playback is synthesized from those words; the recording used to prepare them is not silently published as a supposedly identical human voice.

The family gives those chosen words native progression and defined stoppable phrase boundaries. Future words remain unspoken until their boundary is actually reached. An interruption preserves emitted parts and cancels only the remainder. A newcomer gets only their later eligible parts. A listener who leaves retains what they already understood, and returning does not restore the missing middle.

At each actual phrase occurrence, use then-current position, geometry, participation and capabilities. Closing the door can change later evidence; it cannot re-mask an earlier phrase. A short phrase is the first resolution limit, disclosed as an approximation. The implementation must not claim word-by-word acoustic precision while evaluating an entire long sentence once. The exact phrase/time envelope must be fixed and qualified before this stage's implementation rather than borrowed from caption chunking.

### Physical time must be credible

Timed emission follows declared native game-time progress. Current base 1× advances sixty game seconds per real second; it does not provide natural six-second spoken exchange. The first physical trial therefore depends on [PS04](../maintainers/product-scalability.md#ps04--coherent-scenes-and-limited-attention) and the existing [clock integration target](../simulation-time.md#product-scalability-time-and-detail-targets) supplying a qualified mechanical pace where the interaction is playable. Do not install a hidden per-speaker clock or call current 1× real time.

Faster simulation advances actual speech boundaries with other mechanics. Optional playback never runs ahead of committed permitted words. If it cannot keep up naturally, stop live presentation, retain the actual eligible text and offer explicit reading afterward. Slowing time does not restart emitted words. Pause stops uncommitted physical progress; actual control departure cancels the speaker's remaining turn under the selected family's normal interruption rule.

This gate is deliberately independent of the first optional readback and private textual calls, which remain complete at current speeds. If a timed sentence's pacing requires slowing every ordinary outing or freezing other people, retain the existing sentence-by-sentence game until the timed interaction earns the cost.

Sound-triggered waking is not selected merely because the door test uses sound. It would need its own useful danger or social scenario, native sleep/life rules and duration policy. Familiar-voice recognition, diffraction, frequency bands, echo, amplification and language comprehension likewise remain separate possible consumers rather than requirements for this release.

## 9. Why unrestricted raw voice comes later

Raw human voice contains more than words: recognizable identity, emotion and incidental background sound can reach someone who should only know that an unidentified person spoke. A cosmetic filter or a quiet receiver setting cannot establish the game's current evidence boundary [Research 02](#research-02--listening-comfort-is-not-transmission-privacy).

A later characteristic-voice mode would require explicit world and participant consent to its human-identity disclosure, a defined eligible audience, matching accessible communication and enforceable cut-off. The player must know whether they are publishing a recording or live capture. An already granted browser microphone permission is insufficient consent for a new world or call.

The concrete intermediate product is the short reviewed timed turn above. Its advantage is stable chosen words, shared text participation and actual late-listener behavior. Its disadvantage is recording/review/send friction and synthetic delivery. Compare it with typing and ordinary dictation during the actual doorway task. If it makes brief conversation slower without adding worthwhile physical choices, do not promote it as natural voice.

Approving a transcript does not prove that a raw recording contains exactly that transcript. Editing “left” to “right” while keeping audio saying “left” would create contradictory evidence. The first intermediate mode resolves that problem by rendering the chosen words. Do not enable raw clips until their separate mismatch behavior is explicitly selected and qualified; speech recognition alone cannot certify equivalence.

Unrestricted duplex also needs overlapping speakers, coughs, backchannels, silence, accidental capture and interrupted recording behavior. A transport's automatic turn-end or barge-in feature cannot choose when a fictional character has stopped speaking or what every listener learned. No unreviewed audio reaches NPC cognition as an infallible canonical transcript, and no automatic response chain follows each detected sound.

## 10. Media privacy, retention and rights

Capture, transcription processing, approved words, synthesis and playback have distinct audiences. The recorder sees their private source and draft. Only approved native submissions gain their actual world audience. A transcription or synthesis provider receives only the content explicitly admitted for that purpose, under the disclosed service policy; the first design selects no provider or encryption claim.

Game-held raw microphone material is temporary: discard it when the result is accepted into the editable draft, cancelled or abandoned, with an absolute ten-real-minute retention ceiling. Optional synthesized media is also temporary, expiring within ten real minutes or the originating authorized session ending, whichever comes first. Preserve ordinary text/evidence and necessary cost receipts separately; they do not need a retained raw recording.

These are proposed game-side policies. Provider retention, intermediate processing and deletion behavior must be documented and compatible before enabling the service. If they cannot be established, the feature stays unavailable with ordinary text intact. Do not promise that a client cannot record audio it legitimately receives, or that private calls exclude a host administrator beyond the established D48 boundary.

Use legitimately licensed synthetic voices and disclose their artificial nature. The first scope offers no cloning of a player's voice, imitation of a particular real person, reusable voiceprint, public recording export or training permission derived from playing. A user's permission to speak in one exchange is not permission to reuse their recording elsewhere.

Permitted synthesis can be reused only for an identical allowed rendering with compatible voice/settings and current access. Sharing is not permission widening: one listener's full sentence cannot supply another listener's partial version. Revocation must cover playable media references, delayed results and relevant caches, not merely hide a button. [Research 05](#research-05--media-publication-needs-explicit-audiences) and [Research 06](#research-06--encryption-does-not-choose-the-audience) explain why membership and encryption alone do not settle this contract.

## 11. Economics and graceful limits

Human textual calls need no language model, speech synthesis, transcription or Narrator generation. Ordinary native receipt, scoped history and connection work still cost resources. Optional services consume existing explicitly authorized spending; the feature creates no per-contact, per-tab or per-device allowance and no automatic paid fallback. An exhausted media budget leaves typed conversation available rather than ending a relationship or fabricating a reply.

Track full cost in units that describe the actual play:

- Transcription: captured minutes actually admitted, including paid failed or cancelled attempts.
- Synthesis: characters or output duration purchased for each distinct permitted rendering.
- Delivery: bytes delivered to actual listeners, active connection duration and any required conversion.
- Persistence: retained text, audience evidence, receipts and temporary media, including their copies and growth.
- NPC interpretation, if later selected: existing preparation, retrieval, routing and response work, separately from the voice service.

For an illustrative ten-minute exchange, suppose each of two people dictates twenty seconds per minute. Total transcription is 400 seconds, or 6.67 minutes, not twenty connection-minutes. At an illustrative 24 kilobits per second, four minutes of audio is 720,000 bytes before transport overhead. Delivering that audio to eight eligible listeners requires 5.76 MB; to one listener, 0.72 MB. These are dimensional examples, not current prices, forecasts or measured capacity.

A symbolic price calculation is transcription minutes times its admitted unit price, plus synthesis units times their price, plus delivered bytes and connection-minutes at their respective prices. Add uncertain commitments before admitting another attempt. A transport may meter silent participation separately from speaking [Research 08](#research-08--cost-has-several-independent-units); avoiding background paid connections matters even when little is said.

Generate no unattended audio merely because an event exists. Bound preparation and queued bytes before expensive work, and reject an unaffordable or oversized optional request honestly. A thirty-second microphone limit does not bound encoded request size, and one pending clip does not bound all players' concurrent requests. The technical counterpart must qualify those complete envelopes before enabling media.

Overload may suppress or refuse optional playback/transcription while preserving actual text and admitted evidence. It may not silently remove entitled listeners, mislabel a failed private send as success or delay required world work behind audio generation. If a later timed family cannot commit its complete audience within admitted work, refuse its start or apply the existing explicit backpressure; do not make bystanders selectively deaf.

There is no selected maximum active-call duration or lifetime text-history count. The proposed short request and media-retention bounds do not make history, contacts, total call count or growing evidence finite. Existing service, history, storage and spending owners must report actual growth and capacity. A small two-person trial is not proof of a hundred-player voice world.

## 12. Acceptance through complete play

The first qualification uses an actual resident exchange and two genuinely separate human participants for calls. Native, browser, assistive-technology, provider and load evidence remain distinct. Current HE05/NC12/CR12 or hosted multiplayer gaps cannot be closed by a design document or synthetic demonstration.

Complete these journeys for each enabled capability:

1. **Listen and keep moving.** Ask a resident a useful question, receive actual committed words, hear an optional reading, stop it, inspect history and make a later choice. Check that playback creates no second memory, action or response, and text remains fully usable.
2. **Different listeners.** Include a clear listener, a partial listener and an unidentified source. Inspect actual delivered media and accessible text, not only labels. No hidden words, speaker identity, original gap length or private recipient may escape.
3. **Repair a dictated sentence.** Capture a name and direction with a pause, edit an incorrect result, submit once and observe the exact chosen words downstream. Denied permission, silence, failure, over-limit text and lost acknowledgement preserve a recoverable draft or honest outcome.
4. **Coordinate separate outings.** Two consenting humans call through real devices, accept explicitly, revise a plan using typed and optional spoken rendering, hang up and later act independently. A call neither supplies a map position nor transfers the discussed goods.
5. **Decline and remain private.** Repeat with ignored, declined, blocked and unavailable recipients. Caller feedback must not distinguish their hidden conditions. Acceptance alone deliberately reveals joined participation.
6. **Lose the channel.** Interrupt capture, remove a slate, revoke control, pause, disconnect, restore and return. Verify no automatic join, capture, send, replay or duplicated turn, with current private history and original receipts preserved.
7. **Pass the doorway.** Only for the timed stage, approach during speech, close the actual door, leave and re-enter, interrupt the speaker and vary time. Later cognition and history must contain exactly the acquired phrases, not a retrospective whole sentence.
8. **Remain useful without money or sound.** Exhaust only optional media allowance, deny microphone permission and use text throughout the same call. No silent fallback charge, invented apology, inaccessible participant or compulsory NPC answer is acceptable.

Measure time from explicit action to first usable draft, first permitted text and first audible playback separately, including preparation and failures. Record actual cost per completed useful exchange, correction effort, skipped audio, interrupted calls, wrong-recipient attempts and whether players can explain who heard what. Do not treat a fast synthesis microbenchmark as conversation latency.

Judge the game with a matched ordinary text journey. Did hearing help the player follow the surroundings? Did dictation save effort after corrections? Did a call improve coordination enough to justify acquiring and operating the slate? Did the doorway produce a comprehensible choice rather than confusion? Set implementation acceptance thresholds before the pilot from the selected supported workload, and keep observed enjoyment separate from transport correctness.

## 13. Gameplay critique and delivery discipline

The largest risk is building an impressive communications stack that makes ordinary exchanges harder. Keep direct text friction low, audio optional and new controls subordinate to the current task. No dialogue streak, mandatory response, friendship reward for voice use, speaking quota or energy fee is added to manufacture engagement.

The first call's private slate law is intentionally simple. Its tradeoff is less eavesdropping drama than an audible radio, in return for predictable consent and no accidental speakerphone. Its one-active-conversation rule avoids competing obligations, but can interrupt natural local social play; measure that cost before adding simultaneous channels. Ending calls on pause is similarly a deliberate first simplification, not an eternal realism requirement.

Reviewed dictation can be better input without being natural live conversation. Timed synthesized turns can establish trustworthy physical evidence without preserving a person's vocal performance. Name those benefits honestly. If the later mode offers little beyond optional readback, stop there rather than add room acoustics, voice cloning or autonomous call behavior to rescue it.

Prioritize the useful resident and outing before media novelty. Deliver complete readback and dictation independently; then complete the human call through the existing text/private-authority foundation. Keep NPC calling behind its actual privacy and voluntary-behavior gates. A crowd of automatically narrated residents is neither a cost-saving strategy nor evidence of compelling lives.

A different coherent world may have audible radios, fixed terminals, limited coverage or a language barrier. It can replace the slate's authored policy while reusing legitimate identities, explicit communication actions and evidence owners. It must declare who locally hears each direction, how failures are presented and what the device actually permits. No unused universal communications framework is required for that possibility.

## 14. Research

Retrieved October 8, 2026. These ten primary sources inform the proposed choices; none establishes Open Legend implementation, provider selection or player satisfaction. Historical/versioned observations and access limits are explicit. Recommendations below are design inferences.

### Research 01 — Spatial volume is an authored choice

**Source:** Rare, [Sea of Thieves 2.4.0 release notes](https://www.seaofthieves.com/release-notes/2.4.0).

**Finding:** The speaking trumpet's alternate whisper use reduces chat reach, including to crew members. **Inference:** Make a selected speaking mode understandable, while explaining that reduced reach remains potentially overhearable. **Access/limit:** Official search-index text supplied the complete whisper subsection; direct page access returned 403. This historical mechanic does not prove that a whisper guarantees privacy or that its interaction fits this game.

### Research 02 — Listening comfort is not transmission privacy

**Source:** VRChat, [2022.2.2p3 release notes](https://docs.vrchat.com/docs/vrchat-202222p3), August 30, 2022.

**Finding:** Earmuff Mode applies additional playback-volume control with adjustable distance/falloff and a visible reminder. **Inference:** Give players readable comfort controls without confusing them with fictional hearing permissions. **Access/limit:** The full official release note was read. It describes a playback feature, not an assurance that remote media was never delivered or an evaluation of Open Legend crowds.

### Research 03 — Private groups and local audio are different choices

**Source:** Simple Voice Chat, [Group.Type API](https://voicechat.modrepo.de/de/maxhenkel/voicechat/api/Group.Type.html).

**Finding:** Its group modes distinguish group-only hearing, receiving outside nearby speech, and allowing nearby outsiders to hear group members. **Inference:** Specify both incoming and outgoing local sound for a private call. **Access/limit:** Complete official project documentation was read. These are another project's mode definitions, not a selected architecture or an independent privacy audit.

### Research 04 — Accessible participation in the same conversation

**Source:** Microsoft, [Xbox Accessibility Guideline 119](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/119), March 4, 2026.

**Finding:** Guidance includes voice captions, spoken rendering of typed communication and accessible text entry wherever communication occurs. Separate text/voice channels alone are insufficient. **Inference:** Put typed turns, permitted captions and optional sound inside the same call. **Access/limit:** The complete public article body was returned despite a wrapper authorization notice. This is design guidance, not a declaration of compliance or evidence that the proposed interface has passed user testing.

### Research 05 — Media publication needs explicit audiences

**Source:** LiveKit, [Camera and microphone](https://docs.livekit.io/transport/media/publish/).

**Finding:** The documentation distinguishes device permission, stopping transmission by muting, and configurable track permissions; room participants can subscribe to published tracks by default. **Inference:** Prove permitted content delivery through audience changes instead of relying on client volume or membership alone. **Access/limit:** Official documentation was read. No SDK is selected, and its documented controls do not prove the game's complete per-listener behavior.

### Research 06 — Encryption does not choose the audience

**Source:** LiveKit, [Encryption overview](https://docs.livekit.io/transport/encryption/).

**Finding:** Its optional end-to-end media/data protection depends on application key distribution; signaling and API calls have a different protection boundary. **Inference:** State eligible people, processing participants, transcripts and metadata before describing a call as private. **Access/limit:** Official documentation was read. Encryption is not selected here, and it does not independently authorize NPC processing, recording or a wider recipient.

### Research 07 — Framework interruption is not world authority

**Source:** LiveKit, [Turns overview](https://docs.livekit.io/agents/logic/turns/).

**Finding:** The framework documents interruptible output, history related to heard output and separate false-interruption handling. **Inference:** Keep playback stop, draft cancellation and physical interruption distinct; a multiplayer world requires its own listener evidence. **Access/limit:** Official turn and interruption passages were read. A framework behavior for an agent conversation is not evidence of the correct native timeline or audience for this simulation.

### Research 08 — Cost has several independent units

**Source:** LiveKit, [Quotas and limits](https://docs.livekit.io/deploy/admin/quotas-and-limits/).

**Finding:** Its metered resources distinguish participant duration, outgoing transfer, transcoding and inference, alongside concurrency/subscription limits. **Inference:** Measure connection time, actual speech, audience delivery and processing separately. **Access/limit:** Official documentation and metered definitions were read. No price, allowance, provider capacity or listener cap is adopted; the arithmetic in this specification is illustrative.

### Research 09 — Transcription can invent words

**Source:** Koenecke et al., [Careless Whisper: Speech-to-Text Hallucination Harms](https://arxiv.org/abs/2402.08021), revised May 3, 2024; [venue paper](https://facctconference.org/static/papers24/facct24-111.pdf).

**Finding:** The abstract reports invented phrases in about 1% of its studied transcriptions of the evaluated 2023 Whisper system, associated with longer non-vocal portions. **Inference:** Offer private editable drafts and never treat silence or fluent transcription as assured speaker intent. **Access/limit:** Abstract and metadata were read, not the full paper. That observed rate is not a current-product or Open Legend error estimate.

### Research 10 — A voice can reveal identity

**Source:** Tomashenko et al., [The Third VoicePrivacy Challenge](https://arxiv.org/abs/2601.11846), January 17, 2026.

**Finding:** The challenge treats hiding voice identity while preserving linguistic content and emotion as a separate problem with explicit attack models and privacy/utility evaluation. **Inference:** Unknown fictional speakers require neutral permitted rendering unless a different disclosure mode is chosen and qualified. **Access/limit:** Author abstract and metadata were read; the paper was under review and the full paper was not read. No anonymization effectiveness claim is made.

## 15. Maintained records

- Implementation and acceptance: proposed HE07 under [Hearing delivery](../maintainers/hearing-and-speech.md), NC23 under [Conversation delivery](../maintainers/narration-and-conversations.md), with existing [MP authority](../maintainers/multiplayer.md), [PS04](../maintainers/product-scalability.md#ps04--coherent-scenes-and-limited-attention) and cognition/spending owners.
- Limits and constraints: [Hearing/media](../limits/hearing-and-speech.md), [Narration/calls](../limits/narration.md), [AI execution](../limits/ai-execution.md), [Multiplayer](../limits/multiplayer.md) and the relevant current memory/persistence inventories.
- Authored choices: [Optional voice and slate calls](../worlds/base/voice-and-calls.md), consuming [DG24 slates](../worlds/base/text-messages.md).
- Persistent contracts: [Hearing](../hearing-and-speech.md), [Conversations](../narration-and-conversations.md), [Timed UI](../timed-ui.md), [Simulation time](../simulation-time.md), [Perceived history](../perceived-world-events.md) and [private correspondence](world-text-messages-feature-spec.md).
- Design register: [DG26](../maintainers/needs-design.md#dg26--voice-calls-and-selected-hearing-extensions); technical counterpart remains explicitly outside this product-only assignment and must be completed before runtime implementation.


# Voice, listening and private calls — feature specification

| Status                  | Current progress                                                                                                                                               | Last updated |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Product design complete | Researched behavior and independent critique are complete. Technical design, implementation and actual play, accessibility and cost qualification remain open. | 2026-10-07   |

**Design group:** DG26 — ND15, the calls extension of ND14, and the decision boundary for selected ND16 hearing work.  
**Assignment:** [Groups 26–30](product-design-groups-26-30.md).  
**Owners:** [Hearing](../hearing-and-speech.md), [conversations](../narration-and-conversations.md), [private text](world-text-messages-feature-spec.md), [PS04](../maintainers/product-scalability.md#ps04--coherent-scenes-and-limited-attention) and [AI spending](../ai-providers.md).

## 1. The experience worth building

A player should be able to ask a resident a question, read the answer immediately, optionally listen while continuing their outing, and stop listening without fighting the interface. Someone who finds typing difficult should be able to dictate a short draft, correct a mistaken name or missing “not,” and deliberately send it. Two established contacts should be able to agree to a private conversation now, coordinate a meeting, and return to what they were doing.

These are three related conveniences, not a replacement for playing in the world. The first complete feature is **reading permitted, committed words aloud**. Reviewed dictation is independently deliverable. A private slate conversation is a later optional extension of the existing text relationship. Neither requires continuous microphone streaming, a new conversational agent, universal voice recognition, or a complete acoustic simulation.

The selected call is **a private conversation with explicitly submitted turns**. Players may type, dictate and listen. The interface says this before the first invitation; it does not advertise uninterrupted live human voice. Its additional value over a note is deliberate shared attention and a visible accepted conversation, not a promise that someone is always reachable.

Success means the player spends more attention on people and decisions and less on entering or rereading text. Long compulsory performances, repeated microphone setup, inaccessible fallbacks and rising idle charges would defeat that goal. The game must remain fully playable through its existing text actions whenever optional audio is unavailable.

## 2. Current facts, accepted neighbors and proposed changes

This design was reconciled against completed DG16–25 documents at `671d52d724db5dfe39403ebe46f7c1ee24d6ec52`, carried unchanged into this branch at `0c7f423be857703caa102863e2d0bb05cbc79223`. Current-main implementation was inspected at [`0a3ab79`](https://github.com/Macrofold/OpenLegend/tree/0a3ab79b7a698a7f1941dc23722f89220d1ba425). Reading newer main does not import its runtime into this documentation branch.

| Area                  | Actual current behavior or accepted proposal                                                                                                                                                                                                                                     | Consequence here                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Spoken words          | [Current hearing](../hearing-and-speech.md) and [speech implementation](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/packages/domain/src/speech.ts) commit instantaneous utterances and immutable listener-specific fragments/identity. | Playback reads already acquired evidence. It does not create physical speech duration.                                   |
| Reach and uncertainty | Direct geometry, whisper/normal/shout, clear/partial/no-word evidence and unknown sources are implemented. A shout can reach all eligible listeners; there is no independent audience cap.                                                                                       | Every media rendition must preserve the same permission. Quietening a complete recording is insufficient.                |
| Captions              | [HR04](../limits/hearing-and-speech.md#hr04--caption-density-and-lifetime) owns reading time, queues and missed-caption history recovery.                                                                                                                                        | Audio uses the existing transcript/history; it does not add a competing evidence overlay.                                |
| Early NPC reply       | [NC19](../maintainers/narration-and-conversations.md#nc19--progressive-display-of-structured-conversation-replies) permits a private temporary text preview, not committed speech.                                                                                               | Character audio waits for committed words. Ordinary assistive reading of already visible UI is a separate function.      |
| Microphone/media      | The inspected game has no delivered transcription, synthesis or continuous human voice route.                                                                                                                                                                                    | All new audio behavior below is proposed, including device/provider qualification.                                       |
| Private contact       | DG24 proposes accepted same-world contact and finite portable slates, private messages and deliberately undisclosed availability.                                                                                                                                                | A contact permits a call request, not acceptance, microphone capture or a local room bridge.                             |
| Physical timing       | [DG18 §7](attention-and-scenes-feature-spec.md#7-target-behavior-for-timed-and-interrupted-speech) already proposes intended versus emitted versus heard phrases under PS04.                                                                                                     | That remains the sole timing owner. This group does not silently install its later speaking law.                         |
| Real costs            | Existing spending reserves actual admitted work; missing billing is not zero. Worker standing costs are separately owned.                                                                                                                                                        | Optional media needs an identified funded owner and its own attributable use, not an implied gift from an NPC allowance. |

The current base world runs sixty game seconds per normally advancing real second. Current authored food drain is 0.003 percentage points per game second. A **hypothetical** thirty-second listening interval spends 5.4 fullness at 1×, or 43.2 at 8×, if simulation advances throughout. This is arithmetic from [time](../simulation-time.md) and [current survival policy](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/survival.md), not a measured clip length or a reason to change metabolism here. It explains why text cannot wait for narration and why listening cannot disable ordinary movement, eating or leaving.

## 3. Selected scope and delivery order

| Stage                          | Complete useful offering                                                                                                                             | Required before offering it                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A — Listen                     | Manually read a permitted committed utterance; optionally read new direct replies in the selected conversation. Stop, replay and text recovery work. | Actual voice rights, readable controls, permission-preserving rendition and funded processing if used.        |
| B — Dictate                    | Capture a bounded utterance, receive an editable draft, correct it and explicitly submit through its existing composer.                              | Device denial/loss, scope changes, language accuracy limits and duplicate/uncertain outcomes are handled.     |
| C — Private slate conversation | Two humans with actual slates and accepted contacts request, accept, exchange submitted turns and end. Typing alone completes the experience.        | DG24's real delivered identity, privacy, device and text lifecycle; no speculative substitute.                |
| D — Resident participant       | One human and one NPC use the same accepted private channel; the resident independently chooses whether and how to participate.                      | DG24's private NPC evidence and derivative protections plus actual voluntary behavior and cost qualification. |

Stages A and B can ship independently; C does not wait for B or synthetic voices. Stage D does not block two humans. Every offered stage includes its own recovery and privacy behavior, rather than offering a happy path with those deferred.

Continuous raw human proximity voice, group calls, video, voicemail, recorded-call libraries, automatic language translation, impersonation/cloned voices and speakerphone are **unselected expansions**. They are not implied by the word “voice.” ND16 remains conditional: no new room paths, voice familiarity, sleeping comprehension or noise-triggered waking law is selected because this bounded offering does not need one. Their existing need-to-design entries remain visible.

## 4. Listen to a line without delaying play

### 4.1 Entry and controls

Each permitted committed line has a named **Read aloud** action in its existing message/history detail. The player can start it with keyboard, pointer or supported assistive controls. A compact playback control provides Stop, Pause/Resume and a readable speed choice. Rate changes affect device listening only. They do not change simulation speed, who heard the line, its timing or what an NPC intended.

For private slate text, the source must already have been presented through NC22's actual Read, device and active-play checks. Arrival in an inbox and acceptance of a call are not reading. Automatic audio cannot fetch later unread text while the player is viewing an older page; it may follow only new text actually presented through the ordinary current-reading route.

Automatic reading is off initially. An explicit **Read new replies in this conversation** preference opts into the currently selected direct conversation. It does not read every bystander, old message or world event. Existing platform screen-reader preferences remain respected through the ordinary accessibility owner; the game must avoid speaking the same line twice through two automatic systems.

The complete permitted text appears at the normal committed time. The player may answer, move, use an item or close the panel while the audio is playing. Closing the conversation panel stops its automatic reading and pending playback; it does not end a still-valid fictional conversation unless the existing owner says so. A manually selected history reading has its own visible playback control and can continue after the history panel is hidden, until explicitly stopped or its authority changes.

An audible line is marked as **Reading** or **Replay** in the player's playback control. Character performance may be expressive, but must not add words, a second narrative explanation, or objective emotion absent from the admitted content. A generated delivery of “Fine” is not new proof of resentment. Before first character-audio use, accessible copy discloses that this is generated reading of received text, not a recording of a human performer or live microphone. Keep that information reachable with voice settings without repeating a warning on every line.

### 4.2 Queue and interruption

The proposed initial playback envelope is one active rendition and one pending rendition for the selected automatic stream. A new eligible reply may occupy the empty pending slot. If that slot is occupied, leave subsequent lines in the existing readable transcript and show a quiet **More replies in text** indication. Do not cut off the active line repeatedly to chase the newest one.

A pending automatic rendition expires after fifteen seconds of foreground, unpaused playback opportunity. Expiry removes only the automatic presentation request; it does not delete text or claim the character did not hear it. If synthesis has not yet been dispatched, expiry avoids the purchase. An already dispatched attempt retains its real accounting.

Stop clears active and pending automatic playback. It does not stop an NPC, retract speech, cancel a promise or demand another reply. Pause retains the current reading position locally; it does not create a paid open conversation. Manual selection of a different line replaces the existing playback only after that explicit action. There is no automatic cascade through history.

On document hiding, world replacement, account/control change or revoked source access, stop playback and clear pending audio. Returning never plays a backlog. A world pause stops automatic reading; the player may deliberately read already permitted history while paused. Resuming the world does not reopen a microphone or recover missed automatic audio.

### 4.3 Permission is in the audio itself

For a clear, attributed line, a licensed stock character voice may read the exact permitted text. For an unidentified source, use the player's generic reading voice without a stable character-specific accent or timbre. Partial speech likewise uses neutral reading of only the recorded fragments, with one ordinary “unclear” cue for each coalesced gap. Gap sound/duration must not encode hidden syllables, word counts or an underlying complete recording.

Unintelligible speech may have its already permitted “murmuring” description read as interface narration. It must not contain recoverable lexical audio. A seen-only speaking cue contains no synthesized sentence. No media payload, transcript hint, downloadable asset or cache identifier may expose the hidden complete utterance or source identity.

The first reading is non-spatial presentation. It does not follow a hidden speaker's movement. Existing permitted caption arrows remain the location aid. This avoids turning stereo position or a recognizable voice into extra fictional evidence. Later spatial playback needs an explicit matching permission design, not a cosmetic switch.

Leaving earshot after a committed line does not revoke legitimately learned words. They remain readable under current history access. Conversely, arriving late cannot retrieve a line one never heard merely because another listener has a cached rendition. Reading one's own past does not make it audible again in the world.

## 5. Dictate a draft, then send deliberately

### 5.1 Capture journey

**Dictate a draft** sits beside the existing composer with its real destination visible: local Talk, the chosen slate recipient, or an accepted private call. Selecting it requests device permission only when needed. Before first use, explain that captured audio is processed into editable text, name the actual processor if remote, and link the actual retention terms. There is no microphone request on entering a world or answering a text-only call.

Provide both a press-and-hold control and a start/stop toggle. Starting capture stops the game's own read-aloud output to avoid transcribing it into the player's reply. Moving keyboard focus between controls within the same permitted capture task does not itself end recording. Active recording has a persistent visual label and accessible state; a changing decorative waveform is not the sole indicator. The player can cancel without submitting anything. No automatic voice activation is offered initially.

Keep one unfinished dictation or transcription candidate per account across tabs, with no queued recordings. Finishing, discarding or cancelling it permits another; the existing typed draft is preserved. Closing a local candidate does not release an uncertain dispatched charge or create permission for a paid retry.

The initial capture ends at thirty real seconds or two MiB of admitted encoded audio, whichever comes first. Show the remaining duration while recording. These are proposed service/input bounds, not fictional speech limits or measured optimal settings. Reaching the cap stops capture, retains a bounded clip for review and offers **Transcribe**; it never sends words to the world. Ordinary deliberate Stop completes the one transcription action already described by Dictate.

On loss of window/tab foreground, stop capture immediately and retain the bounded clip only in the same current local draft context. Returning offers Transcribe or Discard; it does not upload while the player is elsewhere. Device loss has the same outcome when a usable clip exists, otherwise retain the typed draft and explain that no recording was obtained. A local unsubmitted clip expires after five real minutes with a visible expiry notice; changing account/world/controller or discarding the draft deletes it immediately. No background microphone survives a browser or game lifecycle transition.

### 5.2 The result remains editable

Show completed transcription as a proposed addition to the same draft revision. The player may review, edit, listen to the local capture while it remains available, or discard it. Incremental recognition may be shown within the capture task but is never automatically submitted or treated as final.

If the player typed while transcription ran, do not overwrite their newer work. Offer an explicit insertion of the candidate into the current draft, or copy/discard within that same permitted context. A late result must never jump to another recipient, an ended call, another actor or another timeline. Scope loss discards it from presentation; it does not falsely cancel an already incurred processing charge.

The existing composer retains its own Send behavior. Local Talk uses Enter to send and Shift+Enter for a newline, with IME composition protected. DG24's private multiline composer retains its separately selected shortcut. Dictation does not install one universal shortcut over both. Normal undo, selection, paste and screen-reader editing remain available.

Talk retains its 1,000-character input limit; native and model speech retain their distinct [HR02](../limits/hearing-and-speech.md#hr02--complete-audience-and-partial-evidence) bounds. Slate text retains DG24's 2,000-code-point and 8,000-byte envelope. An oversized transcript stays editable with the existing limit shown; there is no silent truncation, automatic split into messages or additional paid shortening.

### 5.3 What those words mean

Until the player explicitly sends and the normal owner accepts, the character has said nothing. Microphone loudness does not select fictional Whisper, Normal or Shout. The player's existing volume control does. A captured background conversation, mistaken number, missed negation or guessed language has no authority over actions or agreements.

Vocabulary hints, if qualified, may use only terms the speaker is entitled to know. Hidden names are not inserted to improve recognition. The system does not infer commands from a recording; it only supplies a draft to the selected text action. The player reviews consequential wording through the ordinary behavior of that action.

When funding, device access or transcription is unavailable, typing remains immediately available and existing text is preserved. Retrying is explicit and states whether it starts a new processing attempt. An uncertain dispatched request is reconciled under its original identity; automatic paid retry is not a recovery strategy.

## 6. The private slate conversation

### 6.1 Its place in the fiction

Use DG24's finite same-world communication slates and accepted contacts. This optional profile adds **private written turns exchanged while both people have agreed to converse now**. Dictation is input convenience; read-aloud is the local player's presentation preference. Neither emits the character's words into the room. A nearby person may observe ordinary permitted device use, never the private content or the remote person's identity by implication.

The profile supplies no phone towers, telephone numbers, airtime currency, range-progression ladder or compulsory battery chore. DG24's actual device possession/access and world installation remain necessary. A stolen slate does not grant the thief its owner's contact history. A call cannot reach another world until a separately designed travel/communication policy exists.

The call control is secondary to **Write a message**. If a note would do, the player need not request shared attention. Before first use, concise copy explains: “Invite this contact to a private conversation. Type or dictate each turn; optional audio reads received text.”

### 6.2 Request, accept and end

The caller selects one actual contact and chooses **Invite to talk now**. The invitation contains no custom pre-answer voice or text payload; use ordinary private messaging for a note. The caller sees **Request pending**, Cancel and the request's remaining thirty real seconds. This is the caller's own request lifetime, not the recipient's status.

In a world explicitly offering calls, quiet requests from accepted contacts are allowed initially; answering always remains explicit. The recipient can turn **Call requests** off globally or per contact. Off clears current invitation presentation and suppresses new requests; turning it on applies only to future requests. An existing DG24 thread mute suppresses call cues too, so a call cannot bypass it. Requests are quiet, coalesced in the slate surface and never steal typing focus. No audible ring, automatic waking or automatic answer is selected. Decline and ignore produce the same caller-visible outcome at expiry. Blocking, sleep, death, being busy, unavailable cognition and being offline are not disclosed before deliberate acceptance.

On actual acceptance, both see the identified accepted contact and **Conversation open**. Acceptance intentionally discloses that participation. Both must still possess current authority and a usable slate. Simultaneous acceptance/cancellation is resolved once under the actual accepted order; no “open” state is displayed based solely on a button press.

Either participant may End immediately. The other sees only that the conversation ended, not a private reason. Existing sent turns remain under the private text owner. There is no automatic voicemail, redial, transfer, third participant or invitation chain.

The proposed envelope is one pending outgoing request and one active call per character, and one active human call per controlling account. A character may retain at most three incoming invitations; later requests receive the same private caller-side pending/expiry treatment without displacing the recipient's accepted work. Request admission is limited to three per initiating account per rolling real minute, and one per initiating-account-to-contact direction per minute. Only the initiating account's own attempts consume its visible allowance; an unseen reciprocal request cannot consume it. These real-time counters remain current through restart and fictional restore. Count admitted attempts even when ignored; changing slates does not reset these bounds.

An incoming request never evicts an active call. The player must deliberately end one before accepting another. Turning Call requests off ends neither history nor an already accepted call; it suppresses future invitation presentation. Blocking a contact ends their active call and prevents further contact under DG24's current social policy.

### 6.3 Turns and attention

The accepted call opens the existing private transcript with a compact active-conversation header and End. There is one ordinary composer; a second mini-chat inside an audio widget is unnecessary. Each Send commits through the same private-message route and shares DG24's rate envelope: six per sender–recipient pair and twenty-four overall per sender per sixty real seconds. These are rolling burst allowances, not a required ten-second wait between turns. Qualify short back-and-forth without forcing players to pad messages or hesitate over ordinary acknowledgements; any justified tuning belongs to the shared text owner. There is no extra call allowance that doubles the recipient's burden.

Accepted membership is permission to offer turns, not proof that each was read. Preserve Submitted rather than introducing read receipts, typing surveillance or a live location indicator. The recipient's actual read creates the proper private evidence. A call turn is not local heard speech, and does not enter bystanders' conversation history.

Both participants may act normally while the panel is open. The call grants no invulnerability, metabolic suspension, remote item transfer, compulsory attention or automatic completion of a bargain. Relevant capability loss may prevent composing/reading under the installed world rules. The sender's delayed or refused turn stays recoverable as text in its original context.

There is no arbitrary maximum call duration while two authorized participants remain connected: an idle accepted slate conversation consumes no standing media/model session in this proposal. Ordinary hosted connection and storage costs still exist and need admission. If an implementation requires paid standing media, that is a consequential offering change to disclose and qualify, not an invisible charge attached to this promise.

### 6.4 NPC participation

Stage D permits one resident to receive an ordinary scoped invitation opportunity while capable. It is a request the resident may ignore, decline or accept based on current evidence and priorities. A denied cognition budget does not manufacture acceptance, a scripted apology or a later automatic catch-up response.

Acceptance allows ordinary private turns to be considered through the existing cognition owner. There is no new continuously listening agent, model call per audio packet, mandatory answer to every line or separate call persona. Native continuation and other activities keep their ordinary rules. The resident may decide to end the conversation; the caller sees the same neutral Ended state.

Private call words, summaries, thoughts derived from them and generated audio retain DG24's private-source restrictions, including after a creator inspects the world or another human controls the resident. Reading private words aloud is not authorization to leak them into nearby speech. A resident may make independent choices informed by their knowledge without automatically quoting protected correspondence publicly.

## 7. Lifecycle and recovery

| Event                                                 | Selected behavior                                                                                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local playback stopped or muted                       | Stop presentation only; preserve already acquired text and actual game activity.                                                                                                        |
| Microphone denied/disconnected                        | Keep editable text; stop capture; allow qualified bounded local-clip recovery. No fictional utterance.                                                                                  |
| Audio processing fails                                | Show a restrained audio-specific failure beside its control; the accepted text stays successful. Do not mark the NPC's answer failed.                                                   |
| Send outcome uncertain                                | Retain the original attempt and resolve its receipt before an explicit replacement. No duplicate text or new processing merely from reconnect.                                          |
| Pending call expires                                  | Caller sees No answer. The recipient gets at most their own legitimate missed-request entry, not a received utterance.                                                                  |
| World pause                                           | Pending invitations cancel without private reason; active calls end. Existing private history remains readable under its owner; manual reading aloud remains possible.                  |
| Disconnect, device loss, departure or loss of control | End the active call; stop capture/automatic playback and fence late submissions. No grace period that carries on speaking for an absent person.                                         |
| Sleep, death or incapacity that removes communication | End the call under actual capability; retain legitimate earlier evidence. Do not expose the private cause remotely.                                                                     |
| Current-format save/load                              | Persist admitted fictional text at the coherent cut; do not save an open microphone, active call, pending ring or audio backlog as resumable play.                                      |
| Timeline restore                                      | Apply DG25: cancel obsolete work, preserve real costs/current blocks, and never resend discarded-future words or repurchase media automatically.                                        |
| Account/source erasure or revoked access              | Stop further retrieval and playback; invalidate retained media derivatives under the actual data owner. Deletion does not guarantee external processors or recipients recorded nothing. |

Admitted request, acceptance, ending and message evidence remains in the saved private history wherever legitimately present at its cut. An old pending request or accepted session is historical on load, not a resumable connection; recipients never gain an invitation that was previously withheld. No call request received during a pause is queued to ring on resume. After return, a person deliberately requests a new conversation. Local drafts follow existing scoped retention; a draft from an ended call may be deliberately moved into an ordinary message to the same still-authorized contact, never automatically sent.

Administrative correction and ordinary spoken clarification remain different owners. A playback error is not historical speech correction. An inaccurate transcription caught before Send needs only editing. After an accepted mistaken turn, the person corrects through actual new communication under DG25.

## 8. Economics and bounded work

The first media offer uses an **explicitly configured world-host media allowance** with delegated per-account admission. It does not charge an unrelated resident's cognition allowance. The operator must identify the actual payer, enabled capabilities, finite aggregate spending ceiling and per-account share before any remote processing is enabled. A missing or zero allowance leaves the remote media action unavailable and text usable. This design does not choose a public price, authorize an appropriation or assume the current AI ledger already implements media.

Where qualified device speech can read locally without a remote processor, disclose its actual behavior accurately and avoid unnecessary paid synthesis. Do not call a platform voice “local” merely because the browser exposed it; processor/network behavior still needs qualification. No user is forced into paid synthesis for ordinary screen-reader access.

A processing purchase is for one bounded dictation or one rendition of existing text. It is not another request to invent an NPC reply. Admitted reservations include the selected route's attributable processing; uncertainty, cancellation and invalid output retain actual obligations under the existing accounting owner. Local playback of an already available permitted asset creates no new synthesis purchase. Clearing a queue before dispatch creates none.

Equivalent renditions may be reused only when words, identity disclosure, voice rights and private scope match. Different listener fragments can require different renditions. First automatic reading therefore targets the player's chosen direct conversation, not every admitted bystander. Required linguistic evidence still reaches every legitimate listener through the native owner; audio suppression cannot make a character fictionally deaf.

The cost view separates transcription, synthesis, delivery, storage, NPC reasoning and shared hosting. Track attempted/accepted/completed/uncertain processing and actual useful listening or successful draft use. Bytes delivered to a hundred listeners are not charged once merely because the source audio was generated once. Likewise, retained history and permission-specific media accumulate beyond a small active queue.

For illustration only, the dated [VC-R12](#vc-r12--cost-and-retention) rates make 100 participants × 6 recorded minutes = 600 processed minutes, or $2.70 for the listed file transcription versus $10.20 for listed live transcription. This excludes synthesis, hosting, transport and storage and establishes neither equivalent quality nor Open Legend capacity. The point is to budget the actual enabled workload before calling it inexpensive.

Admission refusal should affect the optional expensive operation, with a concrete text recovery route. Under overload, do not silently discard required speech evidence, reassign someone else's money, change the hearing radius or produce free-looking synthetic replies. More participants and simultaneous listeners require DG29's measured aggregate qualification.

## 9. Accessibility, privacy and discoverability

Communication settings must be reachable before first capture and while in a call. Group microphone input, local reading, captions and requests by their actual effect. A global **Quiet audio** control stops automatic playback while preserving prior personal preferences for deliberate restoration. The separate Call requests preference controls invitation presentation; existing thread Mute suppresses its cues and Block prevents new contact. It does not erase messages or block every contact.

Per-person playback mute, own microphone control, call-request blocking and deletion are separate actions. A muted presentation does not rewrite fictional perception. First-stage playback is entirely local to the listening human; speakers do not learn whether someone enabled it.

Use persistent text state for recording, a submitted transcript awaiting review, uncertain sending and call acceptance. Do not rely on color, animation, audio alone or a tooltip on an unfocusable control. Changing reading speed or voice must not reset the draft or obstruct ordinary game controls. Permission dialogs, denied devices, narrow viewports, enlarged text and the actual keyboard/IME workflow are part of the qualification.

Raw local captures are temporary input, not a recording library. Remote processing uses the disclosed route's actual retention. Application text/history and processor retention are different facts. No private audio content belongs in broad logs, URLs, creator diagnostics or reusable public pack assets. First scope supplies no exportable microphone recording or voice clone.

## 10. Player scenarios and acceptance conversations

| Scenario                                                                    | What should happen and why                                                                                                                                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A hurried gatherer asks where a resident left a tool                        | Complete permitted words appear normally. Optional reading can accompany movement; the player stops it to act. The feature supports the outing rather than requiring a performance. |
| A player dictates “Do not give away the last two branches”                  | They inspect and repair the candidate before Send. The microphone never creates an agreement or transfers items by itself.                                                          |
| Someone overhears only “meet … bridge”                                      | Their rendition contains those fragments and neutral gaps. It has no secret words, distinctive hidden voice or current source location.                                             |
| A resident's preview appears, then is invalidated                           | No character audio was published. The temporary text follows the existing preview contract; there is no fictitious utterance to undo.                                               |
| Two contacts exchange thirty-second call invitations repeatedly             | The fixed request bounds and quiet recipient controls apply; ignored attempts do not create paid apologies or leak blocking.                                                        |
| Two humans arrange a meeting over slates                                    | Both explicitly accept, submit private turns and end. Either may type throughout with audio unavailable. Possessions and travel remain ordinary world actions.                      |
| A hungry resident receives an invitation                                    | The resident may continue their meal. No-answer tells the caller nothing about hunger, sleep or budget. A later accepted answer requires actual agency evidence.                    |
| A call ends as a turn is accepted                                           | Exactly the actually admitted turn survives under its receipt. A client timeout cannot create a duplicate or pretend the words were never sent.                                     |
| A shared world is restored halfway through dictation                        | Capture stops, old candidates are fenced, actual saved private history is restored, real charges/blocks remain current, and no call resumes.                                        |
| A player reads an old private message after taking control of another actor | Current access is checked; a previously cached voice cannot bypass DG24's new-controller restriction.                                                                               |
| Many NPCs speak in a crowded scene                                          | Native hearing preserves complete required evidence. Selective bounded reading stays understandable; dense media work is measured separately before it is offered.                  |

Product acceptance asks whether participants can explain what was actually said, what they merely drafted, what they heard and why a call is private. Useful performance evidence records time to usable text, time to corrected submission, interrupted/abandoned listening, missed automatic playback recovery and actual processor cost. No numeric satisfaction score, transcription accuracy claim or latency target is asserted without measurement.

A stage should be reconsidered if players routinely wait for audio before acting, lose survival progress while configuring it, cannot recover through text, or prefer ordinary messaging because the invitation ceremony adds no value. A simpler successful offering remains a valid release.

## 11. Physical speech and further hearing: retain the proper next decision

PS04 remains the owner if gameplay needs interruption or arrival midway through a spoken sentence. Its selected later meaning is that submitted words are intended, delivered phrases become actual speech, and each listener receives only what they can perceive at those delivery boundaries. Movement, obstruction and interruption affect future phrases; captions and audio replay do not restore missed words.

No provider's played-audio timer establishes the exact emitted transcript. [VC-R11](#vc-r11--interruption-is-not-transcript-authority) documents a concrete alignment limitation. The future authored phrase-duration/overlap rule must be qualified at supported simulation speeds, with pause, late arrival, hidden tabs and restore. It should not buy a new NPC decision per phrase. A continuous live human channel additionally needs a truthful relation between actual human sound, uncertain transcription and the recorded occurrence; reviewed dictation avoids pretending that question is solved.

For ND16, select an extension only when its absence blocks a wanted game decision: hearing through an actual doorway, recognizing a known unseen person, understanding another language, or waking for a real alarm. Each changes knowledge or behavior and needs its own authoring/acceptance scope. The present design deliberately selects none of those laws. Text accessibility, direct hearing and useful read-aloud remain complete without them.

## 12. Playability critique and resulting decisions

The main risk was trying to demonstrate voice technology instead of helping people play. This review made the following choices:

- **Keep text immediately complete.** The food/time arithmetic makes compulsory listening particularly poor in this world.
- **Use submitted-turn calls first.** That preserves reviewed wording and zero idle model work. It also removes claims of natural continuous human media that this scope cannot honestly support.
- **Keep calls optional and secondary to a note.** If shared attention does not improve a real coordination scene, stop at messages.
- **Avoid a new acoustic law merely to fill DG26.** Neutral non-spatial reading respects current uncertain identity without requiring voiceprints or room simulation.
- **Bound presentation, preserve evidence.** A small playback queue solves attention pressure; it does not justify shrinking fictional audiences.
- **Avoid automatic narration of previews.** A slightly earlier voice is not worth inventing speech that never committed.
- **Make microphone recovery an actual complete journey.** Reviewed input, no automatic send and scoped late-result handling protect ordinary play as well as consequential wording.

The resulting feature offers convenience before complexity. Its technical follow-up must implement and measure the selected behavior, not reopen every unselected media family as an implicit prerequisite.

## 13. Research and evidence

All sources below were accessed 2026-10-07. Records distinguish documented behavior from this design's inference. Official documentation establishes particular capabilities and acknowledged failures, not Open Legend enjoyment, latency, affordability or device qualification. No provider request, synthesis, transcription or runtime test was performed for this design; additional Jev spend was $0.

### VC-R01 — Different accessibility functions

Microsoft's [Xbox Accessibility Guideline 119](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/119), updated March 4, 2026, distinguishes incoming speech transcription, outgoing synthesized speech and local reading of received text. It recommends usable text entry and accessible preferences. **Inference:** naming those jobs separately prevents an optional reading voice from being mistaken for an accessible continuous voice channel. The guideline's communication examples do not override this game's listener permissions.

### VC-R02 — Captions and their controls

Microsoft's [XAG 104](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/104) and [XAG 120](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/120), updated March 4, 2026, cover spoken/non-speech equivalents, readable caption configuration and accessible communication entry/settings. **Inference:** test the entire permission, capture, correction and call-control journey, not only the transcript. Direction and labels can describe only legitimately available evidence. Public article bodies were retrieved despite a generic site authorization banner.

### VC-R03 — A repaired audience mismatch

Rare's [text-to-speech support](https://support.seaofthieves.com/articles/360022314553--Configuring-Text-to-Speech-Game-Transcription), updated April 27, 2023, describes reading typed chat/emotes and adjustable rate. The publisher's [Sea of Thieves release 2.7.3](https://store.steampowered.com/news/posts/?appids=1172620&enddate=1679916032&feed=steam_community_announcements), dated February 16, 2023 within the feed, records a fix making nonverbal Speaking Trumpet whispers match whispered voice reach. **Inference:** test text/audio audience parity directly; a private-looking modality can leak through another representation. These are historical documented behaviors, not present-day platform qualification. Other Rare support routes intermittently failed during independent retrieval and are not relied on here.

### VC-R04 — Text fallback must work

Kinetic Games' [v0.11.1.2 voice-recognition update](https://kineticgames.co.uk/news/phasmophobia-voice-recognition-update) describes particular voice-operated interactions and Xbox fallback to Text after microphone disconnection. Its [v0.17.1.4 notes](https://kineticgames.co.uk/news/phasmophobia-v01714-patch-notes) record a fix to unusable VR text input and identify cross-platform voice issues in that version. Retrieved bodies expose versions but no reliable publication dates. **Inference:** qualify the fallback on the offered controls. Neither report establishes an ongoing failure in the present game or exact recognition.

### VC-R05 — Deliberate capture

Discord's [Voice Input Modes 101](https://support.discord.com/hc/en-us/articles/211376518-Voice-Input-Modes-101-Push-to-Talk-Voice-Activated), updated March 25, 2025, documents background-noise/sensitivity problems, clipped endings, press-to-talk and browser-focus limitations. **Inference:** explicit capture, a toggle alternative, visible state and editable output address recognizable failure cases without importing Discord's latency figures as game guarantees. Automatic activity detection remains unselected.

### VC-R06 — Quiet and mute have different effects

[VRChat's Safety and Trust System](https://docs.vrchat.com/docs/vrchat-safety-and-trust-system), with only a relative update label, documents individual voice mute and broad Safe Mode. It explicitly says Safe Mode overwrites custom settings. **Inference:** provide distinct own-input, local-playback and contact controls; a temporary broad quiet action should retain the preferences a player expects to restore. A mute is neither amnesia nor permission to record private speech.

### VC-R07 — Calling can reveal presence

Signal's [Voice or Video Calling](https://support.signal.org/hc/en-us/articles/360007060492-Voice-or-Video-Calling), undated, distinguishes connection pending, an online phone ringing and an answered call. **Inference:** deliberate request and acceptance are useful, but copying Ringing would contradict DG24's undisclosed availability. The selected caller state reports only its own request until the recipient deliberately accepts. This design does not claim Signal implements Open Legend's hidden-availability policy.

### VC-R08 — Select the gameplay use of sound

Respawn's [Apex audio update](https://www.ea.com/games/apex-legends/apex-legends/news/showdown-audio-update), October 21, 2025, prioritizes useful cues and describes doorway blending and remaining culling. Valve's [Steam Audio overview](https://valvesoftware.github.io/steam-audio/doc/capi/index.html), undated, distinguishes direct occlusion, transmission and indirect paths. The Indie Stone's [Build 35 notes](https://projectzomboid.com/blog/news/2016/12/build-35-released/), December 2016, include alarm-clock waking. **Inference:** those are distinct useful capabilities, not a mandatory all-at-once sound system. None proves affordability or enjoyment here; an alarm needs an authored waking rule.

### VC-R09 — Recognition is proposed input

OpenAI's live [file transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text) distinguishes bounded recordings and ongoing audio and warns that vocabulary hints need evaluation so unspoken terms do not appear. **Inference:** keep recognition editable, use only permitted vocabulary and never promote a guess into a character's exact words before deliberate Send. Provider upload limits are not this game's selected capture length.

### VC-R10 — Voice rights and catalogue uncertainty

OpenAI's live [text-to-speech guide](https://developers.openai.com/api/docs/guides/text-to-speech) documents generated-voice disclosure and custom voices with consent recordings and matching samples. It recommends a model whose [catalogue page](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts) labels it deprecated at retrieval. **Inference:** available synthesis is not a selected qualified model; use legitimate stock voices, avoid inferred impersonation and recheck the actual route before implementation. The contradiction is retained rather than silently resolved.

### VC-R11 — Interruption is not transcript authority

OpenAI's live [Realtime interruption guide](https://developers.openai.com/api/docs/guides/realtime-conversations#interruption-and-truncation) states that its truncation operation lacks precise audio/text alignment and does not supply a correspondingly truncated transcript. **Inference:** stopping presentation cannot establish a listener's exact emitted words. PS04 must own that world meaning independently; a provider conversation is not another character history.

### VC-R12 — Cost and retention

OpenAI's live [pricing](https://developers.openai.com/api/docs/pricing) lists estimated file transcription at $0.0045/audio minute for `gpt-transcribe` and live transcription at $0.017/minute. Its [data controls](https://developers.openai.com/api/docs/guides/your-data) distinguish file-transcription retention from default thirty-day abuse monitoring for synthesis/realtime and approval-dependent exceptions. **Inference:** the illustrative arithmetic in §8 cannot choose a provider or promise zero retention. Recheck actual route, model, region and terms at qualification.

## 14. Handoff and remaining work

This document owns the selected product behavior. [HE07](../maintainers/hearing-and-speech.md#he07--optional-listening-and-reviewed-dictation) owns listening/dictation delivery; [NC23](../maintainers/narration-and-conversations.md#nc23--private-submitted-turn-calls) owns calls; [voice constraints](../limits/voice-and-calls.md) collect proposed envelopes and absent capacity qualification. Existing MP, PS04, data, authority and platform owners retain their responsibilities.

The technical pass must identify the actual funded route, voice rights and privacy terms, fit it into existing authority/spending, and demonstrate each enabled journey. Product design does not close any runtime, accessibility, NPC-quality or aggregate-cost gate. No feature in this document is described as already delivered.

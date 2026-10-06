# Keep in touch across an outing

| Status      | Current progress                                                                                                 | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG24 product draft; research and review are being reconciled. No remote-message capability is currently claimed. | 2026-10-06   |

This specifies DG24 and ND14's contacts/asynchronous-text scope. The [authored world profile](../worlds/base/text-messages.md) selects a concrete later-world communicator. NC/MP/CR retain communication, private evidence, participation and delivery work. Calls and voice remain DG26. This is a product proposal, not an addition to current primitive starts or a technical architecture.

## 1. The experience worth building

Two people meet, choose to stay in touch, then pursue separate activities. Later, one leaves a short message: “I found the camp we talked about. I'll return there after my outing; bring the berries if you still want to trade.” The recipient can read it when they next choose to use their communicator, answer, change the plan or carry on. Neither must remain in a conversation panel or online at the same time.

The value is continuity across distance and separate sessions. A message can spare a pointless search, preserve an invitation, explain a delay or make a reunion possible. It does not transport the berries, establish an agreement by implication, expose the recipient's location or require a reply. Current small crafts can take only seconds; “notify me when this pouch is ready” is not sufficient justification for a whole correspondence system. [DG22's production arithmetic](../worlds/base/durable-agreements.md#actual-production-economics) makes that comparison concrete.

The first experience uses **one-to-one plain text between consenting known contacts**, through a real installed world affordance. Human-to-human delivery is independently useful and requires no language-model call. An NPC becomes a correspondent only after its reading, voluntary response and derived-private-evidence behavior are complete. There is no automatic assistant answering service attached to every resident.

## 2. Current reality and the missing consumer

The [archive's phone direction](../../archive/03-design-proposals/world-and-player-experience.md#phones-and-spatial-conversation) explicitly places contacts/text after local conversation and leaves the affordance's arrival open. A phone is not an assumed primitive possession. This proposal selects one optional correspondence-equipped world profile; it does not silently alter every world's history or economy.

Current main was inspected at [0a3ab79b](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425). The current conversation record owns local participant intervals, actual speech, listener-specific awareness, leaving and merges. It has no delivered contact permission, private mailbox or read-state journey. Its one-active-conversation rule and game-time inactivity close are local interaction policies, not suitable lifetimes for asynchronous text. [Current conversation owner](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/packages/domain/src/conversations.ts), [current product contract](../narration-and-conversations.md#6-durable-conversation-lifecycle).

An unreachable intended speech recipient can currently result in the speaker speaking aloud. The new text route must never use that fallback. Failed private sending cannot become public speech, a spatial caption, a global event body or a local conversation message. A whisper is still potentially overheard sound; it is not the same permission as a private message. [Speech intent](../narration-and-conversations.md#speech-intent-and-audience), [hearing](../hearing-and-speech.md).

Current multiplayer separates account, session, person and controlling connection. Creator access excludes human-private messages and notes. It does not yet prove that a human's private text can safely flow through an NPC's later mind and creator diagnostics. That is substantive new dependent work. [Multiplayer authority](multiplayer-authority-feature-spec.md), [D48's private-content boundary](../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary).

## 3. A real world affordance

The reference later-world family is a **personal message slate**: an explicitly authored magical communication object that can carry text to another enrolled person in the same world. Its description states that distance within that world does not delay messages and that recipients read at their own convenience. Another world may use phones or fixed terminals with its own disclosed rules. The first proposal does not simulate radio towers, batteries, signal maps, postage or electronic manufacture.

The family must actually be installed and admitted before its controls appear. A creator can explicitly add a finite set of blank slates to a correspondence-equipped scenario. Acquiring one uses actual possession and ordinary transfer. Knowing the idea, owning an unrelated object, joining the world or typing “I have a phone” supplies no capability. An ordinary recipe or invention for replacement remains separately supported work; a missing slate is not automatically conjured.

A person activates an actual carried blank slate for themselves. Activation clearly binds that device to this world's stable person identity. It creates no contacts and shares no real account identifier. The first profile permits one active bound slate per person. A replacement requires another actual blank device and explicitly disables the earlier one. Owning a second slate does not create another correspondent, more sending allowance or access to another person's address.

Reading new messages and sending require that living, awake, participating person to carry and be able to operate their active bound slate. The first reference body is a humanlike person capable of handling it; broader species need an authored operating affordance. Reading or sending does not automatically stop an otherwise compatible walk or conversation. It grants no invulnerability, teleportation, pause or protection against ordinary needs. Urgent native consequences remain authoritative.

Contacts, accepted message history and receipt evidence belong to the person and permitted participants, not the physical item's inventory. A finder gets the actual lost object, not its owner's private text or identity authority. The owner can revoke a lost device and manage their own blocking preferences without possessing it. Their previously read text remains eligible under ordinary personal memory/history rules; losing a device does not cause amnesia. New unread content still requires a usable communicator to be presented in play.

## 4. Becoming contacts

The first contact exchange is local and mutual. During an actual clear conversation with a recognized addressed person, choose **Exchange contacts**. The invitation names the specific person using the initiator's legitimate recognition. It explains that acceptance permits each to send private text in this world, without revealing presence, read state or a real-world account identity. No permission to trade, enter property, inspect possessions or command the recipient is included.

The other person can accept, decline or ignore the invitation. An NPC must choose independently through its ordinary admitted decision path; an invitation is not model-generated consent. Acceptance records this exact pair and scope. A duplicate acceptance returns the same contact relationship, not a second address. A newly learned display name changes the local label, not who the contact is.

An invitation remains usable only while the original two people remain eligible for that local exchange. Leaving its local channel, losing clear addressing, death or withdrawal closes it; a later remote acceptance is not supported. The first scope permits one outstanding outgoing contact invitation per actor and one invitation for the pair. Repeating it does not create more notifications or reflection work. A declined or ignored invitation grants no remote channel.

There is no world population directory, guessed-name address lookup, invitation by account ID, nearby-phone scan or automatic address-book import. A contact cannot introduce a third person by forwarding an identifier. A new correspondent requires their own consented local exchange. Existing social acquaintance is useful recognition, but it is not standing permission to send remote messages.

Contact exchange does not require friendship, trust points, payment or a completed quest. People may exchange details to coordinate one outing and later stop receiving messages. The invitation should be a small optional control, not a forced onboarding dialog or a new emotional negotiation every time they talk.

## 5. Compose, submit and understand the result

**Messages** opens the person's permitted contacts and threads. Choose a known contact, write plain text, and use **Send**. The addressed person and world remain visible during composition. The draft has no audience and no world effect before sending. The first version preserves an unsent draft while that panel is hidden in the current tab, but makes no saved-draft or cross-device recovery promise; leaving the page with unsent text warns before discarding it where the client can provide that warning.

Send is explicit. Enter makes a new line; the visible button and an advertised keyboard shortcut submit. Opening a thread or focusing the editor never sends. Reject empty or over-limit text with an actionable explanation while retaining the draft. Do not automatically split a long message into many messages. Ordinary Unicode text is supported; first scope has no attachments, embedded items, money, executable markup, automatic URL previews, reactions, forwarding or group recipients.

The sender sees one of these truthful outcomes:

| Sender display       | Exact meaning                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft                | Only this unsent composition exists. The world has not accepted it.                                                                                                              |
| Sending              | An explicit submission is awaiting an authoritative result. This does not prove any arrival.                                                                                     |
| Sent to world        | This world durably accepted the sender's exact message submission. It does not certify recipient arrival, reading, availability or a reply.                                      |
| Not sent             | The submission was not accepted, for an own-scope reason the sender may know, such as no usable slate, no current control, invalid text, a sending allowance or service refusal. |
| Result not confirmed | The connection failed after submission and the client cannot yet tell whether it committed. Resolve the same submission before offering a deliberate new copy.                   |

Use **Sent to world** deliberately: recipient policy is private. A known contact may have blocked new arrivals, lost access, died, or have no usable device. The sender's receipt confirms only their own accepted submission. It is identical with respect to those hidden recipient conditions and must never imply a successful delivery that did not occur. A recipient who currently permits the message gets its actual inbox record; otherwise it does not enter their readable inbox. Text submitted while blocked is not replayed if they later unblock.

That distinction belongs in concise help beside the status: “Accepted here. Delivery, reading and replies are private.” Do not provide ticks, color changes, counts, error details or timing hints that covertly reveal the hidden recipient state. Ordinary service and own-device failures can remain explicit. The contact chooser's label and last-known identity must not update from hidden world changes.

Once accepted, a message cannot be edited, recalled or unsent from the other person's history. A correction is another explicitly sent message, optionally linked to the original. This preserves what the person actually received and any consequent choices. Duplicate delivery or reconnect resolves the original message once; it cannot create another speech event, repeated payment or multiple NPC response opportunities.

## 6. Arrival, reading and a possible reply

### A mailbox is not a mind

The world can accept and retain eligible text while its recipient is asleep, absent or temporarily unable to operate a slate. That is mailbox arrival, not a perceived utterance. The person has not thereby read the words, learned the sender's claim or made a promise. No public notification or sleeping-body awakening occurs.

When eligible to use the device, the person can encounter one quiet **Messages waiting** indication. It carries no body preview and does not announce exact unread totals to bystanders. Hide or mute that cue without losing the accepted text. It must not interrupt movement, seize camera/focus, overlap combat controls or keep a departed human's body active. The ordinary attention and participation policies still apply.

Opening an eligible thread presents a bounded page of exact text in its accepted order with sender labels and world times. Presentation creates the recipient's permitted reading experience. It proves the text was made available in play, not that the real human attended to every word, understood it, agreed or intends to answer. Merely receiving an inbox record, loading hidden UI or previewing a row must not count as reading the body.

The person's own unread marker clears for the actual messages presented. There is no outbound read receipt, last-seen time, online indicator, typing indicator or automatic “busy” answer in the first scope. A person can explicitly send “I'm at camp now” or “I'll answer later”; that remains their statement at that time, not a live tracking permission. Marking a thread unread is a personal reminder only and never makes already read text unknown again.

### An NPC chooses when to attend

A qualified NPC receives a coalesced owner-private opportunity that messages are waiting, not an automatic paid generation for each arrival. It can continue a valid activity, attend later, mute a correspondent, read or do nothing. New arrivals while the same cue is pending do not force repeated routing. Reading is a supported native activity; actual message text becomes available only through that permitted operation.

After reading, the resident can decide whether a reply is warranted under ordinary cognition and spend admission. They may answer, ask a question, decline, choose a supported action or remain silent. A delivered text supplies neither a mandatory response nor an urgent survival override. One shared world budget still owns reasoning; there is no new per-message or per-contact inference allowance. No budget or provider availability means no fabricated explanation or automatic answer.

Sending several short messages should not buy several full AI responses. Coalesce the current permitted unread material within the existing bounded context; retain later material that does not fit for an explicit later reading opportunity. Do not silently omit a required instruction or old promise to produce a fluent answer. The first unread operation has its own small envelope in [the profile](../worlds/base/text-messages.md#limits-and-operating-cost); it does not authorize automatic mailbox draining or paid catch-up.

An NPC reply must use the same explicit remote-text route and the current contact/device/authority rules. It cannot fall back to speaking the message aloud. Local conversation remains independently available. A message panel is not active membership in every stored thread, and switching threads does not join, leave or merge local conversations or private histories.

## 7. Private correspondence and later conduct

Participants may use the text they actually receive. A location description is testimony: “the berries are by the old camp” does not reveal current stock, coordinates, paths, hazards or the sender's present position. A message about a recipe may communicate permitted testimony under ordinary learning rules; it cannot install a method, grant missing practice or transfer a finished item. Discussing a commission remotely does not extend DG22's first local acceptance or exact exchange capability. UI must name that limitation when a structured action is attempted.

The first NPC disclosure policy is explicit and new: **a private human–NPC message and its derived content cannot be quoted or paraphrased to nonparticipants through automated NPC output**. This includes recollection, subject notes, self-understanding, plans/reasons, appraisals, narrator text, search, diagnostics, counts and exports. Creator inspection of an ordinary NPC's mind is not an exception. A world module, new identity label or reflection cannot strip the restriction.

The NPC may use the message for its own lawful choices. Observers can see actual movement or work under ordinary perception. They do not get the private reason attached as an action label, narration or inferred conversation source. Outgoing speech to another audience must use independently permitted evidence. If a mixed derived result cannot safely separate restricted material, withhold that result from the narrower audience. A prompt that says “keep this secret” is insufficient qualification.

First scope includes no NPC forwarding, declassification, shared inbox or secret-sharing permission. A human can voluntarily retype or say text they are allowed to read as a new ordinary event; the game cannot promise to prevent screenshots or manual retelling. That new act has its own real audience and grants no retrospective access to the private thread. Technical access protection and a participant's deliberate new disclosure remain different facts.

Public-world reporting and platform staff inspection remain their explicitly selected policy owners. The first profile is an invited private world, with own blocking and existing access management. Do not claim a complete public messaging service or create creator access to all private mail as a convenient moderation tool. D48's game-access guarantee does not promise protection from a person administering the host/database, nor does this feature select end-to-end encryption.

## 8. Mute, block, remove and lose access

**Mute** suppresses this person's thread alerts and automatic waiting-message cues, while retaining allowed incoming text for deliberate reading. It does not announce itself to the sender or change what either person has already read. It has no expiry by default; the owner can undo it. NPC mute choices remain their own.

**Block** stops new text from this correspondent entering the recipient's readable inbox and suppresses notifications from the existing thread. Already arrived messages remain in that person's private history for deliberate access, and already read evidence retains its normal meaning. The sender gets no blocking notice or changed delivery signal. Unblocking permits future allowed arrivals only; it does not replay blocked submissions or restore another person's independently revoked permission. The blocking person must explicitly unblock before sending again themselves.

**Remove from contacts** hides the contact from ordinary addressing and archives the thread for that owner. Offer **Block and remove** when the person also wants to stop arrivals, explaining both effects. Merely archiving a thread does not prevent a permitted new message from bringing it back. Removing a label or hiding a thread is not erasing either participant's evidence, ending a commission or making earlier words unknown.

Blocking is bound to the stable person in this world. A new slate or browser tab cannot bypass it. A third-party contact forward cannot evade the required local consent. Normal world access revocation immediately stops fresh reading/sending under that revoked authority, including delayed results; it does not disclose private reasons or reassign the human's history to a new owner.

An actual lost/destroyed device prevents further operation until a valid replacement is activated. New eligible messages can wait for that person without showing a device-status receipt to senders. Human death/Continue preserves the person and permitted history, while current possession loss can leave the actual device on the separate corpse. Reconnecting does not revive a dead human or summon their slate. A dead NPC does not read, reply or continue as a hidden correspondent; no automatic death notice is sent through the channel.

## 9. Time, persistence, correction and restoration

The first slate route has no artificial distance delay, delivery fee, per-message consumable or expiry of accepted text. There is no promise of network availability when the world service is stopped. World time on accepted messages records the fictional time that actually exists; use a service-recorded order to distinguish several submissions while that clock is unchanged. Operational timestamps need not expose another person's session or presence.

When the world is paused, existing permitted history remains readable as history, but new in-world sending, first presentation of unread text and NPC reading wait for the person's eligible active play. Compose can remain a private draft. A paused world does not wake merely to deliver a message or accrue background thought. The UI explains that sending will be available when play resumes; it never queues a hidden automatic send on Resume.

Save/restart preserves accepted submissions, actual inbox arrival, which messages were presented, contact permissions and current device bindings without duplicate messages or new paid calls. Protect current access and erasure through every read, export and restored state. If the supported save/export path cannot preserve private content without exposing it to a creator, that path must be completed before enabling private correspondence; hiding the inbox UI is not an adequate substitute.

Ordinary correction is a new attributed message. Guarded source erasure remains the existing privacy owner and must remove forbidden derived text and stale contexts; hiding a thread is not erasure. Preserve actual native obligations separately. [DG25](../maintainers/needs-design.md#dg25--deliberate-corrections-and-shared-restoration) selects shared fictional rewind and private-channel treatment. Its settled common policy is a prerequisite to offering that optional rewind with messaging, not to ordinary same-state restart or useful current-time text.

First scope supplies no cross-world recipient, external push notification, email/SMS forwarding or human account chat outside the world. Those would change audience, retention, operating costs and the meaning of absence. A phone-shaped object does not implicitly enable them.

## 10. Complete situations and their outcomes

| Situation                       | Required course of play                                                                                                                               | Completion or honest failure                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meet, separate, return          | Two eligible people consent to contact exchange, pursue different supported activities, send an actual note and later read it using their own slates. | A later chosen reply or reunion can use the words actually read. No real-time attendance, live location or automatic meeting is assumed.                                                    |
| Recipient is absent or asleep   | The sender receives only their own submission acknowledgement. Eligible inbox text waits.                                                             | Return/waking makes a quiet reading opportunity possible; it does not fabricate past awareness, awaken the sleeper or purchase a reply.                                                     |
| A resident is busy              | Several messages arrive during actual work. A single private cue can wait; the resident chooses whether and when to read.                             | Native work continues, messages remain reachable, and no response is a legitimate result. Repeated sending buys no extra inference allowance.                                               |
| Someone loses a slate           | Actual possession changes or the device is destroyed. The finder cannot read the owner's history.                                                     | The owner can revoke it, obtain a real replacement, and recover permitted correspondence under the same person identity. No replacement means new reading/sending stays unavailable.        |
| A message's result is uncertain | The sender loses connection after pressing Send.                                                                                                      | Reconcile the original receipt; show one accepted submission or an explicit nonacceptance. Do not encourage a duplicate while the result remains unknown.                                   |
| Unwanted contact                | A recipient mutes, blocks or removes a contact; a sender tries another device or tab.                                                                 | Own preferences act consistently without revealing block state. New devices do not bypass the person-level restriction; unblocking does not replay excluded text.                           |
| Private NPC context             | A human writes a private plan; the NPC later reflects, receives a local visitor and is inspected by a creator.                                        | The NPC may act on lawful personal knowledge, but no private message, derivative or reason leaks to the visitor/creator. If this cannot be qualified, NPC private text remains unavailable. |
| A plan changes                  | A sender submits a correction after the recipient has read the original.                                                                              | Both retain the original and later correction in their actual order; the recipient learns the change only when actually reading it. Earlier actions are not retroactively changed.          |
| A long correspondence           | The thread contains many accepted messages and sources later corrected or forgotten.                                                                  | Bounded paging keeps retained eligible text reachable; context preparation is truthful about omissions/refusal, and forbidden sources never return in summaries or exports.                 |

Show no auto-generated “They must be busy” explanation for silence. The player may reasonably infer possibilities, but the system does not know or disclose the recipient's private reason. A thoughtful message that gets no answer can still be valid play; qualification must also establish that using the feature is worthwhile often enough to justify it.

## 11. Economics, performance and delivery order

Human plain-text acceptance, storage, paging and status require no model. Exact text remains sufficient presentation; do not automatically summarize or narrate every message. An optional NPC answer uses the existing complete budget for preparation, retrieval, routing and generation. Private-source restrictions apply before candidate preparation and after delayed results, not only when rendering a panel.

The profile supplies bounded message size, sending rate, pages and NPC unread intake. Those limits do not make lifetime text, contact count, private derivatives, delivery receipts or inactive inbox storage finite. Keep no new silent message-expiry policy; record actual growth with NC/data retention owners. Read the requested thread and permitted page rather than scan every world's contacts or every lifetime message to show one unread indicator. Background queues must not buy their way through a returning person's entire mailbox.

Rate limits depend on the sender's own real-time submissions, not the recipient's reading, inbox size or response. Otherwise an apparently full allowance can become a covert read receipt. Each accepted submission counts once across devices/tabs, including submissions that do not enter a blocked recipient's inbox. Native privacy and delivery do not wait for inference. A slow, overloaded or stopped service returns its honest current outcome rather than claiming fictionally delayed postage.

1. **Select the actual world and exact private route.** Install the explicit affordance and its finite initial objects, consented pair addressing, owner permissions and declared audience/retention meaning. Complete current-save/export privacy for this new data class before enabling it.
2. **Complete the human correspondence journey.** Two genuinely separate human accounts acquire/bind devices, become contacts, separate, submit/read/reply, lose access, mute/block, replace devices and return. Qualify uncertainty, keyboard use, hidden previews and private payloads. This can finish with zero language-model calls.
3. **Qualify that first experience before expanding it.** Use actual separated outings and separate sessions. Compare effort, missed meetings, human reading time, current clock pressure, message volume and whole operational cost. Remove needless steps; do not add travel delay or consumable postage to manufacture social value.
4. **Complete the NPC correspondent.** Add voluntary native reading and same-channel reply through existing cognition. Qualify private derivatives, public outgoing context, creator inspection, continued work, missing budget, ambiguous knowledge and actual later behavior. A scripted human stand-in does not prove this stage.
5. **Add a broader capability only at its separate trigger.** Shared-world rewind consumes DG25. Group text, forwarding, read receipts, alternate coverage, attachments, calls, public discovery and external notifications each need their own complete policy; none is required for the first useful note.

## 12. Gameplay critique

Communication should support the outing, not replace it with inbox management. The first feature keeps one quiet cue, optional reading, concise text and independent replies. It introduces no streak, response deadline, relationship penalty for silence, compulsory availability schedule or paid catch-up. Existing bodily pacing still needs the CE05 attended-session qualification; a new message panel is no reason to ignore that pressure.

Physical devices create a clear authored-world capability and possible loss without turning private history into loot. No battery or postage is added unless an actual authored world wants those stakes and provides a complete useful alternative. No arbitrary delivery delay is needed to preserve the option of meeting; actual items, local action authority and participants' independent lives already supply reasons to meet.

Sender-facing simplicity costs some certainty: there is no guaranteed delivery/read knowledge. That is intentional in the first private scope. A recipient can explicitly acknowledge a message when they choose. If later players repeatedly need reliable receipt coordination, design an opt-in acknowledgement capability with its privacy meaning; do not reinterpret a current submission acknowledgement as proof of reading.

The material implementation risk is human–NPC confidentiality, not text transport. Keep that dependency visible, preserve the independently useful human path, and do not offer an NPC inbox that leaks through reflection. This proposal settles a narrow product direction under ND14/D48; it does not certify public-service readiness or a privacy capability that has not been built.

## 13. Research

Primary research is being reconciled before completion.

## 14. Maintained records

- World profile: [Personal message slates](../worlds/base/text-messages.md).
- Delivery: [NC](../maintainers/narration-and-conversations.md), [MP](../maintainers/multiplayer.md), [CR](../maintainers/cognition-redesign.md).
- Limits: [Narration and messages](../limits/narration.md), [Multiplayer](../limits/multiplayer.md), [Memory](../limits/memory.md), [AI execution](../limits/ai-execution.md), [Objects](../limits/objects.md).
- Related contracts: [Hearing](../hearing-and-speech.md), [Knowledge](../knowledge.md), [Agreements](durable-agreements-feature-spec.md), [Save/load](../save-and-load.md), [Human-private content](../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary).
- Queue/decisions: [DG24](../maintainers/needs-design.md#dg24--text-messages-inside-an-authored-world), [ND14](../maintainers/needs-design.md#nd14--in-world-remote-messages-and-calls), [D48](../../archive/05-project/open-decisions.md#invention-governance-controls-and-workshop).

# Correct a misunderstanding; deliberately restore a world

| Status      | Current progress                                                                                                    | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG25 product proposal complete; HE/SL technical delivery and live shared/private-history qualification remain open. | 2026-10-06   |

DG25 covers conditional ND17 and ND35. It has one common rule and two independently useful consumers: a new attributed correction, and a deliberately selected complete-world restore. The specification does not authorize technical implementation, change current save permissions or add a required system to ordinary play.

## 1. The experience worth protecting

A player sends someone toward the wrong camp, notices, and says, “I meant the eastern camp.” The listener can learn that correction, ask what happened, ignore it or change their plans. The earlier mistake remains something that occurred. The correction should be easy to make and easy to read later; it should not require opening a world editor, buying a resource or learning how memories are stored. [HC-R01](#hc-r01--signal-an-edit-has-provenance-and-its-own-delivery) informs the provenance choice without importing message editing or read receipts.

A different problem is an unwanted shared past: a creator's mistaken world edit disrupted a session, or a group deliberately wants to continue from an earlier retained point. The creator can inspect that actual point, see what replacing the world means, choose Restore, and return everyone to one coherent paused world. People keep their real memories; the characters and goods in the simulation continue from the chosen history. Restore is consequential, but operating it should not become a game of administrative procedures.

The priorities are ordinary continuation first, a legible correction second, and optional shared rewind when it serves an actual world. Recovery from infrastructure failure already has a separate operational owner. A whole-world rewind is too disruptive to be the default response to a typo, a disappointing reply, a lost fight or a disagreement.

**Selected common policy:** preserve recorded experience unless an explicitly authorized operation replaces the complete supported world history. A new correction adds information at the time it is actually communicated. It does not certify truth, transfer agreement, erase an insult, return a payment or recompute everyone’s life. The first scope does not provide inline historical speech replacement, selective consequence repair, a live alternate timeline or an automatic memory rewrite.

## 2. Current reality and scope

Current main was rechecked at [0a3ab79b](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425), separately from this branch's parent runtime. The following facts and accepted rules are inputs, not new features claimed by this proposal.

| Owner                                                                                | Existing behavior or accepted rule                                                                                                                                                                                                                            | Remaining product consumer                                                                                                                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Hearing and speech](../hearing-and-speech.md#editing-committed-speech)              | Generic editors reject committed speech text/content rewrites. Guarded deletion and importance changes retain existing authority. A correction spoken now is an ordinary new event. Stored listener fragments never reroll from current positions.            | Optional correction affordance and permitted links make an existing social action easier to perform and read.                                                                                       |
| [Creator edit propagation](creator-edit-propagation-feature-spec.md#accepted-policy) | Accepted October 3: changing an authoritative object never automatically searches for and rewrites or deletes characters' memories to make them agree. Actual enforced dependencies and privacy/explicit forgetting remain different obligations.             | DG25 preserves this rule. Earlier CE01 dependency previews and later CE02 optional memory tools remain with their owners.                                                                           |
| [Memory](../memory-architecture.md)                                                  | Witnessed events, testimony, interpretation, source corrections and deliberate forgetting have different meanings. Current derived-state invalidation cannot be treated as selective social repair.                                                           | Characters may revise an interpretation after new evidence without changing the earlier witnessed event or being forced to believe the correction.                                                  |
| [Save/load](../save-and-load.md#current-history-capture-boundary)                    | Current-format whole-world capture, manual save/load, server-owned autosaves, pre-load recovery, atomic installation and paused return are delivered for documented local workloads. Cold evidence and accepted character state are part of coherent capture. | Shared participant notice, current private-channel treatment and supported restore/export boundaries remain SL10/D48/D60 work.                                                                      |
| [D60](../../archive/05-project/open-decisions.md#d60--gameplay-save-and-load-policy) | The creator and authorized OpenLegend system administrators may save/load; ordinary participants may not. Current permissions, accounting and forgetting do not rewind. Autosave tuning is delegated engineering work.                                        | No new participant veto, voting system, compatibility promise or paid-work replay is selected.                                                                                                      |
| [D66](../../archive/05-project/open-decisions.md#d66--re-authoring-committed-speech) | Dedicated administrative re-authoring requires an explicit product choice. Ordinary speech corrections are already valid.                                                                                                                                     | Proposed disposition: use new attributed correction for the first experience. A different fictional past uses an available complete-world restore; administrative inline retcon remains unselected. |

[Current save source](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/apps/server/src/game-saves.ts) and [bounded recovery evidence](../verification/checkpoints-and-recovery.md#bounded-history-checkpoints-and-recovery) distinguish delivered mechanisms from still-open hosted, population, live-provider and future-owner qualification. The [save tracker](../maintainers/save-and-load.md) retains those states. None is closed by this product document.

The source audit also found an existing administrative memory-correction capability, not a delivered player correction shortcut. It links a retained actor source to an already perceived event, creates no new speech, and does not verify the new statement's truth or chronological priority. Its current conservative invalidation can clear that actor's appraisals, subject notes and nonprotected accepted mind content while preserving original received words. The first correction journey below must not silently invoke that broad operation. [Current source correction](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/packages/domain/src/experience.ts), [private administrative admission](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/apps/server/src/world-service.ts). CE02 retains any later selected administrative convenience and its exact-preview requirement.

The current database is the ordinary durability path; a five-minute autosave is not a promise to discard five minutes of every crash. Conversely, seeing moving bodies does not guarantee that the latest background simulation progress has been durably stored. Existing [background-save policy](../save-and-load.md#background-and-synchronous-world-saves) describes that loss window. DG25 adds no new cadence or recovery objective.

## 3. Choose the smallest operation that matches the intent

| Intent                                                                                           | Correct product operation                                                                             | What the result means                                                                               |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Change words that have not been submitted                                                        | Edit the ordinary draft.                                                                              | No event happened; there is nothing to repair.                                                      |
| Correct one's own accepted statement or explain a mistake                                        | Speak a new correction through ordinary Talk; use the optional linked affordance when available.      | A new statement with a current audience. Earlier consequences remain real.                          |
| Correct a private note                                                                           | Submit a new private correction in the same permitted correspondence, under DG24.                     | New exact text and a permitted relationship to the earlier note. No edit, recall or read guarantee. |
| Change a character's interpretation of experience                                                | Present actual new evidence or use separately authorized existing memory work for its stated purpose. | New testimony does not force belief. Creator edits do not automatically repair minds.               |
| Delete material under an existing explicit privacy/forgetting policy                             | Use that semantic owner and its current dependency/authority rules.                                   | Removal of access is not a declaration that every physical consequence never occurred.              |
| Deliberately continue the shared game from an earlier retained point                             | Use the creator/admin complete-world restore journey below.                                           | One selected earlier world replaces current fictional progress, subject to present-day authority.   |
| Recover after server/storage failure                                                             | Use current crash or operational recovery through SL/PD06.                                            | Recover the actual supported durable state, not an invented “best” timeline.                        |
| Keep a later payment while undoing the goods given for it, or edit away another person's refusal | No such correction or restore option.                                                                 | Item conservation, independent consent and a coherent world remain controlling.                     |

A person does not need to know these categories to play. Ordinary drafts remain drafts; Talk remains Talk. The dedicated destructive review appears only when someone chooses to replace shared history. The distinctions exist to keep the visible result honest.

## 4. First correction journey

### Find and correct one's own words

The optional **Correct what you said** affordance appears on the controlled person's own retained utterance in an already permitted Talk/history view. It is not a permission to speak for another actor. The earlier text must remain accessible in the current world history. Someone who cannot currently speak may inspect history and prepare a draft, but actual publication requires the same current body, participation and Talk availability as any other utterance.

Selecting the affordance opens the ordinary Talk composer with a clear reference to the earlier own statement and an empty editable correction. It does not insert a model-written apology, presume what was wrong, copy the old words into a new public quote or auto-send. The player writes the exact new words and chooses their current ordinary recipient/volume. A concise label explains: **“Say a new correction. People hear it here and now.”** Cancel or close before sending produces no event.

Submission uses ordinary speech admission and the existing exact-text receipt. The current intended recipient is not a remote delivery address. Someone who heard the mistake at another location receives nothing until an actual permitted new communication reaches them. Existing fallback and audience behavior must be visible through the normal Talk preview; the correction control does not promise a private whisper or override current hearing.

Once accepted, the new words are a new utterance with their own actual time, speaker evidence and listener-specific fragments. “Correction” describes the speaker's stated relation to an earlier statement, not a system-certified fact. It is possible to lie, misunderstand, partially correct, retract an offer or make a new mistake. The label cannot adjudicate those matters.

If an earlier receipt is uncertain, resolve that original submission through its current command outcome before presenting it as a committed correction target. Repeating a submission after a lost acknowledgement returns the existing outcome; it does not create another apology or another paid response. Ordinary unlinked corrective speech remains available whenever its own admission permits it.

### Read the relationship without gaining unheard words

The new utterance can offer **Earlier statement** only when the viewer independently has access to that earlier statement. The earlier entry can offer **Later correction** only when the viewer independently perceived the later correction. A link never reveals a hidden event identifier, original exact text, source position, unknown identity, correction existence or newly named recipient to someone lacking that evidence. The relationship is a reading aid for permitted records, not an additional secret message to a listener or a memory-invalidation instruction. Current cognition receives actual new words through its ordinary evidence path.

An earlier partial listener retains their original fragment. If they clearly hear the new correction, they can know the new complete words while the old fragment stays partial. Someone who heard neither original words nor speaker identity does not gain either by opening a correction link. A newcomer can understand what they actually hear now; the interface does not imply they witnessed the first exchange.

Links are optional reading aids, not a second account of what happened. If a target is unavailable because of current privacy, erasure or history replacement, show only the current permitted utterance and an unavailable-reference explanation where that reference itself is already known. Do not reconstruct missing text, expose why another participant lost access, or repair old acoustics from where people stand now.

### Let the correction matter socially

A helpful correction may save a journey. A hurried or repeated retraction may increase confusion or annoy someone. A listener may ask why the speaker was so certain, continue an already completed task, or decide the new statement is unreliable. Those are independent character choices using actual permitted experience and existing appraisals. There is no automatic trust refund, apology score, relationship reset or forced acceptance.

The minimal reference scene uses two people who have a reason to meet at a known place. One says the wrong known location, then makes an ordinary correction before separation. A later independent action should reflect what the listener actually understood. The alternate scene lets a listener leave before the correction; they continue with their earlier knowledge until new evidence legitimately reaches them. Both outcomes are coherent. The qualification asks whether the player can understand and act on the difference.

For an NPC's own mistaken statement, the human may ask for clarification through ordinary speech. The NPC may explain, retract, disagree or remain mistaken. Creator control cannot force the NPC to have voluntarily apologized or inject a new line under its identity through this feature. Existing explicit creator/memory powers retain their separate disclosed meaning.

## 5. Corrections across neighboring features

**Agreements:** “I meant two berries” does not amend an accepted DG22 commission, replace its exact terms, revoke a delivered transfer or forgive an advance claim. The speaker may propose a new amendment through the agreement's actual assent journey. A later correction is relevant testimony, but the deal's own native history remains authoritative.

**Care and danger:** “That treatment healed me” is a claim, not a healing operation. A correction cannot reverse actual damage, remove a scar, revive a person or erase a consumed field dressing. DG21 and current death/Continue remain the relevant complete experiences.

**Experience-shaped characters:** DG23 may let later evidence change an outlook. One new corrective statement is one new speech occurrence; repeatedly reopening it is not repeated independent corroboration. Reconsidering an interpretation does not authorize fabricated supporting events or an automatic personality change. Faithful memory, current conservative erasure and protected origins retain their meaning.

**Private correspondence:** DG24's same-channel correction uses its own accepted-message limits, exact private text and actual reading acquisition. The first scope never turns it into public speech or forwards the earlier private body. A human may deliberately say new words they are permitted to know, with that new speech's audience; automated NPC outward language still obeys DG24's private-source restrictions. A message submitted while the recipient is blocked remains unreceived, including its correction.

**Narration and Journal:** An ordinary correction adds a later occurrence. It does not retroactively turn earlier narration into a quote the speaker never said. New narration can describe a later correction when the perspective actually permits both relevant events. A personal Journal edition that has already been exported cannot be recalled from another device. Future in-game views and pending drafts still obey current source access and actual history.

**Creator editing:** CE01's explicit dependency review and CE02's optional selected memory tool remain independent. Similarity to a changed name, object or law does not establish a required memory cascade. This proposal neither duplicates CE02's semantic search nor labels its administrative edits as a character's real learning.

## 6. Correction limits and completion

Use the existing composer and actual speech envelope. Current player Talk accepts up to 1,000 characters, while native/model speech have their own existing bounds; this proposal selects no longer correction payload, separate unlimited quote or automatic split. Private correction uses DG24's 2,000-code-point and 8,000-UTF-8-byte requirements. An over-limit draft remains editable and an unavailable source does not authorize hidden reconstruction.

One optional prior-utterance link accompanies one actual new utterance. There is no correction-specific expiry window, life-of-character correction quota or maximum number of legitimate listeners. Retention and erasure follow the existing exact source owners; history paging follows HE/NC. Correcting a years-old remembered statement can be legitimate, provided its original reference is still available and a new current communication actually occurs.

A human correction has no mandatory model generation. Its new audience, persistence, any voluntary NPC response and any later eligible reflection have the same ordinary costs as comparable speech. It does not fan out retrospective calls to every original listener, regenerate old summaries merely to make the speaker look consistent, or block native play while a “repaired past” is computed. Necessary access/dependency invalidation still belongs to its existing owner.

The complete smaller delivery is an ordinary corrective conversation that works, plus the optional discoverable composer/history relationship if it improves that journey. If players naturally correct themselves and understand the result without the shortcut, qualify and retain that existing experience first. A new toolbar action is not itself the goal.

## 7. Selected shared restoration policy

**First supported scope:** an existing same-world retained checkpoint, restored through the game service by the creator or an authorized system administrator. All currently bound human people must exist in the candidate, and the current supported content and state must be complete. There is one active world afterward. A saved point is not a promise to recreate an arbitrary moment between checkpoints.

**Private fictional history participates in a protected coherent rewind.** Messages, eligible arrivals, read state, private character evidence and their permitted derivatives return to the selected cut with the rest of the world. There is no first separate archive of the discarded future, individual-message rescue or alternate-history browser. The current protected pre-load recovery checkpoint can restore the entire previous world while retained and compatible. It cannot be browsed as a creator-readable private mailbox.

This choice makes the game legible: what happened in the active fiction has one answer. It also means meaningful private progress after the selected point leaves the active game. Make that consequence explicit in the world’s shared-play information and in the restore review and completion notice. A private-world participant must not be led to think their correspondence is a permanently current account messenger exempt from world replacement.

### What rewinds and what stays current

| Kind of state                                                                                                            | Selected treatment                                                                            | Player consequence                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Bodies, goods, physical title/custody, native item-access rules, work, damage, death and scars                           | Restore together to the checkpoint.                                                           | No player keeps a later reward, injury treatment or inventory while the corresponding material use disappears.                              |
| Agreements, advances, association membership, founding powers and their fictional evidence                               | Restore with their actual goods and participants.                                             | A later fulfilled commission can become the earlier unfulfilled commission again; its later payment and delivery do not survive separately. |
| NPC awareness, recollection, appraisals, learned methods, accepted outlook/notes and native intentions                   | Restore accepted state at the cut, then apply current source privacy and erasure.             | No knowledge of the discarded future, replayed life, automatic re-reflection or enforced knowledge that a rewind occurred.                  |
| In-world private messages, inbox arrivals, reading acquisitions, fictional address knowledge and device state            | Restore coherently at the cut, then apply current correspondence and controller restrictions. | Later mail does not reappear as unread. A message unread at the cut may be read after resume as a new acquisition in that restored fiction. |
| Account identity, world entry/control grants, human-private ownership, current blocks/revocations and forgetting/erasure | Stay current and constrain the restored state before disclosure or cognition.                 | A save cannot unban someone, give a new controller an NPC's private past, undo a block or recover erased words.                             |
| Real provider spending, uncertainty, service entitlements and sender anti-abuse allowances                               | Stay current.                                                                                 | Rewind gives no new model credit, duplicate purchase or fresh DG24 sending burst.                                                           |
| Human recollection, outside screenshots/files and already exported Journal copies                                        | Cannot be rewound by the game.                                                                | A human may remember another outcome; that memory is not automatically inserted into an NPC's context.                                      |
| Current user presentation preferences, mute choices and operational autosave settings                                    | Stay with their existing external owners.                                                     | Rewind does not reset readability, account controls or routine recovery configuration.                                                      |

“Current permissions” must not be used as shorthand for every fictional access rule. A later world-item transfer or association decision belongs to the restored fiction. External privacy restrictions still override it; game ownership does not confer access to human-private text.

### Contacts, devices and already read messages

A contact that did not exist at the checkpoint supplies no remembered address in the restored world. Present-day consent alone does not invent an earlier encounter. A contact that existed then remains usable only if present-day correspondence permission still allows it. Unblocking or renewing consent affects future communication; it never replays a discarded message.

A current device revocation never becomes an active old binding after restore. The actual restored item remains real: a revoked binding leaves it requiring legitimate activation under DG24, without restoring the withdrawn identity authority or creating a replacement item. A valid existing binding can continue when both restored possession and current authority permit it. Reconciliation must preserve the one-active-device rule and current sender allowance.

An NPC that read “meet me at dusk” after the checkpoint has no such acquired evidence after restore. The message may still be waiting if it existed unread at the cut; otherwise it is absent. No earlier notification, pending reply, stale summary or restored private thread cache teaches the NPC the discarded instruction. Re-reading a pre-cut unread note is ordinary new acquisition, using current eligibility and ordinary cognition admission.

The human at the keyboard might remember that same note. They may choose to communicate what they know through a new actual action. There is no automated memory policing, accusation of cheating, forced confession or model-written explanation for their real knowledge. The NPC can treat a new account of an alternative past as testimony, not proof that it personally lived it. [HC-R02](#hc-r02--signal-deletion-cannot-promise-universal-unlearning) supports the limit on promises about already received information.

### Current erasure and new controllers

Apply the complete current privacy/erasure restrictions even if the target predates their creation. Do not compare only with the immediately discarded world. Both restored source text and derivatives must obey them. If preserving a mixed private artifact cannot be established, withhold or invalidate it through the existing owner rather than disclosing it. Conservative loss of derived outlook under the current erasure owner is not a claim of surgical preservation.

A human who now controls a former NPC does not acquire that NPC's old private-human corpus by loading a point before the control change. Current principal ownership and correspondence restrictions remain controlling. Native person/body facts can restore without transferring a different human's message rights. DG24's fresh local consent and private-derivative qualification still apply.

## 8. The complete restore journey

### Choose a real point

The authorized creator opens the existing Game save catalogue. Retained saves show the world, recognizable user-chosen name, real capture time, game time, save kind and current known availability. No private conversation summary, hidden death, relationship, unread count or secret location appears as a convenient description. A current name is a label, not permission to ignore the checkpoint's actual world identity.

Only actual retained points are selectable. An expired, missing, damaged, incompatible or currently unsupported point receives its honest condition. A listed integrity-checked package can still fail deeper validation; do not mark it “guaranteed restorable” merely because its checksum is valid. Normal saving remains direct and server-owned autosaves remain background protection. [HC-R04](#hc-r04--minecraft-realms-preserving-a-copy-and-replacing-the-live-world-differ), [HC-R06](#hc-r06--valheim-operational-recovery-uses-a-bounded-set-of-checkpoints), [HC-R08](#hc-r08--no-mans-sky-normal-saving-can-stay-out-of-the-players-way).

### Review one consequential replacement

Choosing Restore opens one focused review with the selected point's name and both times. It states:

> Restore this whole world to the selected save? Progress after it, including private in-world messages and character memories, will leave the active game. Current access, blocks, erased information and real spending stay current. People may still remember later events. The current world must be saved for recovery before replacement.

The primary control is **Restore this world**; Cancel closes the review without pausing or changing play. Keyboard focus starts on the review, not a default destructive Enter action; Escape/cancel and ordinary keyboard/screen-reader access remain available. Do not add a typed phrase, second confirmation, participant poll or compulsory explanation. The selected action and its consequence need one readable decision. [HC-R10](#hc-r10--w3c-protect-consequential-replacement-without-confirming-every-action).

The review covers all current progress up to the moment restoration begins, and says so. Ordinary movement while the review is open does not reset it every frame. A different active history after another restore, a changed target, lost authority or a materially changed participant/binding set invalidates the review and requires a fresh one. A stale confirmation cannot overwrite another operator's newly selected world. [HC-R03](#hc-r03--grounded-an-old-backup-must-not-silently-overwrite-newer-shared-play).

### Admit, preserve and replace

On explicit confirmation, recheck current authority and the selected world/point. Admit only one world replacement at a time; a different competing request returns busy. Repeating the same request resolves its existing outcome. The world's current load owner pauses simulation and commands while preparing the candidate. Current participants receive an out-of-character **World restoration in progress** notice naming only permitted global world/time information. The operation does not wait for everyone to receive or acknowledge the notice.

Show truthful progress states: **Checking save**, **Preserving current world**, **Restoring**, then **Restored — paused**, or the concrete failure. Closing the panel or losing the creator's connection does not cancel or repeat an admitted server operation. The first scope promises cancellation before confirmation only; once admitted, resolve a single outcome rather than offering a false mid-install cancellation.

The current world must be preserved in the existing durable pre-load recovery checkpoint before replacement. If that preservation fails, refuse the load. There is no “restore anyway” button. Do not silently delete private history, skip an oversized record or replace an unsupported definition to make the operation succeed.

Installation replaces the entire supported world together. Participants never see goods from one history alongside debts, corpses or character memories from another. The result reopens **paused** with a fresh permitted view. Advancing is an explicit use of the existing Resume control by a principal allowed to use it; this proposal does not redefine pause/resume roles.

### Understand the result and continue

A connected participant sees **World restored** with target real/game times and the same plain scope explanation. This is application information, not a supernatural world event. NPCs do not hear it or receive an automatic narrative of discarded events. Old captions are not replayed.

The first successful reconnect after restoration shows the latest unacknowledged restore result before admitting new world commands. Reading/dismissing this notice does not grant save authority or resume the whole world. A participant who was offline is not a blocker and loses no existing entry right merely for missing the operation. If several restores happened while absent, show the latest active result and that the world was replaced since their last acknowledged view; ordinary operational history can retain earlier outcomes without an unbounded stack of modal notices.

Invalidate old targets, action previews and history cursors. Keep an unsent in-session text draft private in that same tab where its ordinary draft lifetime permits, label it **Review after restore**, and require a new explicit send against current recipients and terms. A draft has not happened in the fiction; preserving it does not submit it. Account/world changes and logout still clear it under its owner. Pending submitted commands use their actual outcomes below.

## 9. Pending work and truthful failure

| Situation                                                                  | Required result                                                                                                                              | Useful next step                                                                                                              |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Draft or prepared item transfer was never accepted                         | It creates no world effect. Targets/terms need fresh review.                                                                                 | Keep eligible local draft text; choose a currently valid action and explicitly submit.                                        |
| Command completed after the target checkpoint but before restore           | Its original operation may have succeeded in the discarded history. Its fictional effect is absent unless already part of the target.        | Label a queried old receipt as an earlier-history outcome; never silently resend it or call it current delivery.              |
| Receipt was uncertain when the connection failed                           | Resolve the original operation under current authority. Do not infer nonexecution from its absence in the restored world.                    | Present the recorded outcome or remaining uncertainty; a deliberate new request is separate.                                  |
| Old paid generation or delayed message processing finishes                 | It cannot publish, resend, settle an agreement or mutate the restored world. Real charges/uncertainty remain current.                        | Existing paid-work owner resolves that attempt. No automatic paid retry or forced replacement answer.                         |
| Native care, crafting or movement was active at the target                 | Restore its actual accepted progress, materials and stop conditions; continue only when the restored world resumes and current rules permit. | Do not charge a second input, award an extra output or replay the task as a new action.                                       |
| No suitable retained checkpoint exists                                     | Historical replacement is unavailable. No model reconstructs a “likely” earlier world.                                                       | Continue ordinary play, make a new correction or use separately selected explicit editing/repair powers.                      |
| Candidate omits a currently bound human person                             | Refuse before installation; do not import their later body/inventory or silently seize another character.                                    | Choose a compatible later point. Merely disconnecting a player is not a way to bypass a current binding.                      |
| Candidate is malformed, incompatible, incomplete or too large              | Keep source and current world; report the actual class of failure. Preparation may leave the current world paused, as today.                 | Resolve the named issue or choose another point; resume the retained current world explicitly if appropriate.                 |
| Current world cannot be captured for pre-load recovery                     | Refuse replacement, preserve current authority and record the failure.                                                                       | Existing SB13/SL09-A operator recovery work owns a verified independent-preservation path; none is invented or bypassed here. |
| Creator loses permission or participant bindings change during preparation | Revalidate before installation; a stale permission/preview does not authorize replacement.                                                   | Refuse and refresh under current rights. If already paused, say so.                                                           |
| Installation outcome is uncertain after a process/connection failure       | Recover one complete old or new authority and resolve the original operation. Never mix states or initiate another load automatically.       | Reconnect to the actual active result; explain remaining operational uncertainty without pretending success.                  |
| Restore was a mistake                                                      | The protected Before last load point, if still retained and compatible, offers another complete-world restore.                               | Review that whole replacement normally. It is not selective item/message recovery or an endless undo stack.                   |

The current binding-refusal behavior is intentional first-scope coverage, not a new universal participation design. It can make very early checkpoints unusable after another person's creation. Explain that limitation in the available-point review when known and on the actual validation refusal. A future earlier-than-person restore needs a separately complete MP entry/identity journey; ordinary participant removal is not recommended as a workaround.

No fixed countdown, minimum online population or unanimous acknowledgement is selected. Current authority can decide to restore. Participants receive accurate information and can choose whether to continue that world's play. Repeated disruptive use is visible as creator/operator action, not disguised as a natural game event or prevented by a new fictional currency charge.

## 10. Protected storage, export and unsupported histories

The first shared/private experience uses protected save slots retained by the existing service. Save authority permits retaining, selecting and restoring the complete world; it grants no plaintext view of another person's messages, notes, summaries or hidden membership. Global metadata and validation errors must not disclose those contents. A failed private-dependency check can report that the point cannot be restored safely without printing the protected records.

Creator-facing download/import of complete private shared worlds is **not offered in this first scope**. Do not call a public-world-only file a complete shared save or silently omit gameplay-critical private state. Ordinary operational backups remain separately authorized host/operator work under PD06 and the existing D48 threat model. This does not select administrator-proof encryption or a new hosting service.

SL10 retains a later protected portable-transfer consumer. Before offering it, the product must specify an authorized destination and its current identity/privacy/accounting reconciliation; the operator must be able to transfer the complete protected state without receiving plaintext rights through the game interface. A file alone cannot restore revoked access or establish authority over another world. Personal Journal export remains its own deliberately narrower DG20 product.

There is one active same-world history. No merge of independently progressed copies, side-by-side live branches, cross-world inventory import, cherry-picked message rescue or arbitrary point-in-time replay is selected. A checkpoint whose admitted cross-world/external dependencies cannot be reconciled under an already supported policy is refused for this mode. Actual provider charges and external operation receipts follow their current owners; they are not a reason to invent cross-world gameplay support.

Earlier human-downloaded files or screenshots remain outside the game's ability to recall copies. In-game views and pending exports must still invalidate when current access or active history changes. A retained protected recovery file follows current erasure and privacy restrictions; its mere existence is no exception. [HC-R05](#hc-r05--valheim-full-restoration-and-selective-repair-have-different-consequences) informs the decision to leave selective repair with separately defined consumers.

## 11. Economics, attention and performance

This feature adds no resource sink, rewind token, paid narrator or model debate over whether a creator may restore. Human correction, checkpoint selection, notices and restoration status are native operations. NPC reactions to a later correction remain ordinary admitted cognition; restoring accepted state does not buy a second round of all prior inference.

Current real charges and uncertain attempts do not rewind. Previously paid outcomes are neither refunded nor automatically reinstalled if they belong to the discarded future. An explicitly chosen supported reuse/activation path remains with the paid-work owner. Fictional items, agreements and consumption restore together; a preserved external receipt cannot claim both a later output and its earlier ingredients. [HC-R09](#hc-r09--dont-starve-together-undo-respects-the-current-accounting-result).

Reuse current bounded capture and restore. Product completeness does not require replaying every event, simulating alternatives, rebuilding a whole personality from prompts, or saving an extra branch after each correction. Current full reconstruction still costs time and memory proportional to the saved world; streaming capture does not make loading constant-cost. [HC-R07](#hc-r07--factorio-recovery-convenience-still-has-a-measurable-world-size-cost).

### Existing operating envelope, not new promised capacity

| Current owner          | Stated source envelope                                                                                                                                               | Product consequence                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Save capture admission | One capture at a time; one distinct manual save may wait, ahead of the next automatic save. A second distinct waiting manual request is busy.                        | Do not create per-player autosaves or an unbounded restore/save queue.                                                                   |
| Ordinary autosaves     | Default five minutes of running real time; three retained integrity-checked automatic points. Operator settings allow one to 1,440 minutes and one to twenty points. | Paused time accrues no backlog. A short retained window is not arbitrary historical rewind.                                              |
| Before-load recovery   | Rotation target two packages, with the current protected pointer possibly retaining another.                                                                         | The UI's Before last load point is temporary protection, not a permanent archive or hard two-file quota.                                 |
| Package/record work    | 256 MiB per streamed package, 1 MiB per encoded record and two million records.                                                                                      | A growing single record or world can refuse save and therefore refuse deliberate restore's required pre-load preservation.               |
| Capture time           | Two-minute scan allowance and a 125-second whole-worker cancellation trigger; shutdown has its own existing budget.                                                  | Do not promise that every load finishes in 125 seconds or that cancelling output is instantaneous. Full restore is separately qualified. |
| Save catalogue         | One hundred entries per page, without a lifetime manual-save cap. Directory work still grows with retained slots.                                                    | A small page does not bound lifetime storage or listing I/O. Show actual retained points and failures.                                   |

The [persistence inventory](../limits/persistence.md) owns these values and qualifications. This product assignment changes none of them. It records the limits before claiming that private shared history can always be saved.

DG24's maximum envelope makes the growth risk concrete. At 100 senders each submitting 24 maximum 8,000-byte messages per real minute, accepted body text alone is **19.2 MB/minute**. That would occupy **256 MiB in about fourteen real minutes**, before ordinary world state, framing, derived records and recovery copies. This is intentionally a worst-envelope calculation, not a usage forecast or an exact time-to-limit: actual serialization and admission determine package size. It shows why per-sender rate limits cannot establish indefinite checkpoint capacity.

Keep private messages in complete bounded owner records, measure representative accumulated history and saved state, and make required save/refusal status truthful before enabling the supported shared profile. Do not solve storage pressure by silently expiring meaningful private history or by claiming a new archive makes data free. Actual growth, retention, storage and any admission changes belong to NC/SL/data limits, with D59's delegated rationale. If the supported capture envelope is insufficient, qualify a concrete larger envelope or a complete explicit admission policy before promising this profile at that demand; native ordinary play must not be made contingent on speculative history infrastructure.

### What qualifies as economical success

Measure the cost of an ordinary correction against equivalent speech, and a selected restore against the same real retained world. Report capture pause, time unavailable, restored playability, total memory, storage and interference with active work. Include private text and cold character history when enabled. A successful tiny empty-world load or bounded metadata page is insufficient.

The gameplay question is whether the feature lets someone continue a worthwhile activity with a correct understanding of what happened. If players feel forced to restore repeatedly to obtain an acceptable NPC reply, review the conversation quality and error recovery before adding faster history machinery. If an occasional creator mistake is recovered clearly, the feature has done its job.

## 12. Delivery sequence and acceptance

The two consumers can ship independently. Ordinary correction, current native save/load and normal multiplayer remain usable without either optional interface expansion.

1. **Qualify ordinary correction first.** Two people exchange a mistaken instruction and a later correction through current Talk. Verify the actually present and absent listener cases, preserved old fragments and independent later behavior. Add the linked affordance only where it improves finding/composing/reading that action.
2. **Complete the linked correction consumer if selected.** Finish draft/cancel, current speaker control, exact new text, uncertain receipt, partial hearing, permitted links, inaccessible old source, current erasure and restart. Keep current administrative correction/CE02 separate and retain the generic speech edit guard.
3. **Complete shared replacement around the existing loader.** Finish exact target review, unchanged D60 authority, current binding refusal, participant notice, original-operation outcome, pre-load preservation, coherent paused result and reconnect. Qualify the entire smaller shared world before adding private channels.
4. **Qualify protected private history before enabling it in this restore mode.** Exercise pre-cut unread/read and post-cut mail, current block/revocation/erasure, changed controller, private derivatives, former receipts, source-corrected outlook and hidden metadata. A native rehearsal can qualify storage boundaries; actual NPC correspondence still needs DG24's separate live behavior evidence.
5. **Evaluate whether this is helpful in a real invited session.** Confirm that a participant understands the restored world and can resume their intended activity, including when they were offline during restoration. Record unexpected lost work and refusal frequency; simplify wording or fix entry/capacity gaps before adding new forms of rewind.

HE owns correction delivery, SL10 owns selected shared/private restoration, and existing NC/CR/MP/data/billing owners supply actual consumers. All enabled features must join the current complete-world save boundary. A future feature is not deemed compatible because another body's, message's or agreement's earlier checkpoint passed.

### Concrete gameplay acceptance cases

A complete qualification includes these visible results, not merely successful calls:

- A correction is easy to make, has exactly the chosen new words, and neither rewrites old hearing nor forces belief.
- One listener hears both statements, one hears only the correction, and one departed before it. Their later permitted knowledge differs accordingly.
- A creator's world edit leaves a resident's outdated belief intact unless separate actual evidence or explicit authorized memory work changes it.
- An agreement and both sides' exact exchanged goods return to the same cut. No post-cut receipt settles it again.
- Active camp recovery or field care returns with its actual progress/input state; a later treatment is not selectively kept.
- A character's later accepted outlook and supporting events leave together after rewind; current privacy erasure still overrides the older mind.
- One private message is unread at the cut, another read at the cut, and a third sent later. The restored inbox and NPC evidence distinguish all three.
- A current block, device revocation, new human controller or world-access revocation remains effective against an older checkpoint, without leaking why through another sender's receipt.
- An offline participant reconnects to the actual restored world with a readable operational notice and no inherited command/draft submission.
- A missing bound person, incompatible point, full storage, oversized current record, uncertain load outcome and wrong restore each offer the truthful failure/recovery behavior above.

These are future evidence requirements. No browser, game, provider, performance or recovery experiment was run for this documentation assignment.

## 13. Gameplay-first critique and selected cuts

**Do not make correction an editor task.** The original risk was responding to one wrong sentence by invalidating a character's entire outlook or rewriting its remembered past. New-event correction preserves the social game and the accepted no-cascade policy. The shortcut is optional usability, not a new compulsory protocol.

**Do not use a whole-world rewind to fake surgical repair.** It can cost other people real work. The review must say so; limited administrative repair, personal character revival and ordinary care remain their own experiences. Without a suitable retained point, the game does not invent an alternate past.

**Do not turn privacy into two permanently active histories.** The first selection uses protected coherent private rewind and the existing pre-load recovery point. A future participant-only archive could preserve useful human reading, but it needs a demonstrated need and a complete separation from current fictional evidence; it is omitted here.

**Do not reopen settled authority.** One clear destructive review plus current validation and participant notice is sufficient. No participant vote, mandatory online attendance, countdown, fiction-tax or new permission ceremony for ordinary saving is selected.

**Do not confuse a small interface with cheap lifetime storage.** Exact private history, character minds and retained saves grow. The product explicitly carries current capture/refusal limits and the worst-envelope text calculation. Optimizing catalogue rows or automatic summaries cannot prove that a world remains saveable.

**Do not let this reorder the game around administration.** A useful outing, recoverable bodily harm, a small agreement and believable later conduct matter before an elaborate history editor. HE's ordinary correction and SL's existing recovery are sufficient foundations. Shared/private restore is enabled only as its complete actual consumer, and broader branching, portable transfer, arbitrary re-authoring, selective recovery and cross-world repair remain separately triggered choices.

## 14. Research

All sources below are primary developer, publisher, support or accessibility documents, retrieved October 6, 2026. Each cited passage was available in the opened source. Historical update notes establish behavior and rationale at that release; they do not establish current behavior in every edition. The Open Legend recommendations are inferences. None of these records proves player enjoyment, demand for retrospective editing, or the feasibility of reconstructing an alternative past after arbitrary changes.

### HC-R01 — Signal: an edit has provenance and its own delivery

**Source:** Signal, [Edit Message](https://support.signal.org/hc/en-us/articles/6255134251546-Edit-Message). Undated support article.

**Supported finding.** Signal marks a modified message as edited, provides access to its edit history, and exposes whether the edit itself was delivered and read. The original sender has a bounded opportunity to edit. A changed display is therefore accompanied by provenance and a separate communication state.

**Open Legend inference.** An ordinary correction should be an attributed later event. Preserve what each listener actually heard, including partial fragments, and let the correction reach its actual audience through a valid channel. Someone who acted on the earlier statement has not automatically heard the correction. Deliberately replacing fictional history needs a separately named administrative action.

**Limitation.** Signal edits written messages on devices; it does not reconstruct prior perception, decisions or physical consequences. Its particular edit window and count are not balancing evidence for Open Legend.

### HC-R02 — Signal: deletion cannot promise universal unlearning

**Source:** Signal, [Delete for everyone](https://support.signal.org/hc/en-us/articles/360050426432-Delete-for-everyone). Undated support article.

**Supported finding.** Signal describes deletion across receiving devices as a best-effort operation and explicitly excludes quoted replies. Even this narrowly scoped removal feature distinguishes the original message from other records containing its contents.

**Open Legend inference.** Separate removing or correcting a visible record from changing a character's evidence and from what a human already knows. A world restore must state which private records remain, which fictional memories return to the checkpoint, and how discarded-future material is identified to its authorized reader. It must not promise to make people forget, erase independently retained copies, or expose private contents to the creator as proof of completion.

**Limitation.** Signal's device behavior is not a policy for all game records. Open Legend's current erasure and privacy protections remain authoritative; restoration must not resurrect information those protections have removed.

### HC-R03 — Grounded: an old backup must not silently overwrite newer shared play

**Source:** Obsidian Entertainment, [Grounded's Newest Super Duper Update is Ready to Play!](https://grounded.obsidian.net/news/grounded/update-1-2), April 25, 2023, “Shared World Backup Saves.”

**Supported finding.** Update 1.2 created local backups on the last host's machine. It restricted loading those backups to the relevant last host, explicitly to prevent another player loading an old backup over newer shared progress. The notes give recovery of a recently destroyed base as a use case.

**Open Legend inference.** Verify the currently selected world and authorized operator when replacement actually happens. Explain the checkpoint and lost interval, and give affected participants a clear notice when they reconnect. A previously opened restore preview cannot silently remain valid after the shared present changes. Preserve D60's creator and authorized system-administrator roles.

**Limitation.** Grounded's host arrangement is not Open Legend's authority model. Its rule supports addressing stale replacement, not adding a participant vote or making recovery a prerequisite for multiplayer.

### HC-R04 — Minecraft Realms: preserving a copy and replacing the live world differ

**Source:** Mojang Studios, [Change Your Realm Worlds](https://www.minecraft.net/en-us/realms/change-realm-world). Undated official guide.

**Supported finding.** Mojang warns that replacing a Realm world may lose progress and recommends downloading the existing world first. It says backups are not retained indefinitely. A downloaded world becomes a local world that can continue independently offline; replacement is a separate action.

**Open Legend inference.** Make saving a recovery copy, inspecting a checkpoint and replacing the shared present distinct intentions. Explain what remains recoverable before a deliberate replacement. A copied world should not silently become the active shared continuation, and progress made in a discarded or separate future should not automatically merge back into the restored world.

**Limitation.** This guide does not specify every restored player field or privacy rule. It supports the operation distinction and explicit progress-loss warning, not a claim of complete snapshot coverage or an Open Legend branching requirement.

### HC-R05 — Valheim: full restoration and selective repair have different consequences

**Source:** Iron Gate, [Patch 1.0.15](https://www.valheimgame.com/news/patch-1-0-15/), September 18, 2026.

**Supported finding.** For item data lost during a save-format conversion, Iron Gate describes two workarounds. Restoring the earlier world backup loses subsequent world progress. Alternatively, players can copy the backup, recover affected items through a character, and replace damaged items in the current world. The second route depends on Valheim's own cross-world inventory behavior.

**Open Legend inference.** Do not present a full rewind as a harmless fix for one sentence or item. Ordinary correction, a specific repair and replacing the shared past are different scopes. Selective repair must account for consequences and material ownership; restoring text alone cannot honestly reconstruct the decisions and actions that would have followed different speech.

**Limitation.** This is a remedy for a particular conversion defect. Open Legend should not import cross-world item movement or promise general selective timeline merging.

### HC-R06 — Valheim: operational recovery uses a bounded set of checkpoints

**Source:** Iron Gate, [A Guide to Dedicated Servers](https://www.valheimgame.com/support/a-guide-to-dedicated-servers/), April 11, 2024.

**Supported finding.** The official guide separately configures how often the world saves, how many automatic backups remain, and shorter and longer backup intervals. Saving the current world and retaining older recovery points are therefore related but distinct policies with finite storage.

**Open Legend inference.** The restoration interface should offer checkpoints that actually exist and explain their age and availability. Do not imply every earlier moment is recoverable, or turn ordinary play into management of an unlimited timeline. Operational backup retention remains with its current owner; this optional feature consumes an available recovery point without requiring a new backup system or recurring player chore.

**Limitation.** Valheim's intervals and counts are operating defaults, not tested values for Open Legend. The guide does not establish cloud privacy, participant notification or the exact coherence of a restored character and world.

### HC-R07 — Factorio: recovery convenience still has a measurable world-size cost

**Source:** Wube Software, [Friday Facts #364 — 1.1 stable](https://www.factorio.com/blog/post/fff-364), January 29, 2021, Rseding's “Save game speed” section.

**Supported finding.** Factorio's developer reports that larger saves spent more time waiting for compression and disk writing. A saving change improved total time in the team's experiments, with larger saves benefiting more. This is actual developer performance evidence, bounded to the tested game and workloads.

**Open Legend inference.** Preserve responsive ordinary play and bound the recovery work a world can request. A special history-changing operation should not create continuous alternate simulations, repeated model debates or a copy for every utterance. Judge success by reliable restoration to a coherent playable state, with understandable progress and failure, while reusing existing saving and backup responsibilities.

**Limitation.** Factorio's reported improvements are not an Open Legend performance forecast. This product comparison neither prescribes its storage technique nor establishes that arbitrary causal reconstruction can be made economical.

### HC-R08 — No Man's Sky: normal saving can stay out of the player's way

**Source:** Hello Games, [Waypoint Update](https://www.nomanssky.com/waypoint-update/), update 4.0, “Saving.” No publication date is displayed on this feature page.

**Supported finding.** Waypoint introduced silent automatic saving during regular play while retaining full saves at the previous saving occasions. It also allowed saves to be renamed and displayed the player's most recent location in the save summary. Routine protection and recognizable save selection were addressed together.

**Open Legend inference.** Keep ordinary save/load useful independently of special history editing. An authorized person choosing a restore point needs recognizable world and time information, not a database record or a private transcript. Background protection should not become a confirmation ritual, and deliberate restoration should remain an optional intervention rather than the routine answer to every unfavorable event.

**Limitation.** These historical notes do not define a shared-world rollback or private-history policy. The visible save-summary example is useful, but its field choices must respect Open Legend's own knowledge and privacy boundaries.

### HC-R09 — Don't Starve Together: undo respects the current accounting result

**Source:** Klei Entertainment, [How to Unravel an Item Skin in DST](https://support.klei.com/hc/en-us/articles/4411780429844-How-to-Unravel-an-Item-Skin-in-DST), updated July 22, 2025.

**Supported finding.** Unraveling a cosmetic replaces it with spools after confirmation. The supported rollback is available only while the resulting spool amount remains in the account. Completing it returns the item and removes those spools. The reverse action reconciles what is currently available instead of merely restoring the old item.

**Open Legend inference.** A fictional rewind must not turn consumed service work into fresh credit, refund unrelated purchases or reinstate revoked permissions. Within the restored fiction, materials and obligations must agree with the same checkpoint; outside it, current grants and accounting remain current. Repeating a restoration cannot create a second durable entitlement.

**Limitation.** This is an account-level cosmetic reversal, not a world rollback or a general payment policy. It illustrates balanced reversal; Open Legend's existing accounting and authority rules decide the actual boundary.

### HC-R10 — W3C: protect consequential replacement without confirming every action

**Source:** W3C Web Accessibility Initiative, [Understanding Success Criterion 3.3.4: Error Prevention (Legal, Financial, Data)](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html), WCAG 2.2 explanatory document. No publication date is displayed in the retrieved page.

**Supported finding.** The criterion offers reversibility, checking or review and confirmation as alternative ways to prevent serious mistakes. Its explanation explicitly excludes requiring confirmation for every save or ordinary edit. The purpose is avoiding consequential accidental loss, including mistakes arising from reading or motor difficulties.

**Open Legend inference.** Before replacing shared history, provide one readable review of the selected checkpoint, affected scope and available recovery, with a clear way to cancel. Explain completion or failure in plain language. Keep ordinary speech corrections and routine saving direct. Accessible protection need not become a vote, repeated permission requests or an administrative ceremony.

**Limitation.** This is explanatory guidance for a web accessibility criterion, not a player study or a claim that a particular native game flow is certified. Apply its error-prevention rationale proportionately.

## Maintained records

- Product queue: [DG25](../maintainers/needs-design.md#dg25--deliberate-corrections-and-shared-restoration), conditional ND17 and ND35.
- Correction delivery: [HE deferred expansion](../maintainers/hearing-and-speech.md#deferred-expansion).
- Restoration delivery: [SL10](../maintainers/save-and-load.md#sl10--conditional-portability-and-shared-world-expansion).
- Related accepted editing policy: [Creator edits](creator-edit-propagation-feature-spec.md), [CE01–CE02](../maintainers/creator-edits.md).
- Current constraints: [Hearing](../limits/hearing-and-speech.md), [Persistence](../limits/persistence.md), [Memory](../limits/memory.md).

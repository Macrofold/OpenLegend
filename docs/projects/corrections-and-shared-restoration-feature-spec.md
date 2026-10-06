# Correct a misunderstanding; deliberately restore a world

| Status      | Current progress                                                                           | Last updated |
| ----------- | ------------------------------------------------------------------------------------------ | ------------ |
| In progress | DG25 product design in development; current authority, speech and memory policies audited. | 2026-10-06   |

DG25 covers conditional ND17 and ND35. It has one common rule and two independently useful consumers: a new attributed correction, and a deliberately selected complete-world restore. The specification does not authorize technical implementation, change current save permissions or add a required system to ordinary play.

## 1. The experience worth protecting

A player sends someone toward the wrong camp, notices, and says, “I meant the eastern camp.” The listener can learn that correction, ask what happened, ignore it or change their plans. The earlier mistake remains something that occurred. The correction should be easy to make and easy to read later; it should not require opening a world editor, buying a resource or learning how memories are stored.

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

The new utterance can offer **Earlier statement** only when the viewer independently has access to that earlier statement. The earlier entry can offer **Later correction** only when the viewer independently perceived the later correction. A link never reveals a hidden event identifier, original exact text, source position, unknown identity, correction existence or newly named recipient to someone lacking that evidence.

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

## 7. Shared restoration policy

The remaining shared/private-history choice is being finalized against current D48/D60 and SL10. It must preserve one coherent world, current privacy and actual accounting; participant notice and reconnect cannot require unanimous attendance. The next sections will state the complete selected policy, walkthrough, failure behavior, economic envelope and qualification before this proposal is marked product-complete.

## Maintained records

- Product queue: [DG25](../maintainers/needs-design.md#dg25--deliberate-corrections-and-shared-restoration), conditional ND17 and ND35.
- Correction delivery: [HE deferred expansion](../maintainers/hearing-and-speech.md#deferred-expansion).
- Restoration delivery: [SL10](../maintainers/save-and-load.md#sl10--conditional-portability-and-shared-world-expansion).
- Related accepted editing policy: [Creator edits](creator-edit-propagation-feature-spec.md), [CE01–CE02](../maintainers/creator-edits.md).
- Current constraints: [Hearing](../limits/hearing-and-speech.md), [Persistence](../limits/persistence.md), [Memory](../limits/memory.md).

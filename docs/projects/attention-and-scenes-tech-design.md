# Attention and scenes — technical design

| Status      | Current progress                                                                                                                             | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Exact attended activity and compact background meaning are designed through existing owners; runtime delivery and qualification remain open. | 2026-10-17   |

**Selected design, not runtime delivery or implementation approval.** This is the counterpart to the [feature specification](attention-and-scenes-feature-spec.md), particularly its [compact background family](attention-and-scenes-feature-spec.md#173-selected-compact-expressive-background-exchanges) and [shared-activity refinement](attention-and-scenes-feature-spec.md#18-research-refinement--independent-shared-activity-that-people-can-understand). It resolves the exact encounter and two-NPC compact meaning design under DG06/DG18 and PS04. Aggregate vocal activity, crowds, timed speech and broader ND13/ND15/ND16 scope remain separate. The psychological mechanism has its own [continuing-life owner](continuing-lives-tech-design.md#55-numerical-personal-reactions-without-required-prose).

**Speech target reconciliation, October 17, 2026:** [SPK](../maintainers/speech-and-social-perception.md) and its [technical design](speech-and-social-perception-tech-design.md) replace ordinary Conversation membership through exact actor/source/request ownership, permitted speech evidence and bounded history selection before hydration. The target sections below consume that replacement and the current WorldComposer/Events interface; they do not retain join/leave/merge state or restore Talk. Keep complete selected structured meaning, not only a rendered sentence. Source identity follows the selected stable face/voice policy, including first audible linguistic exposure without sight or name knowledge. Existing independently accepted outing/item/action terms, private scope and actual hearing remain required. Runtime and this project's other scene/compact-meaning/attention gates remain unchanged.

## 1. Outcome and first delivery boundary

A player can discuss a real object with a resident, hear another person legitimately join, propose a supported outing or demonstration, and understand what each person actually accepted and did. A refusal, an interrupted attempt or quiet company can be a complete useful encounter. The computer must not invent agreement, common knowledge, a successful test or another person's private reason merely to produce a coherent scene.

The first slice uses exact instantaneous speech, actual hearing evidence, SPK's source-scoped dialogue, existing outings, native item offers and independently owned actions. The [base gathering profile](../worlds/base/social-gatherings.md) supplies its people, situation and selected language policy. The existing Events reader already supports permitted contributions from several people; extend its reading behavior only for a demonstrated gap, and do not gate an independently complete one-resident improvement on a crowd or social membership.

The separately selected background slice directly produces one actor's compact expressive meaning, establishes each actual listener's permitted evidence, and lets a recipient independently interpret, react and optionally reply. It does not first generate exact speech and compress it. It reuses the world clock, bodies, hearing calculation and existing actor-work lifecycle; reduced wording neither changes travel/work rates nor skips physical outcomes. This source family requires integrated changes to existing speech and memory representations, unlike the read-only exact gathering.

No new social-practice ontology, authoritative scene table, shared mind, simulation clock, reaction scheduler, worker service or provider adapter is introduced. A “scene” in this slice is a useful description of linked existing activity, not a second place to store agreed truth. Arbitrary joint labor, loans, negotiated barter terms, synchronized combat, crowds and unattended hosting are not admitted through prose.

## 2. Existing semantic owners and actual callers

The source inspection baseline is local `main` at `362d3b0a2` in `https://github.com/Macrofold/OpenLegend.git`; this document proposes changes to those owners rather than claiming they already implement the complete experience.

| Responsibility                                          | Existing owner/caller                                                                      | Required use in this design                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Exact speech and the listener's actual fragment         | Domain speech/admission, `docs/hearing-and-speech.md`                                      | Commit a real source and each eligible listener's permitted evidence; conversation membership is not a transcript grant.              |
| Selected compact speech source and listener meaning     | `speech.ts`, `events.ts`, `experience.ts`, server speech recall and cognition contracts    | Extend the same source/evidence path with an explicit meaning form; no parallel scene transcript or exact-speech summarizer.          |
| Ordinary speech context and source ownership            | `conversation-context.ts`, memory/history repositories and SPK05                           | Select permitted actor/source evidence without ordinary membership; preserve independent physical work.                              |
| Native outing proposal, exact acceptance and withdrawal | `packages/domain/src/outings.ts`, derived `outing-index.ts`                                | Reuse supported travel/combat-help families, exact revision and participant checks; do not extend acceptance to a different activity. |
| Current plans, goals and nested work                    | `agency.ts`, `activity-execution.ts`, `action-experience.ts`                               | Each actor owns their own admitted work; actual progress and output receipts come from these records.                                 |
| Spoken promises and supported obligations               | `packages/domain/src/commitments.ts`                                                       | Reuse only currently supported explicit forms and their lifecycle; arbitrary agreement prose creates no new executable duty.          |
| Custody and item offers                                 | Existing item-transfer/offer admission                                                     | A demonstration, verbal loan or scene summary never substitutes for actual recipient acceptance and transfer.                         |
| Personal evidence, interpretation and recall            | `experience.ts`, server memory retrieval and `conversation-context.ts`                     | Select actor-permitted sources before hydration; required recent outcomes use their existing shared path.                             |
| Decision intake and external execution                  | `ActorWork`, `ai-director.ts`, cognition-budget owners                                     | Preserve independent actor decisions, existing fair intake, cancellation, reservations and accounting.                                |
| Recipient's numerical personal reaction                 | `appraisals.ts` and the continuing-life psychological design                               | Use that actor's supported cause-linked operation; no source-authored receiver feeling or mandatory explanation.                      |
| Offered social choices and personal projections         | `action-catalogue.ts`, `outing-view.ts`, `decision-context.ts`, `context.ts`               | Render the same current terms/prerequisites for human and NPC consumers without new writable authority.                               |
| Wire contracts and speech presentation                  | `packages/protocol/src/index.ts`, `world-composer.tsx`, `world-events.tsx`, speech captions | Reuse the current Speak/Act and Events surfaces, explicit addressee, draft identity and actual request feedback; do not restore Talk. |

These paths are pointers, not alternative contracts. [Conversation](../narration-and-conversations.md), [action experience](../action-experience.md), [agency](../agent-agency.md) and [save/load](../save-and-load.md#continuation-and-identity) retain their full semantics. Implementation must inspect the current callers again before editing because later changes may alter the baseline.

## 3. Shared circumstances without shared decisions

### 3.1 Reuse the records that already express the meaning

For the selected encounter, prepare one read-only view by joining exact existing references:

- The viewer's eligible speech sources, exact participants and chronological boundary identify the readable exchange without a group identity.
- Existing outing records identify proposer, recipient, terms, current revision, independently accepted state and destination.
- Existing item offers identify the actual item/quantity and recipient; their current owner supplies acceptance and expiry.
- Existing goals/plans and action occurrences identify the actor's chosen work, actual committed steps and results.
- Existing personal commitments identify only the supported duties that the owner really recorded.

There is no authoritative ordinary conversation roster. A derived list of people in selected speech identifies only those occurrences; physical presence and consent to a particular task remain separate facts. Several people standing together does not establish an accepted plan. A nearby overhearer can receive speech evidence or interject without enrollment. A traveling companion remains a companion when the people stop talking, subject to the outing's actual terms.

Use the existing identity allocator and exact record references; readable labels are projections. Do not use a person's name, coordinates or a concatenated pair of IDs as agreement identity. Any composite cache key uses a structured tuple/content digest and includes the owner/revision and disclosure scope that distinguish its meaning.

For the exact attended slice, no new authoritative record is needed. The selected compact background slice extends existing source and observer evidence with their representation, rather than introducing authoritative scene state. If a future activity cannot express its actual roles, obligations or shared resource claim through these owners, first identify that missing computation and design a narrow typed owner. Do not silently turn a read-only scene projection into an executable social contract.

### 3.2 Separate what may be shared

Native public object facts can be prepared once for a compatible read snapshot. Each participant receives only facts available to their own senses/inspection/knowledge. Disclosed terms can be reused when the participant actually heard or accepted them. Undisclosed goals, private memories, hidden inventory, beliefs and unsaid replies are never pooled into a joint prompt.

Each decision request has one actor as its decision owner. It can propose that actor's supported speech, expressive act, private numerical reaction through the [continuing-life owner](continuing-lives-tech-design.md#55-numerical-personal-reactions-without-required-prose), or native command. Independent requests may prepare concurrently through the existing server owner; commit is still serialized through current world authority. The first accepted participant's decision is not a template for the other participant's answer.

A shared summary is optional presentation of completed permitted sources. It cannot write a goal, resolve an obligation or dispatch another participant. The first implementation should prefer a direct shared reading surface to another paid summary call unless a measured reading need warrants one.

### 3.3 Actual admission sequence

1. A person speaks through the shared speech admission with one optional addressee. Store its occurrence and per-listener evidence at the same authoritative boundary; no membership transition occurs.
2. Eligible evidence enters the receiving actor's existing reaction intake. No automatic scene-wide fan-out creates a decision for every participant or bystander.
3. Build one actor-scoped decision from current circumstances, their actual heard contribution, relevant required outcomes and permitted recalled experience.
4. The actor independently chooses speech, silence, a current native action, continuation or refusal under the current execution/routing contract. An unrun/unavailable decision is not a chosen silence.
5. A proposed outing, item transfer or other supported command passes its existing current admission. Where another actor must accept, leave it pending until that actor's actual decision/input is admitted.
6. Return the actual receipt and resulting permitted evidence. Update views from published authority, not from the model's claimed result.

An optimistic model description such as “we agreed and walked there” authorizes neither acceptance nor movement. If it proposes an unsupported joint operation, retain any independently valid committed speech under its owner and report the unsupported operation honestly; do not invent substitute work.

### 3.4 Compact source and independently received meaning

Extend the existing actor response operation, domain speech occurrence and listener evidence with a discriminated exact-or-meaning representation. Exact speech retains its present text and fragment contract. Meaning holds concise clear English expressing this actor's contribution, optional permitted reference bindings, and an optional short exact phrase. Keep occurrence identity/order, speaker, intended recipient and installed source behavior in their existing owning envelope. An exact phrase is real retained wording; the rest cannot be quoted. Do not store a fabricated underlying transcript or add a compact-to-exact recovery model call.

The meaning text can convey a novel opinion, hesitation, qualified willingness, joke or implied criticism. Optional structured fields clarify actual references and supported terms; they are not a closed catalogue of allowed intentions. Preserve uncertainty and conditions. Provider schemas and server decoding constrain the same actor-owned fields and supplied reference set. Unknown people and uninspected objects remain unknown in each recipient projection. Neither a hidden ID in text nor an asserted shared agreement grants knowledge or execution. Public expression also cannot include the speaker's undisclosed sincerity as listener evidence.

Keep the current model-speech content allowance as the combined allowance for generated meaning and its optional phrase, rather than granting each field a full allowance. Full encoded response, references, retained-source and request limits still apply through their owners. This selects no new numeric ceiling. A contribution that cannot preserve its necessary meaning within those bounds is unavailable in this form; it is not silently truncated or automatically split into more paid turns. If exact language is necessary, select exact before dispatch/commit under current admission.

The semantic source admission owner commits the actual occurrence and complete eligible listener evidence together, using the existing installed acoustics and conscious-acquisition gates. For the [selected world family](../worlds/base/social-gatherings.md#gist-and-vocal-activity-selection), clear NPC hearing receives attributed meaning and any retained phrase; partial/detected hearing receives only the indistinct content cue. Preserve SPK's acquired direction and reliable ordinary source association even when no words or meaning are understood. The optional phrase does not create a hidden lexical mask or enlarge its audience. Recipient identity and coarse direction remain independently permitted. Inaudibility creates no communication evidence. This compact family adds no hearing radius, recognition mechanism beyond SPK or audience cutoff.

### 3.5 Recipient interpretation, private reaction and optional reply

After source commitment, actual permitted meaning enters the receiving actor's existing intake. Prepare that actor's own circumstances, remembered evidence and current intentions. Await their independent interpretation before admitting a reaction or answer: a source cannot optimistically predict what the listener felt. This dependency is sequential even if unrelated actors' preparation is shared. The recipient may understand, misunderstand, doubt, refuse, continue existing work or say nothing. An unavailable decision remains operationally distinct from a chosen silence.

The [numerical personal-reaction contract](continuing-lives-tech-design.md#55-numerical-personal-reactions-without-required-prose) owns selection, typed values, defined short codes, permitted cause binding, admission, receipts and forgetting. Its [world profile](../worlds/base/psychological-reactions.md#selected-first-profile) owns the first feeling and tuning. Consume that same contract here: the recipient can submit a small typed numerical change with no explanation text, either within their independently generated answer or through an actually supplied Jev selection. Jev selects fully bound offered possibilities rather than inventing novel speech or another person's reaction. Installed existing character-meter operations can be used only when that psychological owner supports them; this family introduces no social-need meter, fixed gratitude points or automatic friendship reward. Optional private fictional thought is distinct from model reasoning and from public speech.

An optional reply is a new contribution by the recipient, with its own source form, current admission and audience. It can include a supported native operation using supplied exact terms, such as answering a current outing invitation or accepting an item offer. Native validation and the other actor's actual consent remain authoritative. Meaning alone creates no arbitrary promise, transfer, taught method or shared plan. Choosing a reply does not award a second actor's reaction, and a silent receiver need not trigger a spoken explanation.

Novel English meaning or replies require the existing generative route. Jev-only execution can select fully supplied reactions or current native actions, but cannot invent a background utterance, and this design adds no generative fallback to that mode. The source decision does not automatically dispatch a recipient call; current intake and complete-work admission own whether that opportunity can run. When it does, interpretation is scoped to the recipient before any personal change or reply commits.

### 3.6 Human observation changes future source form

Bind exact or meaning source form while preparing the actor's request, and recheck the relevant actual audience immediately before speech commits. In the selected profile, a human-controlled character who would clearly hear the new contribution requires exact source wording. This is character perception, independent of camera position, open panels, caption preferences or administrator inspection. A visible person without clear eligible hearing is not automatically a linguistic observer. No model may author a human's contribution or assent.

If a human arrives after compact output was prepared and exact form is now required, the compact output remains unspoken and returns stale/needs-exact through the existing decision owner. Preserve the still-valid opportunity/evidence for ordinary fresh admission. Do not expand its meaning into purported words, automatically retry paid generation, hold the world clock or commit an unheard result behind the player. Departure can permit a later freshly admitted compact contribution; it does not downgrade exact words already committed. Revalidate participant life/control, actual audience eligibility, observed source/target dependencies and timeline, rather than rejecting on every unrelated world tick or a removed membership relation.

Earlier completed meaning remains meaning after arrival, interjection, changed addressee or restore. A later retelling is current testimony. Any retained exact phrase stays exact within its original listener coverage, with no imagined words around it. The current player interface shows committed speech only; any separately qualified backend preview caller remains confined to its exact operation and recipient. Compact background output creates no preview or group disclosure route.

## 4. Declared intentions, observed preparation and real progress

### 4.1 One projection, distinct evidence meanings

The server composes a small observer-scoped activity description from existing public/action facts and actually received exact speech or compact meaning. Preserve distinct provenance internally; compact meaning is a nonverbatim stated intention, never reconstructed quotation:

| Information                     | Allowed source                                          | Example presentation                                                                             |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Stated intention                | Actual received self-attributed exact speech or meaning | “Ada expressed interest in trying the container.”                                                |
| Visible current action          | Current permitted body/action observation               | “Ada is walking toward the riverside.”                                                           |
| My accepted task/terms          | Controlled actor's own live outing/action record        | “Walking together to the riverside; leave the outing.”                                           |
| Observed completed result       | Current permitted outcome evidence                      | “The container now holds the supplies you put inside.”                                           |
| Private reason or changed trust | That actor's own mind, or newly communicated testimony  | Unavailable to another observer unless separately disclosed; never infer it from a progress bar. |

These are illustrative labels, not new authored strings embedded in engine code. The selected world's action/observation wording supplies names and relevant templates through existing descriptor and perspective owners. A different world can use the same mechanism for two machines comparing a device without installing wilderness people, camp vocabulary or human psychological laws.

The same fact must not be narrated twice as speech and an independently verified outcome. Quoted claims remain claims. The observer can hold a mistaken interpretation without changing the physical record or another person's interpretation.

### 4.2 User interface and ordinary actions

Retain the existing WorldComposer, world captions and Events reader. The composer identifies the optional addressee; Events includes the viewer's actually perceived contributions in authoritative chronology, with any person filter defined by SPK's exact permitted participant fields. Selecting another addressee changes only a future Send and restores that destination's own draft; it dispatches nothing and never moves one person's unsent words into another draft.

Keep a compact participant/activity indication adjacent to the conversation only when it helps the current decision. It may show an actual accepted outing and its supported leave action. It must not expose a hidden participant list, another person's private plan, all their goals or a guess at the next speaker. A body that disappears from perception loses current location/action detail without deleting old heard words.

Use current native task progress only for finite measurable work. Do not convert elapsed provider time into action progress, assign completion percentages to a gathering or display a predetermined agreement outcome. Unknown duration remains unknown; an already stopped task keeps its actual end reason and completed consequences. Preserve current task-status and cancellation controls rather than adding scene-specific versions.

Events retains its scrollable reading region while the compact world composer keeps the next addressee visible. Use shared tokens, existing responsive panes and explicit overflow. Preserve reading position while viewing older contributions and the existing new-content return behavior. Long names, contradictory statements and optional activity details must not displace the composer or hide the next addressee. Keyboard access, IME, enlarged text, narrow/short layouts and non-audio access to essential permitted information are acceptance requirements, not a new theme.

An NPC's optional self-explanation is speech with normal hearing/uncertainty, not an exposed chain of thought or verified causal trace. Native action animation/progress should carry ordinary work without a mandatory explanation call after each step. Retain actual pending, failure and exact-retry feedback beside its originating composer draft; Events contains committed perceived occurrences. Provider queue details belong to authorized diagnostics.

## 5. Attention interfaces and continuation

The [continuing-life technical design](continuing-lives-tech-design.md) owns interests, chosen bounds, supporting assumptions and reconsideration. This design consumes its actor-permitted current intention and supplies actual social evidence. It creates no second attention state, cooldown, need meter or memory store.

For the exact slice, the explicit Speak-to selection is sufficient to express the player's present conversational interest without becoming social membership. Later deliberate Listen to remains conditional on genuine competing sources and supported semantics. Camera aim, selected object, keyboard focus, next addressee and current physical activity remain distinct. Switching a panel cannot silence a person or alter who heard their last words.

Known relevant changes use existing source-linked causes: an actual invitation, refused offer, changed accepted destination, interrupted demonstration or completed native result. Existing fair reaction intake coalesces equivalent optional reconsideration without dropping distinct required evidence. A repeated unchanged invitation must not create unbounded model work; a genuinely different term or physical consequence remains distinguishable.

Quiet/unfamiliar meaning still enters ordinary permitted semantic consideration and existing safe idle opportunities. Do not require every personal concern to have a predeclared native predicate, nor scan every possible remembered concern every tick. No new fixed initiative cadence, suppression threshold or “important character” priority is selected by this design.

After an interruption, show the remaining actual task and current accepted terms, not a replay of the entire episode. Whether to resume is the actor's fresh choice where their current purpose requires it. A material transfer already completed does not become pending again; a missed attack does not become a kill; an old promise does not reappear as accepted current work merely because its text is recalled.

## 6. Authority, lifecycle and durable boundaries

### 6.1 Complete-operation checks

Speech participation does not grant editing rights, material-use permission, recipe knowledge, physical access or consent to another operation. The command owner checks the complete current operation, exact resources, relevant grants, tool/body feasibility and actual destination. Visibility of an item does not authorize taking it. A native preview remains read-only and cannot reserve another person's agreement.

Preparation may retain exact immutable facts across an awaited read/provider call. At commit, recheck affected dependencies and live authority rather than rejecting on any unrelated world revision. Relevant changes include exact offer/outing revision, withdrawal, changed item/custody, actor life/participation, target placement, current action ownership and timeline. An interjection, changed addressee or ended exchange alone does not cancel a separately accepted physical task.

### 6.2 Leaving, stopping and loss

Stopping speech or hiding the composer/Events reader changes no ordinary social membership. Leaving an outing updates its exact consent/work relation through the outing owner. Stopping native work follows the existing plan/cancellation contract. Those deliberate native operations remain separate from changing a reading view. One person cannot stop another's independent work merely by losing focus.

Death, retirement, incapacity, actual player departure or replaced work reconcile the relationships they invalidate through their existing owners. Cleanup uses participant-owned indexes and the exact old references, never a blanket world scan per departing person. Already launched effects follow their own lifetime. Completed movement, ammunition, damage, transfers and products are retained, with source-linked history where applicable.

Consent withdrawal remains possible through its existing permitted paused controls. Paused time, storage/maintenance holds and absent-player protection keep their current authority. The design does not invent a shared-world pause or treat a provider delay as fictional departure.

### 6.3 Save, load and stale external work

Persist exact speech/source relationships, outing terms and consent, actual plan/action progress, item state and personal evidence through the existing complete world cut. Ordinary conversation intervals are not retained by the SPK target. Validate both owner-to-action and action-to-owner references. Historical participants may outlive their live bodies under the history owner's rules; active required references cannot silently disappear.

Restore identities before links and rebuild only derived indexes. Reopening does not emit new speech, award acquaintance, accept an outing, replay a transfer or rerun a summary/provider call. The exact attended read-composition slice needs no new stored scene format. The compact slice extends existing current-format source/evidence records as §6.4 specifies; neither introduces a compatibility adapter.

World/timeline/authority fences invalidate abandoned requests even if restored IDs recur. An already committed result remains committed; a stale result cannot invent later consent. Uncertain provider work remains accounted for and has no automatic paid retry. Revocation/forgetting applies to dependent shared views and summaries as well as source rows. Keep current privacy overlays and external spending outside gameplay rewind.

### 6.4 Compact source dependencies, storage and recovery

Update current producer/schema, source storage, observer projection, linguistic-evidence selection, conversation context, recall/embedding text, history search/source detail and protocol/UI readers together. Existing exact-only checks such as server `speech-recall.ts` must recognize admitted meaning as communicated linguistic evidence without treating indistinct cues as words. Current conversation compaction remains derived management of personally received sources; it must preserve each exact/meaning discriminator and may not turn an approximate account into a quotation. Shared rendering attributes speaker, recipient and observer correctly instead of reparsing free text into identities or verified facts.

Retain exact source identity/revision, recipient evidence identity/revision, representation, permitted references and installed source policy through the existing event/experience storage boundary. A psychological reaction uses the recipient's existing cause-linked owner and its recorded outcome; receiving the same source through intake, history reload or replay cannot apply it twice. A new independently spoken contribution remains a distinct cause. Recheck the recipient's private evidence and psychological dependencies after awaits. Source correction, forgetting, access loss and changed authority reach dependent interpretation, summaries, embeddings and cached reads through their existing dependency owners; the linked psychological contract determines any stored feeling's own correction/forgetting behavior. No retained compact account bypasses revoked evidence.

Save captures completed sources, actual listener evidence, admitted personal changes and exact native effects in one coherent cut. Unfinished interpretation or an unsent reply remains unfinished. Current-format validation checks the selected representation's required fields and reference relationships, and refuses contradictory exact/meaning data before installation. Restore rebuilds derived selectors without generating missing words, reapplying a feeling, answering again or resubmitting abandoned paid work. Deduplication and late-callback fences include world/timeline, exact actor/request/source identity and relevant revision; concatenate no ambiguous IDs. Ordinary save behavior remains exact, and no legacy reader or second scene save format is introduced.

## 7. Performance and extension boundaries

### 7.1 Growth, shared preparation and invalidation

The growing dimensions are actual speech/listener pairs, overlapping invitations reaching one actor, each actor's relevant actions and retained permitted history. A three-person initial encounter does not bound a settlement or a highly connected host. Final visible-row limits do not bound a full history scan.

Prepare the current viewer's eligible source metadata and owned outing/offer records once per compatible request snapshot. Use existing source/participant indexes; select eligible speech/evidence IDs before indexed bounded hydration. Reuse common physical object/geometry facts only where permissions and snapshot agree. Do not generate each spectator's description before deciding whether they need individual interpretation. Current exact speech still establishes every eligible listener's evidence through its owner; avoiding unnecessary decisions never authorizes dropping listeners to meet a display or cost allowance.

Keep any optional shared-reading selector derived and read-only. Cache keys must include world/timeline, observer/disclosure scope, exact selected source revisions and actual depended-on geometry/action/item facts. Source edits, privacy changes, changed selected coverage, target retirement, current work replacement and restore invalidate the affected derived result. A mutable world without proven revision coverage uses a fresh read rather than an unsound cache.

No new unlimited scene-retention collection is created. Existing source/history pagination, retention and cold storage remain their owners. Readability summaries cannot become permanent unauthorized copies after source revocation. Unsupported or exhausted preparation reports incomplete/unavailable; it does not assert that nobody spoke or that a companion declined.

### 7.2 Complete cost and failure accounting

Measure source admission, eligible listener work, required evidence persistence, per-actor context/routing/selection/generation, summary/recall/reflection if used, command validation/commit and browser update/readability. Count the optional decisions actually avoided as well as calls dispatched, stale results, queue time, bytes and retained uncertain spending. Shared context construction is a saving only if complete caller cost falls without lost evidence.

Compare matched exact encounters before adding abstraction. Measure cold opening/reconstruction and warm refresh separately; then vary independent people, one highly invited person, history length, irrelevant objects and bursty arrivals/interjections independently. Count visited sources/invitations and hydrated bodies as well as median/tail timings. An isolated selector or one warm three-person interaction cannot qualify the later seven-body/crowd offer.

For compact background work, admit one actor's contribution and only the independently justified receiving work through the existing finite decision, context, output, concurrency and spending owners. Source receipt is evidence for intake, not a recursive call to generate the other side. Every further voluntary reply needs current admission; repeated equivalent evidence can be coalesced without deleting distinct speech. No fixed turn timer, automatic ping-pong, quota to consume or paid restart at silence is introduced. Before dispatch, include any invited recipient decision/reaction in the complete admitted work and reserve through the existing accounting owner; a source cannot impose an unfunded unlimited continuation. Bystanders retain their actual evidence without a mandatory model call. Numerical personal reaction selection may share that recipient's already needed decision when its input and authority match; reuse cannot merge separate minds or let one participant pay for another without authority.

The complete comparison includes source generation, relevant route/selection, awaited recipient interpretation, optional feeling selection/admission, optional reply, audience processing, persistence, summaries, embeddings, later recall, stale results and uncertain reservations. Shorter output alone proves neither lower complete cost nor better characterization. Required failures preserve committed meaning and real native effects; unavailable optional interpretation leaves the matter unresolved. No automatic paid retry, model downgrade or invented social refusal hides failure. Repeated attention changes do not repeat reaction settlement.

No numeric capacity, universal attention maximum or cost saving is claimed. The selected profile's existing attendance/work allowances remain authoring hypotheses, not engine limits. [PS limits](../limits/product-scalability.md) and the [intelligent-simulation inventory](../limits/intelligent-simulation.md) retain the distinction between exact evidence obligations, current budgets and unmeasured scale.

### 7.3 Selected family and conditional expansions

Compact expressive meaning is now selected and technically specified in §§3.4–3.6/6.4. This replaces its earlier design gate; runtime implementation and qualification remain open. The exact attended slice still finishes independently. Keep ongoing aggregate vocal activity, timed speech, broader joint work, crowds and unattended operation under their separate existing gates. Compact source form authorizes none of their clocks, acoustic masking, collective choices or new physical effects.

Implement the selected meaning representation through the existing source/hearing, memory, actor-decision and conversation owners together. Keep its selected observation/hearing policy in the world-owned profile. A materially different supported world could require exact speech throughout while reusing the same source discriminant, or exchange nonverbal meaning only through an actually supported sense; changing a string does not install that sense. No speculative scheduler, loader or scene service is required.

## 8. Verification and completion

Reuse AS-J15–19/23 and applicable AS-J21–22 from the feature spec through ordinary human/NPC surfaces, applying the compact-specific cases below only to the selected background slice. Existing evidence can qualify an unchanged owner, but a fixture returning the desired answer cannot establish independent choice or player enjoyment.

| Required case                                               | Mechanical observation                                                                                                                     | Separate behavioral/presentation judgment                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Real object, three potentially different opinions           | Actual object/inspection, exact source/listener evidence, no invented recipe or gift                                                       | People can disagree, decline or remain occupied without the encounter becoming pointless.      |
| One person knows a relevant secret                          | Only that person's decision receives it; common view contains disclosed facts only                                                         | Their later choice may differ without another participant inexplicably learning the reason.    |
| Recipient refuses, is unavailable or says nothing           | Distinct admitted refusal versus deferred/failed cognition; no unauthorized acceptance                                                     | UI does not call a technical failure rejection or demand a crisis to sustain interest.         |
| Interjection, departure and changed addressee while composing | Exact heard chronology, explicit addressee, preserved destination-specific drafts and reading position, without membership transitions      | The player can identify who spoke and whom Send will address.                                  |
| Supported outing and demonstration                          | Exact acceptance; independently owned movement; real command/transfer receipts                                                             | Walking/preparation/results explain the activity without constant motive narration.            |
| Quiet personally relevant invitation during other work      | Permitted source retained and existing intake/continuation handles it                                                                      | Evaluate delayed response against what the person could know; no mandatory agreement.          |
| Cancellation/death/destination change during work           | Correct owner cleanup; prior costs/results survive; unrelated ordinary speech or view changes preserve work                                | Interruption remains understandable and resumption is an actual choice.                        |
| Save/reopen and provider result from abandoned timeline     | Same current native partial work, no duplicate speech/effects, stale callback fenced                                                       | Returning player sees current circumstances, not an invented absence transcript.               |
| Many equivalent invitations followed by a real consequence  | Optional work coalesced while distinct actual evidence survives                                                                            | No starvation of a quiet person or loss of a newly important exception.                        |
| Narrow/short/enlarged and keyboard-only conversation        | Explicit overflow, reachable controls, IME/send safety, stable draft/read anchor                                                           | Essential speech, addressee and current task fit without overwhelming the world.               |
| Novel qualified background contribution                     | Direct meaning generation, preserved conditions/uncertainty and optional exact phrase; no generated hidden transcript                      | Nuance, humor or mixed praise remains understandable without a tiny generic intent menu.       |
| Same expression, different private recipient interpretation | Each recipient receives only their own permitted source; reaction goes through its cause-linked owner, including no change and no prose    | Warm wording can be doubted; sincere-looking expression does not expose hidden sincerity.      |
| Human arrives while compact output is pending               | Changed clear-hearing audience refuses unsent compact output; fresh exact admission uses current evidence with no automatic retry          | Future interaction is exact and unresolved choices remain influenceable.                       |
| Replay, forgetting and restore after a numerical reaction   | No duplicate reaction or reply; revoked source cannot leak through history, search, summaries or embeddings; real committed effects remain | The returning person sees honest current consequences and no reconstructed absence transcript. |

Design stages follow the owning tracker rather than a second project backlog:

1. **PS04 exact contribution:** compare existing one-resident play and fix the concrete reading/participation problem. Do not build group infrastructure merely because a third person exists elsewhere.
2. **PS04/DG18 small shared encounter:** complete the ordinary exact journey, explicit audience and independent supported acceptance/withdrawal, plus lifecycle/privacy checks above. Compose CE/NC/HE/AE owners; implement no second mind or scheduler.
3. **CE/PS qualification:** observe a whole worthwhile episode and a later return, with full costs and legitimate contrary outcomes. Engineering correctness and uncoached usefulness are separately reported.
4. **PS04 compact background slice:** implement the selected source/evidence representation, independently awaited recipient interpretation and optional psychological operation/reply; qualify source privacy, expressive nuance, native terms, human-arrival races, replay and current-format recovery. This is open runtime work, not delivered by the documents.
5. **Conditional PS04 expansion:** select and qualify ongoing vocal, timed, crowded or broader-work families separately. Earlier slice completion does not close this later scope.

### Implementation modules mapped to existing work

| Module within this design                           | Parent design/work                                   | Scope boundary                                                                                                       |
| --------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Shared permitted reading and addressee continuity   | DG18 / PS04, SPK and existing speech/UI owners       | Extend WorldComposer/Events only for a real reading gap; no second chat protocol or actor-independent transcript.     |
| Independent participation and exact current terms   | DG06 / PS04, existing outing/item-offer owners       | Compose supported invitations and custody; new kinds of joint obligation require their own selected design.          |
| Current-action and completed-result presentation    | DG01 / CE04–CE05, existing action-experience owners  | Reuse actual task/outcome records; ordinary observers do not receive private plans or generated causal explanations. |
| Personally relevant social evidence and return      | CE03–CE05 / PS04                                     | Feed existing actor-scoped intake and continuation; no new scheduler, purpose store or suppression policy.           |
| Compact background meaning and independent reaction | DG18 / PS04, HE/NC/CE and continuing-life psychology | Extend existing source/evidence and response boundaries; optional numerical change uses the psychological owner.     |
| Conditional vocal and crowd families                | DG18, ND15–ND16 / PS-D02                             | Preserve remaining selection gates; exact or compact slice acceptance does not claim these implementations.          |

Detailed assignments, dependencies and acceptance state stay in those focused trackers. These rows describe module ownership; they do not create new task IDs or turn a designed module into completed work.

No runtime, browser, database or provider trial was performed for this design. Human enjoyment, actual independent choice quality, capacity and complete operating cost remain unqualified. The document changes no service policy, model assignment or agreed Jev-only acceptance condition.

## Maintained records

- Behavior counterpart: [attention and scenes feature specification](attention-and-scenes-feature-spec.md), existing [attention/scene contract](../product-scalability/attention-and-scenes.md), and authored [gathering profile](../worlds/base/social-gatherings.md).
- Implementation: [PS04](../maintainers/product-scalability.md#ps04--coherent-scenes-and-limited-attention), [CE](../maintainers/character-experience.md), [conversation](../maintainers/narration-and-conversations.md), [hearing](../maintainers/hearing-and-speech.md) and [action experience](../maintainers/action-experience.md). The aggregate [intelligent-simulation tracker](../maintainers/intelligent-simulation.md) maps research coverage without replacing these owners.
- Limits and constraints: [product scalability](../limits/product-scalability.md), [hearing](../limits/hearing-and-speech.md), [interface](../limits/interface.md), [cognition](../limits/cognition.md) and [shared intelligent-simulation constraints](../limits/intelligent-simulation.md).
- Adjacent design: [continuing lives](continuing-lives-tech-design.md) owns personal reconsideration/continuation and [numerical reactions](continuing-lives-tech-design.md#55-numerical-personal-reactions-without-required-prose); [psychological reactions](../worlds/base/psychological-reactions.md#selected-first-profile) owns selected world meaning/tuning. The [product-scalability technical design](product-scalability-tech-design.md) owns operating offers, concurrency and fidelity.
- Decisions: [PS-D01–PS-D06](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) includes the selected compact family; [ND13 control recommendations](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization), [ND15 audio-media scope](../maintainers/needs-design.md#nd15--audible-npc-dialogue-microphone-input-and-proximity-voice) and [ND16 hearing extensions](../maintainers/needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) retain their separate gates. No additional numeric attention/cost default or service offer is selected.

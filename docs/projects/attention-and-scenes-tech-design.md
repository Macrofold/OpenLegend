# Attention and scenes — technical design

| Status      | Current progress                                                                                                                            | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Exact shared activity and readable participation are designed through existing owners; conditional sensory policy and delivery remain open. | 2026-10-15   |

**Design proposal, not runtime delivery or implementation approval.** This is the counterpart to the [feature specification](attention-and-scenes-feature-spec.md), particularly its [research refinement](attention-and-scenes-feature-spec.md#18-research-refinement--independent-shared-activity-that-people-can-understand). It resolves the selected exact encounter under DG06/DG18, PS04 and the [shared-activity follow-up](../maintainers/needs-design.md#independent-shared-activity-and-readable-intentions). It preserves the broader ND13/ND15/ND16 and conditional gist/timed-speech scope rather than claiming their delivery.

## 1. Outcome and first delivery boundary

A player can discuss a real object with a resident, hear another person legitimately join, propose a supported outing or demonstration, and understand what each person actually accepted and did. A refusal, an interrupted attempt or quiet company can be a complete useful encounter. The computer must not invent agreement, common knowledge, a successful test or another person's private reason merely to produce a coherent scene.

The first slice uses current exact instantaneous speech, actual hearing evidence, existing conversation membership, existing outings, native item offers and independently owned actions. The [base gathering profile](../worlds/base/social-gatherings.md) supplies its people, situation and selected language policy. The shared-reading view is required only when actual additional participation makes it useful; an independently complete one-resident improvement need not wait for a crowd.

No new social-practice ontology, authoritative scene table, shared mind, simulation clock, reaction scheduler, worker service or provider adapter is introduced. A “scene” in this slice is a useful description of linked existing activity, not a second place to store agreed truth. Arbitrary joint labor, loans, negotiated barter terms, synchronized combat, crowds and unattended hosting are not admitted through prose.

## 2. Existing semantic owners and actual callers

The source inspection baseline is local `main` at `362d3b0a2` in `https://github.com/Macrofold/OpenLegend.git`; this document proposes changes to those owners rather than claiming they already implement the complete experience.

| Responsibility                                          | Existing owner/caller                                                                      | Required use in this design                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Exact speech and the listener's actual fragment         | Domain speech/admission, `docs/hearing-and-speech.md`                                      | Commit a real source and each eligible listener's permitted evidence; conversation membership is not a transcript grant.              |
| Conversation identity, joining, leaving and merging     | `packages/domain/src/conversations.ts`                                                     | Retain existing interval/generation semantics; membership ends independently of physical work.                                        |
| Native outing proposal, exact acceptance and withdrawal | `packages/domain/src/outings.ts`, derived `outing-index.ts`                                | Reuse supported travel/combat-help families, exact revision and participant checks; do not extend acceptance to a different activity. |
| Current plans, goals and nested work                    | `agency.ts`, `activity-execution.ts`, `action-experience.ts`                               | Each actor owns their own admitted work; actual progress and output receipts come from these records.                                 |
| Spoken promises and supported obligations               | `packages/domain/src/commitments.ts`                                                       | Reuse only currently supported explicit forms and their lifecycle; arbitrary agreement prose creates no new executable duty.          |
| Custody and item offers                                 | Existing item-transfer/offer admission                                                     | A demonstration, verbal loan or scene summary never substitutes for actual recipient acceptance and transfer.                         |
| Personal evidence, interpretation and recall            | `experience.ts`, server memory retrieval and `conversation-context.ts`                     | Select actor-permitted sources before hydration; required recent outcomes use their existing shared path.                             |
| Decision intake and external execution                  | `ActorWork`, `ai-director.ts`, cognition-budget owners                                     | Preserve independent actor decisions, existing fair intake, cancellation, reservations and accounting.                                |
| Offered social choices and personal projections         | `action-catalogue.ts`, `outing-view.ts`, `decision-context.ts`, `context.ts`               | Render the same current terms/prerequisites for human and NPC consumers without new writable authority.                               |
| Wire contracts and conversation presentation            | `packages/protocol/src/index.ts`, `apps/client/src/ui/conversation.tsx` and its Talk owner | Extend permitted reading/participation only where needed; keep explicit addressee, draft identity and dots-only pending behavior.     |

These paths are pointers, not alternative contracts. [Conversation](../narration-and-conversations.md), [action experience](../action-experience.md), [agency](../agent-agency.md) and [save/load](../save-and-load.md#continuation-and-identity) retain their full semantics. Implementation must inspect the current callers again before editing because later changes may alter the baseline.

## 3. Shared circumstances without shared decisions

### 3.1 Reuse the records that already express the meaning

For the selected encounter, prepare one read-only view by joining exact existing references:

- The current conversation and the viewer's eligible speech sources identify the readable exchange.
- Existing outing records identify proposer, recipient, terms, current revision, independently accepted state and destination.
- Existing item offers identify the actual item/quantity and recipient; their current owner supplies acceptance and expiry.
- Existing goals/plans and action occurrences identify the actor's chosen work, actual committed steps and results.
- Existing personal commitments identify only the supported duties that the owner really recorded.

There is no copied participant list that can disagree with conversation or outing ownership. Conversation membership, physical presence and consent to a particular task remain separate relations. Several people standing together does not establish an accepted plan. A nearby overhearer can receive speech evidence without joining the conversation. A traveling companion can remain a companion while a conversation expires.

Use the existing identity allocator and exact record references; readable labels are projections. Do not use a person's name, coordinates or a concatenated pair of IDs as agreement identity. Any composite cache key uses a structured tuple/content digest and includes the owner/revision and disclosure scope that distinguish its meaning.

For this slice, no new authoritative record is needed. If a future selected activity cannot express its actual roles, obligations or shared resource claim through these owners, first identify that missing computation and design a narrow typed owner. Do not silently turn a read-only scene projection into an executable social contract.

### 3.2 Separate what may be shared

Native public object facts can be prepared once for a compatible read snapshot. Each participant receives only facts available to their own senses/inspection/knowledge. Disclosed terms can be reused when the participant actually heard or accepted them. Undisclosed goals, private memories, hidden inventory, beliefs and unsaid replies are never pooled into a joint prompt.

Each decision request has one actor as its decision owner. It can propose only that actor's supported speech, expressive act or native command. Independent requests may prepare concurrently through the existing server owner; commit is still serialized through current world authority. The first accepted participant's decision is not a template for the other participant's answer.

A shared summary is optional presentation of completed permitted sources. It cannot write a goal, resolve an obligation or dispatch another participant. The first implementation should prefer a direct shared reading surface to another paid summary call unless a measured reading need warrants one.

### 3.3 Actual admission sequence

1. A person speaks through existing speech admission. Store its occurrence, membership transition and per-listener evidence at the same authoritative boundary.
2. Eligible evidence enters the receiving actor's existing reaction intake. No automatic scene-wide fan-out creates a decision for every participant or bystander.
3. Build one actor-scoped decision from current circumstances, their actual heard contribution, relevant required outcomes and permitted recalled experience.
4. The actor independently chooses speech, silence, a current native action, continuation or refusal under the current execution/routing contract. An unrun/unavailable decision is not a chosen silence.
5. A proposed outing, item transfer or other supported command passes its existing current admission. Where another actor must accept, leave it pending until that actor's actual decision/input is admitted.
6. Return the actual receipt and resulting permitted evidence. Update views from published authority, not from the model's claimed result.

An optimistic model description such as “we agreed and walked there” authorizes neither acceptance nor movement. If it proposes an unsupported joint operation, retain any independently valid committed speech under its owner and report the unsupported operation honestly; do not invent substitute work.

## 4. Declared intentions, observed preparation and real progress

### 4.1 One projection, distinct evidence meanings

The server composes a small observer-scoped activity description from existing public/action facts and exact permitted speech. Preserve distinct provenance internally:

| Information                     | Allowed source                                         | Example presentation                                                                             |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Stated intention                | Actual heard self-attributed speech                    | “Ada said she wants to try the container.”                                                       |
| Visible current action          | Current permitted body/action observation              | “Ada is walking toward the riverside.”                                                           |
| My accepted task/terms          | Controlled actor's own live outing/action record       | “Walking together to the riverside; leave the outing.”                                           |
| Observed completed result       | Current permitted outcome evidence                     | “The container now holds the supplies you put inside.”                                           |
| Private reason or changed trust | That actor's own mind, or newly communicated testimony | Unavailable to another observer unless separately disclosed; never infer it from a progress bar. |

These are illustrative labels, not new authored strings embedded in engine code. The selected world's action/observation wording supplies names and relevant templates through existing descriptor and perspective owners. A different world can use the same mechanism for two machines comparing a device without installing wilderness people, camp vocabulary or human psychological laws.

The same fact must not be narrated twice as speech and an independently verified outcome. Quoted claims remain claims. The observer can hold a mistaken interpretation without changing the physical record or another person's interpretation.

### 4.2 User interface and ordinary actions

Retain the existing Talk header/history/composer arrangement. The header identifies the current addressee; the history can include other actually perceived contributions from the relevant joined/merged exchange. Selecting another addressee changes the destination of a future Send; it dispatches nothing and preserves the existing per-recipient draft rules.

Keep a compact participant/activity indication adjacent to the conversation only when it helps the current decision. It may show an actual accepted outing and its supported leave action. It must not expose a hidden participant list, another person's private plan, all their goals or a guess at the next speaker. A body that disappears from perception loses current location/action detail without deleting old heard words.

Use current native task progress only for finite measurable work. Do not convert elapsed provider time into action progress, assign completion percentages to a gathering or display a predetermined agreement outcome. Unknown duration remains unknown; an already stopped task keeps its actual end reason and completed consequences. Preserve current task-status and cancellation controls rather than adding scene-specific versions.

Messages remain the scrollable region; utilities, addressee and composer retain their own space. Use shared tokens, existing responsive panes and explicit overflow. Preserve reading position while viewing older contributions; offer the existing new-message return behavior. Long names, contradictory statements and a changing participant list must not displace the composer or hide the next addressee. Keyboard access, IME, enlarged text, narrow/short layouts and non-audio access to essential permitted information are acceptance requirements, not a new theme.

An NPC's optional self-explanation is speech with normal hearing/uncertainty, not an exposed chain of thought or verified causal trace. Native action animation/progress should carry ordinary work without a mandatory explanation call after each step. Retain restrained technical failures in the originating conversation and dots-only pending presentation; provider queue details belong to authorized diagnostics.

## 5. Attention interfaces and continuation

The [continuing-life technical design](continuing-lives-tech-design.md) owns interests, chosen bounds, supporting assumptions and reconsideration. This design consumes its actor-permitted current intention and supplies actual social evidence. It creates no second attention state, cooldown, need meter or memory store.

For the exact slice, Talk is sufficient to express the player's present conversation interest. Later deliberate Listen to remains conditional on genuine competing sources and supported semantics. Camera aim, selected object, keyboard focus and current conversation remain distinct. Switching a panel cannot silence a person or alter who heard their last words.

Known relevant changes use existing source-linked causes: an actual invitation, refused offer, changed accepted destination, interrupted demonstration or completed native result. Existing fair reaction intake coalesces equivalent optional reconsideration without dropping distinct required evidence. A repeated unchanged invitation must not create unbounded model work; a genuinely different term or physical consequence remains distinguishable.

Quiet/unfamiliar meaning still enters ordinary permitted semantic consideration and existing safe idle opportunities. Do not require every personal concern to have a predeclared native predicate, nor scan every possible remembered concern every tick. No new fixed initiative cadence, suppression threshold or “important character” priority is selected by this design.

After an interruption, show the remaining actual task and current accepted terms, not a replay of the entire episode. Whether to resume is the actor's fresh choice where their current purpose requires it. A material transfer already completed does not become pending again; a missed attack does not become a kill; an old promise does not reappear as accepted current work merely because its text is recalled.

## 6. Authority, lifecycle and durable boundaries

### 6.1 Complete-operation checks

Speech participation does not grant editing rights, material-use permission, recipe knowledge, physical access or consent to another operation. The command owner checks the complete current operation, exact resources, relevant grants, tool/body feasibility and actual destination. Visibility of an item does not authorize taking it. A native preview remains read-only and cannot reserve another person's agreement.

Preparation may retain exact immutable facts across an awaited read/provider call. At commit, recheck affected dependencies and live authority rather than rejecting on any unrelated world revision. Relevant changes include exact offer/outing revision, withdrawal, changed item/custody, actor life/participation, target placement, current action ownership and timeline. A benign conversation merge alone does not cancel a separately accepted physical task.

### 6.2 Leaving, stopping and loss

Leaving the conversation updates its membership owner. Leaving an outing updates its exact consent/work relation through the outing owner. Stopping native work follows the existing plan/cancellation contract. These are separate operations: hiding Talk performs none of them. One person cannot stop another's independent work merely by losing focus.

Death, retirement, incapacity, actual player departure or replaced work reconcile the relationships they invalidate through their existing owners. Cleanup uses participant-owned indexes and the exact old references, never a blanket world scan per departing person. Already launched effects follow their own lifetime. Completed movement, ammunition, damage, transfers and products are retained, with source-linked history where applicable.

Consent withdrawal remains possible through its existing permitted paused controls. Paused time, storage/maintenance holds and absent-player protection keep their current authority. The design does not invent a shared-world pause or treat a provider delay as fictional departure.

### 6.3 Save, load and stale external work

Persist current conversation intervals, outing terms and consent, actual plan/action progress, item state and personal evidence through the existing complete world cut. Validate both owner-to-action and action-to-owner references. Historical participants may outlive their live bodies under the history owner's rules; active required references cannot silently disappear.

Restore identities before links and rebuild only derived indexes. Reopening does not emit new speech, award acquaintance, accept an outing, replay a transfer or rerun a summary/provider call. The current save format changes only if an actually necessary record representation changes; this first read-composition design does not itself require a new stored scene format or compatibility adapter.

World/timeline/authority fences invalidate abandoned requests even if restored IDs recur. An already committed result remains committed; a stale result cannot invent later consent. Uncertain provider work remains accounted for and has no automatic paid retry. Revocation/forgetting applies to dependent shared views and summaries as well as source rows. Keep current privacy overlays and external spending outside gameplay rewind.

## 7. Performance and extension boundaries

### 7.1 Growth, shared preparation and invalidation

The growing dimensions are actual speech/listener pairs, group membership transitions, overlapping invitations reaching one actor, each actor's relevant actions and retained permitted history. A three-person initial encounter does not bound a settlement or a highly connected host. Final visible-row limits do not bound a full history scan.

Prepare the current viewer's membership and owned outing/offer records once per compatible request snapshot. Use existing participant indexes; select eligible speech/evidence IDs before indexed bounded hydration. Reuse common physical object/geometry facts only where permissions and snapshot agree. Do not generate each spectator's description before deciding whether they need individual interpretation. Current exact speech still establishes every eligible listener's evidence through its owner; avoiding unnecessary decisions never authorizes dropping listeners to meet a display or cost allowance.

Keep any optional shared-reading selector derived and read-only. Cache keys must include world/timeline, observer/disclosure scope, relevant membership/source revisions and actual depended-on geometry/action/item facts. Source edits, privacy changes, join/leave/merge, target retirement, current work replacement and restore invalidate the affected derived result. A mutable world without proven revision coverage uses a fresh read rather than an unsound cache.

No new unlimited scene-retention collection is created. Existing source/history pagination, retention and cold storage remain their owners. Readability summaries cannot become permanent unauthorized copies after source revocation. Unsupported or exhausted preparation reports incomplete/unavailable; it does not assert that nobody spoke or that a companion declined.

### 7.2 Complete cost and failure accounting

Measure source admission, eligible listener work, required evidence persistence, per-actor context/routing/selection/generation, summary/recall/reflection if used, command validation/commit and browser update/readability. Count the optional decisions actually avoided as well as calls dispatched, stale results, queue time, bytes and retained uncertain spending. Shared context construction is a saving only if complete caller cost falls without lost evidence.

Compare matched exact encounters before adding abstraction. Measure cold opening/reconstruction and warm refresh separately; then vary independent people, one highly invited person, history length, irrelevant objects and bursty group changes independently. Count visited memberships/sources/invitations and hydrated bodies as well as median/tail timings. An isolated selector or one warm three-person interaction cannot qualify the later seven-body/crowd offer.

No numeric capacity, universal attention maximum or cost saving is claimed. The selected profile's existing attendance/work allowances remain authoring hypotheses, not engine limits. [PS limits](../limits/product-scalability.md) and the [intelligent-simulation inventory](../limits/intelligent-simulation.md) retain the distinction between exact evidence obligations, current budgets and unmeasured scale.

### 7.3 Conditional expansions

Keep later gist, ongoing aggregate vocal activity, timed speech, broader joint work and unattended operation separately gated by their existing feature/decision owners. Their product descriptions remain useful but do not authorize a new source family, attention-based loss of current exact speech, a conversation clock, acoustic masking or a director that chooses for everyone.

If a selected later family earns its scope, extend the existing source/hearing, activity, memory and conversation owners together before advertising it. Preserve exact-versus-gist source identity, prospective perception and real physical consequences. This design deliberately does not preselect those unresolved policies or add speculative extension services in anticipation.

## 8. Verification and completion

Reuse AS-J15–16/19 and applicable AS-J21–22 from the feature spec through ordinary human/NPC surfaces. Existing evidence can qualify an unchanged owner, but a fixture returning the desired answer cannot establish independent choice or player enjoyment.

| Required case                                              | Mechanical observation                                                                         | Separate behavioral/presentation judgment                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Real object, three potentially different opinions          | Actual object/inspection, exact source/listener evidence, no invented recipe or gift           | People can disagree, decline or remain occupied without the encounter becoming pointless.   |
| One person knows a relevant secret                         | Only that person's decision receives it; common view contains disclosed facts only             | Their later choice may differ without another participant inexplicably learning the reason. |
| Recipient refuses, is unavailable or says nothing          | Distinct admitted refusal versus deferred/failed cognition; no unauthorized acceptance         | UI does not call a technical failure rejection or demand a crisis to sustain interest.      |
| Join/leave/merge while composing                           | Exact heard chronology, explicit addressee, preserved draft and reading position               | The player can identify who spoke and whom Send will address.                               |
| Supported outing and demonstration                         | Exact acceptance; independently owned movement; real command/transfer receipts                 | Walking/preparation/results explain the activity without constant motive narration.         |
| Quiet personally relevant invitation during other work     | Permitted source retained and existing intake/continuation handles it                          | Evaluate delayed response against what the person could know; no mandatory agreement.       |
| Cancellation/death/destination change during work          | Correct owner cleanup; prior costs/results survive; unrelated membership change preserves work | Interruption remains understandable and resumption is an actual choice.                     |
| Save/reopen and provider result from abandoned timeline    | Same current native partial work, no duplicate speech/effects, stale callback fenced           | Returning player sees current circumstances, not an invented absence transcript.            |
| Many equivalent invitations followed by a real consequence | Optional work coalesced while distinct actual evidence survives                                | No starvation of a quiet person or loss of a newly important exception.                     |
| Narrow/short/enlarged and keyboard-only conversation       | Explicit overflow, reachable controls, IME/send safety, stable draft/read anchor               | Essential speech, addressee and current task fit without overwhelming the world.            |

Design stages follow the owning tracker rather than a second project backlog:

1. **PS04 exact contribution:** compare existing one-resident play and fix the concrete reading/participation problem. Do not build group infrastructure merely because a third person exists elsewhere.
2. **PS04/DG18 small shared encounter:** complete the ordinary exact journey, explicit audience and independent supported acceptance/withdrawal, plus lifecycle/privacy checks above. Compose CE/NC/HE/AE owners; implement no second mind or scheduler.
3. **CE/PS qualification:** observe a whole worthwhile episode and a later return, with full costs and legitimate contrary outcomes. Engineering correctness and uncoached usefulness are separately reported.
4. **Conditional PS04 expansion:** only after a chosen need and the relevant policy answers, design/implement the selected gist, vocal, timed or broader-work family. Earlier slice completion does not close this later scope.

### Implementation modules mapped to existing work

| Module within this design                         | Parent design/work                                  | Scope boundary                                                                                                       |
| ------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Shared permitted reading and addressee continuity | DG18 / PS04, existing conversation and UI work      | Extend the existing Talk path; no second chat protocol or actor-independent transcript.                              |
| Independent participation and exact current terms | DG06 / PS04, existing outing/item-offer owners      | Compose supported invitations and custody; new kinds of joint obligation require their own selected design.          |
| Current-action and completed-result presentation  | DG01 / CE04–CE05, existing action-experience owners | Reuse actual task/outcome records; ordinary observers do not receive private plans or generated causal explanations. |
| Personally relevant social evidence and return    | CE03–CE05 / PS04                                    | Feed existing actor-scoped intake and continuation; no new scheduler, purpose store or suppression policy.           |
| Conditional source and crowd families             | DG18, ND15–ND16 / PS-D02                            | Preserve original proposed behavior and selection gates; exact slice acceptance does not claim this implementation.  |

Detailed assignments, dependencies and acceptance state stay in those focused trackers. These rows describe module ownership; they do not create new task IDs or turn a designed module into completed work.

No runtime, browser, database or provider trial was performed for this design. Human enjoyment, actual independent choice quality, capacity and complete operating cost remain unqualified. The document changes no service policy, model assignment or agreed Jev-only acceptance condition.

## Maintained records

- Behavior counterpart: [attention and scenes feature specification](attention-and-scenes-feature-spec.md), existing [attention/scene contract](../product-scalability/attention-and-scenes.md), and authored [gathering profile](../worlds/base/social-gatherings.md).
- Implementation: [PS04](../maintainers/product-scalability.md#ps04--coherent-scenes-and-limited-attention), [CE](../maintainers/character-experience.md), [conversation](../maintainers/narration-and-conversations.md), [hearing](../maintainers/hearing-and-speech.md) and [action experience](../maintainers/action-experience.md). The aggregate [intelligent-simulation tracker](../maintainers/intelligent-simulation.md) maps research coverage without replacing these owners.
- Limits and constraints: [product scalability](../limits/product-scalability.md), [hearing](../limits/hearing-and-speech.md), [interface](../limits/interface.md), [cognition](../limits/cognition.md) and [shared intelligent-simulation constraints](../limits/intelligent-simulation.md).
- Adjacent design: [continuing lives](continuing-lives-tech-design.md) owns personal reconsideration/continuation; the [product-scalability technical design](product-scalability-tech-design.md) owns operating offers, concurrency and fidelity.
- Decisions: [PS-D01–PS-D06](../../archive/05-project/open-decisions.md#product-scalability-integration-choices), [ND13 control recommendations](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization), [ND15 audio-media scope](../maintainers/needs-design.md#nd15--audible-npc-dialogue-microphone-input-and-proximity-voice), [ND16 hearing extensions](../maintainers/needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) and conditional source-family choices remain their existing policy gates. This exact slice assumes no new answer to them.

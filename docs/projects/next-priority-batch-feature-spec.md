# Next priority batch — feature specification

| Status      | Current progress                                                                                                                  | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | NP02 sensory preparation and NP04 camp-supply discovery are delivered; the other assignments and combined acceptance remain open. | 2026-10-03   |

The original selection was documentation, not runtime implementation approval. Originally proposed on October 2, 2026 from local `main` at `c2e670b0`. This is a fresh selection after the earlier PW delivery, not another estimate for its original five-person week. The [technical design](next-priority-batch-tech-design.md) defines the implementation boundaries; the [tracker](../maintainers/next-priority-batch.md) owns status and the [five prompts](next-priority-batch-prompts.md) are standalone handoffs.

## Purpose and priority

Make existing foundations trustworthy and existing gameplay easier to use before adding another broad mechanic. Review covered stable-system bugs, engine/world separation, repertoire opportunities and presentation. These were search categories, not allocation quotas. No new external research, performance runs, game sessions or provider experiments were performed for this selection; source-confirmed paths and earlier qualified evidence are identified separately.

| Order | Assignment                                         | Why now                                                                                                 | Main outcome                                                                                                                                |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | NP01 — Reliable AI outcomes and spending           | Confirmed failures in a shared provider/accounting foundation affect every later AI feature.            | Honest rejection, timeout, invalid-output and billing results; configured allowance and context-limit reporting agree with their contracts. |
| 2     | NP02 — Sensory work follows changed objects        | Existing sight caches still pay preparation work across every object; adding more content compounds it. | Sparse changes avoid repeated all-world preparation without losing sightings or changing event order.                                       |
| 3     | NP03 — Craft with an invented material             | Moving a restriction into world configuration did not make invented outputs safely reusable.            | A real intermediate material can feed a later woven-container invention through positive consumer checks.                                   |
| 4     | NP04 — Find and choose camp supplies               | Implemented activities are hidden by arbitrary candidate prefixes and incomplete inspection UI.         | Players can find, approach, inspect and choose permitted supplies and finish existing camp work.                                            |
| 5     | NP05 — Read NPC replies before generation finishes | An explicitly requested conversation improvement remains absent despite owner-chat streaming.           | Safe, unfinished NPC reply previews reach the intended player before complete response validation, then reconcile with actual speech.       |

Priority is not a required serial schedule. Four implementation assignments have existing prerequisites on the inspected main; NP05 can independently begin its provider/latency feasibility gate under the [shared boundaries](next-priority-batch-tech-design.md#parallel-boundaries). NP01 and NP05 touch different responsibilities in provider files. NP03 uses the existing container family; NP04 works with current materials and does not wait for NP03. No worker needs messages or decisions from another worker.

## Scope, effort and readiness

The current request supplies five assignments by default and no time horizon or staffing hours.

| Assignment | Changed logic estimate             | Effort including evidence/docs/review                              | Principal risk                                                       |
| ---------- | ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| NP01       | 300–550 lines                      | 18–32 hours                                                        | Incorrect release or settlement of spending exposure.                |
| NP02       | 450–850 lines                      | 20–36 hours                                                        | Missing a change and therefore missing an observation.               |
| NP03       | 500–950 lines                      | 18–32 hours                                                        | Accepting a forged material capability or duplicating resources.     |
| NP04       | 450–850 lines                      | 20–36 hours                                                        | Stale permission/evidence or confusing browsing with inspection.     |
| NP05       | 700–1,200 lines if the gate passes | 6–12 hours for feasibility; 34–56 total if implementation proceeds | Premature disclosure, provider support and little real latency gain. |

The conditional full scope is roughly 110–192 engineer-hours. These ranges are not a claim to fill a fixed week or reflect an assumed AI productivity multiplier. NP05's blocked implementation is not made complete by documenting the blocker.

Estimates include implementation, relevant integration/verification, documentation and review, with uncertainty recorded per assignment. They are neither capacity commitments nor an inherited 400-hour target. The design changes zero runtime logic in this planning task; the eventual assignments each estimate their affected logic separately.

All implementation prompts refer to these documents and current repository guidance. The planning files must exist in the starting commit/checkout supplied to a worker. Uncommitted files in this checkout will not appear in a newly created worktree merely because its branch starts here. This plan grants no commit, merge, deployment, spending or inter-task communication authority.

## Important alternatives deferred

- **Save, checkpoint, family editor and observer-name repairs:** the `codex/save-editor-family` checkout has overlapping uncommitted changes. Its committed tip is already an ancestor of main; branch ancestry alone would miss the work. This batch does not duplicate it. Recheck activity before implementation because the audit is a snapshot.
- **Worlds without health:** accepted EWF03 work remains important and is the next large body-system candidate. It crosses lifecycle, combat, editor, cognition and persistence; the estimated 1,000–1,800 logic lines deserve a focused body-model design. This batch chooses a smaller concrete composition seam and measured sensory bottleneck first, without treating mandatory health as solved.
- **Exact approach timing and broader proportional simulation:** preserve the existing stages in [proportional step work](proportional-step-work.md). NP02 changes preparation of perception, not movement timing, numeric publication or the scheduler.
- **Approximate memory search and 100k-memory restore:** C17 remains high priority, but restore repairs overlap active storage work and current exact-search findings do not establish approximate-search recall quality. This is not closed by existing PW09 cache work or by reducing history size.
- **World Agent workspace qualification:** PW05/PW11 integration and broader UI acceptance remain open. NP05 concerns character replies, not a claim to complete owner-chat streaming or the saved-invention workspace.
- **New medical/weather/building behavior:** useful repertoire proposals, but existing camp work should first be reachable. Self-treatment also needs an accepted treatment/effect rule; a new label cannot substitute for that decision.

## Maintained records

- Implementation and dependencies: [NP01–NP05](../maintainers/next-priority-batch.md), indexing narrower children of the existing MW/CR, EPR/PF, INV/EWF, PW/AC/PO/BW/UIUX and NC owners. Planning closes none of their runtime criteria.
- Limits and constraints: [AI execution](../limits/ai-execution.md), [cognition](../limits/cognition.md), [native work](../limits/native-work.md), [inventions](../limits/inventions.md), [base-world choices](../limits/base-world.md), [inventory interface](../limits/interface.md), [object queries](../limits/objects.md) and [conversation delivery](../limits/narration.md). Each task links its particular entries; there is no competing batch-wide limits catalogue.
- Mechanism and source map: [technical design](next-priority-batch-tech-design.md). Existing cross-project specifications remain canonical; new choices here are proposed targets until authorized.

## NP01 — Reliable AI outcomes and spending

**Status:** proposed implementation assignment; this document does not authorize runtime changes. The source audit used local `main` `c2e670b0`. Estimated scope: **300–550 changed logic lines**, approximately **18–32 engineer-hours**, including integration, relevant evidence, documentation and review but excluding waiting on external dependencies. These are estimates, not completion deadlines. Risk is medium–high because mistakes can hide a failed character decision or incorrectly release reserved funds.

### Purpose and priority

A player needs to distinguish “the AI service rejected our credentials,” “the service received the request but we cannot confirm its result,” “the service returned unusable output,” and “you cancelled the request.” Those events currently collapse into the wrong failures on several Macrofold routes. Some rejected requests also retain a charge allowance even though a model never started. Separately, malformed reported prices can look like zero cost or fail database settlement, and a hidden $50 monthly ceiling contradicts the documented configuration range.

Repair these existing boundaries before adding more consumers of AI replies. Keep ordinary game actions available when thinking is unavailable. This is correctness work in the established provider and accounting systems, not a new provider, retry system, budget or gameplay mechanic.

### Supported journeys

1. **A player speaks while credentials are rejected.** The request reports that the service is unavailable. A definitive rejection before execution releases that request's reserved amount; no generated speech, world change or automatic second request follows.
2. **A character's request times out after being sent.** The request reports that its completion is unknown unless a verified terminal result establishes otherwise. Its reserved amount remains counted when execution or billing remains uncertain. A later authoritative receipt reconciles the original request, without generating again.
3. **A character receives malformed decision output.** The decision is rejected as invalid. If the original request definitely finished, that fact remains separate from missing price information: the output can be invalid while its billing is still unconfirmed. Nothing malformed reaches action admission.
4. **A player deliberately cancels.** Cancellation remains distinct from a deadline. Cancellation before dispatch is free; cancellation after dispatch cannot erase possible charges or allow late output to act in the world.
5. **An operator configures a supported allowance above $50.** The actual ledger honors that configuration without changing the $50 default or the existing $100 configuration maximum. Per-decision and per-episode restrictions still apply. This software setting is not permission for an engineer to spend money.
6. **The character's required information exceeds the existing request allowance.** The job reports an explicit context-size failure. It keeps the character's accepted personal information and required evidence intact and makes no further provider request from that failed preparation. Previously completed preparation calls, if any, retain their real receipts and costs.

### Scope

- Make Macrofold judgment, short generation, native generation and reflection use consistent existing result meanings and safe, stable reasons; preserve the native authoring/question/recovery lifecycle.
- Separate execution certainty, output validity and billing certainty without adding fields to the public result/receipt contracts.
- Validate reported cost values and aggregate amounts at provider decoding and before authoritative settlement. Missing or unusable price evidence is never silently converted to zero.
- Remove the remaining undocumented monthly clamp and reconcile its limit record.
- Use the existing context-size error through all affected decision-preparation paths. Do not change prompt content, quotas or memory selection.

### Non-goals and boundaries

No new provider, automatic paid retry/fallback, new balance, cross-world payer system, invoice importer, new model pricing policy, larger context allowance, abbreviated identity snapshot, reflection rescheduling, prompt slimming or browser redesign. Existing native completion, question pause/recovery, streaming event order and permission checks remain intact. The reply-streaming assignment consumes the same result and receipt contracts; it does not require a competing failure translator.

The work has no bundled-world rules. Request execution and spending validation are engine/application responsibilities. Current public result and receipt shapes are sufficient and remain canonical; do not add versioned or compatibility alternatives. Financial records remain outside gameplay rewind.

### Completion criteria

- The outcome table in the technical design is demonstrated through the actual adapter, its caller and the spending ledger, including genuine pre-execution rejection, malformed completed output, uncertain dispatch, caller cancellation, deadline and confirmed terminal failure.
- Known rejection never charges the reserve; ambiguous execution never becomes free merely because a request failed or was cancelled.
- Valid zero and fractional USD amounts work; blank/signed/malformed microdollar strings and nonfinite, negative or unrepresentable cost data cannot undercount spending, overflow arithmetic or break settlement. Repeated and late receipt handling preserves exact request identity.
- The configured monthly ceiling works below, at and above $50 within the existing supported range, while smaller episode/decision ceilings and concurrent reservations remain effective.
- Every affected required-context overflow records `context-exceeded`, retains required content, produces no world effects and dispatches no subsequent model request from the rejected preparation.
- Public diagnostics explain the actual failure without exposing raw provider output, credentials, private prompt text or internal exception details. Existing request/Run identifiers remain available only on their current authorized diagnostic surfaces.
- Related task records distinguish delivered repairs from unrun deployment/model-quality gates. This assignment does not claim the complete Worker migration or all historical accounting qualification is finished.

### Delivery shape and dependencies

First settle the shared failure/cost classification, then apply it to each existing route and downstream settlement, then finish the context-size and configuration repairs and their documentation. The prior invention integration prerequisite recorded in MW05 is present on the audited main. No other new assignment must finish first, and no new service or credential is required to establish these contracts. Existing transport injection and disposable database callers can exercise the acceptance conditions; live-provider quality is a separate question.

### Maintained records

- Implementation: [NP01](../maintainers/next-priority-batch.md#np01--reliable-ai-outcomes-and-spending); existing [MW05](../maintainers/macrofold-worker-api.md#mw05--outcome-classification-and-request-body-fixtures) owns provider outcome repairs. Preserve its request-body requirement rather than declaring the entire item done from an outcome-only change.
- Related task records: [CR12](../maintainers/cognition-redesign.md#cr12--acceptance-and-tokenlatency-evidence), the [level-1 follow-ups](../maintainers/TODO.md#level-1-decisions-follow-up), [WAF02](../maintainers/TODO.md#workshop-transport-and-funding-regression-coverage), [IER04](../maintainers/TODO.md#invention-extensibility-review-regression-todos), and the scoped accounting/recovery parts of [WW07/WW11](../maintainers/world-agent-writes.md#remaining-implementation-and-qualification). Mark only demonstrated requirements complete; retain any specifically tracked automation or broader qualification not delivered.
- Limits: [AI execution](../limits/ai-execution.md), especially [LA182](../limits/ai-execution.md#la182), and [CG08/CG09](../limits/cognition.md#cg08). No new discretionary workload cap is proposed. Exact finite/safe-integer cost checks protect arithmetic integrity, not a new spending allowance.
- Current contract: [AI receipts, outcomes and accounting](../ai-providers.md#receipts-outcomes-and-accounting); [technical design](next-priority-batch-tech-design.md#np01--reliable-ai-outcomes-and-spending).

## NP02 — Sensory work follows changed objects

**Status: delivered in this branch.** [October 3 evidence](../verification/perception-reaction-intake.md#np02-sensory-preparation--october-3-2026) records exact observation parity, constant warm source preparation and remaining native/server limits. This is a bounded continuation of EPR02, PF12.3 and PF13.11, not a replacement for their broader acceptance or a repeat of PW08.

### Player outcome and priority

When one animal moves, the server should reconsider what nearby characters can notice without preparing every distant rock, possession and character again. Characters must still notice arrivals, departures and meaningful outward changes at the same moments, and must not gain knowledge from hidden causes. This matters before enlarging the world: the starting implementation avoided many exact sight tests but still prepared and compared the whole source population each sensory phase. NP02 removes that repeated warm preparation; observer-wide exact queries, cold recovery and publication retain separate costs.

At inspected main `c2e670b0`, `kernel.ts` constructs captures for all physical roots and computes body maxima before observer processing. `encounter-cache.ts` then constructs fresh source maps and compares all entries. The existing PW08 changes already reduce sighting-record edits, incident-pair invalidation and repeat crossing forecasts; retain those improvements. Existing recorded CPU percentages came from older/shared-host runs and are not a current baseline or promised saving.

### Included behavior

- Keep a derived collection of current sensory sources and update it from complete, phase-specific notices of movement, appearance, participation, body/sense and root-membership changes.
- Identify potentially affected observers using both the old and new source position, existing sight/contact geometry and changed observer settings. A stationary observer can notice a changing source; a moving observer still evaluates the sources it can newly encounter.
- Preserve occurrence-time public audiences, private encounter records, ongoing sighting identity, contact continuity, outward-detail reports and perception-loss cleanup. Source preparation does not authorize disclosure.
- Rebuild conservatively after missing change information, creation/load, a different snapshot branch, geometry or installed-sense changes, or exhausted change bookkeeping. A fallback costs work; it must never omit an observation.
- Retain cooperative native work boundaries while preparing large rebuilds or genuine large audiences. Do not publish partially updated perception or drop witnesses to meet a time target.

### Explicit exclusions

No changed movement timing, private-walker conversion, new sense physics, lower-fidelity perception, population/retained-memory cap, background simulation, generalized scheduler, lazy numerical state, worker ownership change or replacement of the authoritative entity table. Whole-world copying during final publication and genuine dense first-exposure costs remain separately tracked. This task cannot claim those problems solved merely because source preparation is smaller.

### Completion evidence

Compare exact observable outcomes with the same starting state and offered-time schedule before and after the change. Include one changing source among successively larger distant static populations; separated groups; a moving observer; entry and departure in one outer advance; outward appearance/fire/resource/remains changes; roots entering/leaving containers; spawn/retirement/death; blocked/re-enabled senses; changed body dimensions; map/manifest replacement; nested commands; cancellation; and checkpoint/reopen or snapshot forks. Include the existing fleeting-sight/contact cases.

Report captures, roots visited, rebuilt source entries, affected observer/candidate counts, fallback reasons and maximum bookkeeping size, separately from exact tests and actual records written. Warm sparse growth should no longer require full-population source comparison. Cold rebuild and dense legitimate fan-out remain visible in results. Measure native and real-server costs; show achieved game time and command responsiveness without claiming loaded-host timings establish deployment capacity.

### Ownership, estimate and maintained records

The engine owns derived work selection; installed worlds retain sight/body rules and disclosure wording. Extend the current dependency, root, perception and native-step owners. No new authoritative perception database or separate observation pipeline.

Estimate: roughly 450–850 logic lines and 20–36 engineering hours including verification and reconciliation. Main risk is incomplete change coverage, especially changes within one unpublished advance; this is more important than a favorable throughput number.

Update the precise child requirements under [EPR](../maintainers/events-perception-and-reactions.md), [performance](../maintainers/performance.md), [simulation time](../maintainers/simulation-time.md), [proportional work stage 2](proportional-step-work.md#stage-2--sight-work-follows-change), [native-work limits](../limits/native-work.md) and [C18](../maintainers/limits-audit.md#c18). Keep their broader unresolved work open. Record concise measured evidence in the existing perception verification owner.

## NP03 — Craft with an invented material

**Status: proposed implementation.** This is one positive material-composition proof under INV-3.5/INV-6, not arbitrary recursive invention or a claim that PW02 omitted its agreed work.

### Player outcome and priority

A character can learn an invented cord-making technique, craft its actual cord, then invent and craft a woven container that uses that cord as binding. The container has the existing real capacity and custody behavior. This establishes a useful path from one invention to another without accepting invented properties merely because an item has a promising name or inherited tags.

At inspected main `c2e670b0`, all bundled invention families require native ingredients. That restriction is correctly world-owned but blocks even safe invented intermediates. Existing outputs also inherit source property tags, so removing the restriction alone would wrongly allow a finished weapon to masquerade as raw binding material. [Composition](../invention-composition.md#3-composition-contract) explicitly requires positive consumer checks first.

### Authored capability and exact first consumer

Add the trusted bundled-world `base:cordage` recipe family. Its one role is prepared fiber, requiring native material with `fiber` and `flexible` properties. A recipe selects one real eligible definition and consumes two items to make one homogeneous cord item in 60 game seconds. These are the existing native cord-preparation quantities and duration from `worlds/base/items.ts`, shared from one authored rule owner rather than copied into another implementation. The generated item has the existing cord's binding/flexible material properties, packing load one and no weapon, food, heat, storage or autonomous effects. Labels and descriptions remain generated candidate content; they cannot add strength, extra yield or other unsupported mechanics.

Do not add a meaningless strength knob or claim differently worded cords have mechanical differences. This first capability proves safe reusable material identity and composition. It deliberately uses the existing preparation tradeoff; broader material quality requires its own real consumer. Existing native preparation remains available through the same authored rule and is not a compatibility adapter.

Only the woven-container **binding role** additionally accepts positively certified generated binding material. Its pouch role remains native prepared weaving material. Other families retain their current admission rules. Existing container formulas remain unchanged: for 2–8 pouch units, binding quantity is ceiling(pouch/2), capacity is 4×pouch quantity, empty packing load is ceiling(pouch/3), and work is 24 game seconds per total input item. There is still one individual output container per craft. The cord's preparation work is a separate previously completed action, not secretly charged again by container crafting.

Installation does not create supplies. Creator installation does not teach everyone. Actors see only materials and techniques their existing knowledge/possession permissions allow. Ordinary compatible invention keeps its current automatic admission; creator edits keep the existing exact review/Apply path. Craft remains a separate chosen action that rechecks actual items and consumes them through current native accounting.

### Playable scenario and meaningful refusal

Starting from actual gathered reed fiber, prepare the fiber through the existing native action, obtain/learn a new cord technique, craft enough of its output, and choose that output in a woven-container invention. Craft the container, put actual objects into it and retrieve them; save/reopen and reuse the learned recipes without regeneration. A different fitting cord name has the same supported mechanics. A genuinely different installed-world fiber definition with the required authored properties can fill the producer role without changing engine code.

Refuse a weapon/container with inherited binding tags, a copied certificate on an unrelated item, missing or changed producer meaning, unknown/private ingredients and unfulfilled material quantities. Failed admission changes nothing. Failed/canceled crafting follows current consumption and receipt semantics; this work grants no refund or duplicate output.

### Scope, estimate and maintained records

Reuse the trusted family/compiler, item-definition, exact dependency, inventory and crafting owners. Include model/native discovery, creator recipe fields, ordinary recipe/Craft presentation, actual character choices where claimed, persistence and clear failure explanations. A fixture proving that crafting works is separate from a live model choosing the two-stage chain.

Exclude arbitrary recursive inputs, batch-output redesign, attachments, material-strength simulation, tools-as-preserved-inputs, live definition migration, automatic recipe instruction from mere possession and new authoring permissions. No independent implementation task is a prerequisite; the relevant recipe and container foundations are already on the inspected main.

Estimate: roughly 500–950 changed logic lines and 18–32 engineering hours including evidence and documentation. Main risks are forged capability claims, accidentally duplicating units or widening ingredient/private-definition scope.

Reconcile the exact composition child under [INV-3/INV-6](../maintainers/inventions-and-world-evolution.md), [EWF09](../maintainers/extensible-world-foundation.md), base-world container/material documentation, [recipe-family limits](../limits/inventions.md#rf01--world-owned-recipe-families), [object limits](../limits/objects.md) and the existing invention/camp verification owners. Broader recursive composition, live-law and full family-registry acceptance remain open.

## NP04 — Find and choose camp supplies

### Purpose and current gap

Make the already implemented camp activities usable when a scene or inventory contains many objects. **Implemented October 3, 2026; scoped acceptance is recorded in [camp-life evidence](../verification/camp-life.md#np04--camp-supply-discovery-october-3-2026).** At the planning baseline, the camp form examined the first 32 visible objects before checking whether they can serve its requested role, examined a possession prefix, and presented a static select. An eligible fire or fuel source could disappear behind unrelated objects. A ground cache was offered only after the character had explicitly inspected it; opening the browser inventory alone does not perform that character action. The warning to inspect or narrow the search had no complete route in that form.

This is a completion of the existing gather/pack/fuel and finite fire-watch journeys, not a new survival activity. See [camp activities](next-playable-week/camp-activities.md#observation-memory-and-ordinary-ui), [camp rules](../worlds/base/camp-routines.md) and [inventory UX](../ui-ux/inventory.md).

### Intended player journey

1. Open camp work and choose an installed activity. Each object field opens a labeled search for that particular role: gathering source, cache, supply or fire. The world provides these labels and eligibility rules.
2. Search and continue through permitted results. Rows identify the particular object, known location/distance and whether it can be used now. Duplicate names remain distinguishable using permitted details. A chosen object remains named when its search row leaves the current page.
3. A visible cache outside reach can be selected as a draft target without revealing contents. The form offers a separate, explicit approach action; arrival does not start camp work. Once access allows it, an explicit inspection uses the normal character action. A read-only search never walks, inspects, moves supplies or writes character memory.
4. Inspection exposes only its permitted page and continuation. The player can inspect later pages and pick an observed material. Partial evidence does not become a complete stock count. Changing location, custody, access or timeline invalidates the corresponding evidence and previous review.
5. Review the existing finite activity, then start it through the existing command. The review names the selected objects, quantity, retained personal stock, travel and known blockers. A full fire, depleted source or insufficient stock remains a meaningful refusal, not a promise of future success.
6. Hide/reopen or resize the form without losing the chosen identities and unfinished parameters in the same authorized scope. Pause/stop/restart preserves the activity's already committed steps and current guards.

### Scope and exclusions

Include role-filtered discovery and continuation, the existing storage picker connection, explicit approach/inspection controls, stale-evidence recovery, and real browser completion of the affected camp journey. Preserve the existing finite method and bounded watch; do not add new recipes, automatic stock search, automatic learning, autonomous daily routines, omniscient stock totals or a larger total inventory limit. Native learning/reuse mechanisms remain unchanged; any claim of model-selected retention/reuse still requires its own real evidence under PW10. NP04 does not close that broader acceptance by showing a manually chosen activity.

### Completion criteria

- An eligible source/fire after more than 32 unrelated visible objects and an eligible carried object after more than 32 unrelated possessions are findable through the ordinary form, with bounded reads and continued search rather than a larger prefix.
- A permitted ground cache is selectable; approach and explicit inspection lead to a valid review and execution. A distant/private cache reveals no unobserved contents. Opening a nested bag does not disclose its unopened descendants.
- Search, paging, changing a field and choosing duplicate-name objects preserve exact identities. Empty, filtered-empty, partial, stale and unavailable are distinct; late responses cannot restore invalid choices or leak a previous character's labels.
- A finite gather/pack/fuel request and a separately bounded watch execute through the actual UI. Their chosen reserve, real consumption, time limit, cancellation and meaningful refusal remain unchanged. A low-fuel setup is disclosed; waiting beside a full starter fire is not evidence of refuelling.
- Keyboard/pointer selection, Escape/focus return, narrow/short layouts, enlarged text, long labels and errors work without hiding Review/Start/Stop or sending a click/key to the world behind the picker. Native command refusal keeps the player's draft and explains what must be refreshed.
- Current-format reopen clears obsolete inspection/selection evidence under the existing timeline owner; no duplicate movement or consumption is introduced. Relevant PW03/PW04/PW10 and UIUX acceptance is updated only where demonstrated.

## NP05 — Read NPC replies before generation finishes

**Proposed.** This implements the first direct-conversation slice of [NC19](../maintainers/narration-and-conversations.md#nc19--progressive-display-of-structured-conversation-replies). It is separate from the World Agent's already implemented plain-text progress delivery. No runtime implementation or live streaming qualification is claimed by this document.

### Feasibility gate before implementation

First inspect and exercise the configured structured-output route through the actual direct-conversation caller. Establish whether a complete eligible speech operation can arrive before the enclosing response finishes in representative ordinary replies, and measure the separation including preparation/provider startup. A constructed multi-operation fixture proves handling, not ordinary benefit. This 6–12-hour estimate describes work size, not a permission to stop unfinished scope at a time limit.

Proceed with private preview delivery and the Talk UI only if the route supplies that safe opportunity in representative replies. If it does not, retain final-only behavior, record the findings and leave NC19/NP05 implementation incomplete. Present the owner with the choice of retaining final-only replies or separately designing a server-bound public reply field; do not change the response schema, force additional operations or add another provider call to manufacture an improvement. Missing authorized provider access similarly leaves the gate unresolved. This is an explicit prerequisite, not a hidden assumption of readiness.

### Player outcome

A player speaks to a nearby NPC. When the first complete eligible speech operation is available but the model has not yet finished its full structured decision, the player can read that proposed reply in the existing Talk panel. The text is visibly unfinished: **“Reply forming — not spoken yet.”** When the native game accepts and delivers the speech, the ordinary heard message replaces the temporary text once. The final heard message remains the only conversation, caption, memory and world-event evidence.

This makes a long model wait useful without allowing an unfinished JSON decision to perform an action or fabricate something that happened. Other people nearby do not see the temporary text. They hear only speech actually committed by the game through the existing hearing rules.

### Explicit first-release scope

- Preview only a generative response to a direct player-to-NPC chat request owned by the currently authorized player account/character. Background cognition, reflection, NPC-to-NPC speech, overheard triggers, player invention, narration, owner authoring and Jev selections remain final-only under their existing behavior.
- The model still chooses whether to speak, to whom, at what supported volume and what other operations to propose. Do not force a reply, narrow the available recipients, select a different model or add a new paid request merely to obtain preview text.
- Preview only the first operation in the response, and only when it is eligible speech. It must address the requesting character and have no prerequisite operations. If the first operation is thought, a note, an action or ineligible speech, this attempt remains final-only; do not scan forward for a later eligible reply. Other operations wait for ordinary final admission.
- Before exposing any text, the server must have parsed and strictly validated the entire closed operation object, including its identity, recipient, volume and all mutually exclusive operation fields; verify that both characters remain eligible and that the requesting character currently has **clear** hearing of this NPC at that volume. Partial hearing, unknown attribution, inaccessible people and uncertain eligibility remain final-only. No invented acoustic rules or unseen speaker identity.
- A preview is deliberately provisional. The final decision can be invalid, cancelled, superseded, refused or fail current game admission; in those cases the text is not converted into something the NPC said. Because a human cannot unread a preview, the above disclosure gate must run before publication and whenever showing the preview, not after completion.

### Reading, completion and failure

The temporary reply sits with the originating player message and retains the same visual position until final admission. Its text appears only as a complete validated speech operation; incomplete sentence fragments are not shown. It uses the NPC name already permitted to that player; no canonical hidden name or internal operation identifier is displayed. Keep the existing modest waiting presentation before text arrives. Do not insert provider stages, token counts or diagnostic messages between character utterances.

Following the latest messages follows the new provisional reply. Reading older messages preserves the visible position and offers the existing new-message affordance. Opening another person, hiding Talk, resizing or reconnecting preserves the appropriate player draft and reading position; a late fragment never appears in the wrong conversation. Long text wraps within the panel, and the composer remains reachable on short and narrow screens. Keyboard/IME behavior and world-input isolation follow the existing handbook.

Final admitted speech replaces the preview using the existing response/utterance relationship, not matching text. Display the player's actual heard projection, even when it differs from the temporary text. A response that contains multiple speech operations still produces its real final messages; the preview never makes an extra one.

On cancellation, invalid output, admission refusal or changed eligibility, remove the unfinished words and retain a small, specific message-local result such as **“Reply did not finish”** where the established failure presentation permits it. Silence or an NPC choosing another action is not a technical failure. No success badge, automatic regeneration or automatic paid retry is added. A disconnected browser clears provisional words until an authorized current snapshot is read; reconnecting never starts inference. Restarted server recovery uses existing final-job recovery and clears volatile previews.

### What must be demonstrated

1. The configured supported provider route delivers a validated speech-operation preview to the real browser before the full structured decision completes, using one original request. Record first browser text and final completion separately, including preparation and provider startup in the end-to-end measurement.
2. Arbitrary chunk boundaries, escaped quotes/braces, split Unicode, reordered fields, multiple operations and strings containing JSON-like text cannot expose raw JSON, private thoughts, goals, actions, notes, names or another recipient's words. Late metadata and incomplete operation objects are buffered; property order never grants disclosure. If the only operation arrives with final completion, normal final-only delivery is correct.
3. No preview creates events, awareness, memory, captions, goals, native actions or saved conversation rows. Full final validation and native current-state admission remain controlling. Malformed, refused, truncated or cancelled output preserves the actual billing outcome and does not become an authoritative reply.
4. Recipient changes, walking out of clear hearing, death/incapacitation, control replacement, revoked access, save/load, a superseding attempt and a late old fragment withdraw or reject provisional text. Other ordinary clients and creator diagnostics receive no new draft access through this feature.
5. Reconnect to an active attempt can read the current permitted snapshot; reconnect after final completion retrieves actual history; server restart does not resume a paid call merely for text. The browser cannot duplicate final speech or preserve an old preview as a completed message.
6. Actual Talk input and layout remain usable in the full game with ordinary/long replies, older reading, narrow/short/enlarged presentation, keyboard and composition input. Reuse shared Conversation primitives; qualify affected World Agent reading behavior only if changing those shared primitives.

### Excluded work and dependencies

There is no full World Agent workspace requalification, generated speech audio, streaming private cognition, provisional public captions, new narration system, new provider routing or general recursive JSON UI. Existing shared conversation controls may need small fixes; that does not close all PW11/UIUX gates.

Provider streaming support must be verified for the configured route during the feasibility gate. A missing route capability leaves a clearly identified acceptance dependency; retain normal final-only behavior, document the blocker and leave preview implementation open rather than proceeding with decoder, admission and presentation work. A fixture cannot prove live latency. Do not assume the owner-session Run stream and direct-inference stream share replay or billing semantics.

This scope does not promise first-token display. The current schema lets the model choose another recipient and mixes public speech with private operations; the safe earliest disclosure is a closed, validated speech operation. For a single-operation answer this may save almost no time. Report that result rather than change character choice or invent a speedup. A truly token-by-token public reply would require a separately accepted response contract with a server-bound public channel.

The task uses current main contracts. NP01 separately repairs provider result/receipt classification; this assignment must preserve those existing semantics and does not depend on a new sibling interface or communicating with another task.

### Maintained records and effort

Update [NC19](../maintainers/narration-and-conversations.md#nc19--progressive-display-of-structured-conversation-replies), affected NC02/NC10 and [UIUX03/UIUX05](../maintainers/ui-ux.md), [narration behavior](../narration-and-conversations.md), the relevant [AI architecture](../memory-architecture.md) explanation, [chat/invention guidance](../ui-ux/chat-and-invention.md), and concise verification evidence under the existing documentation policy. Add a proposed-to-current preview limit entry in [interface limits](../limits/interface.md) and link relevant [AI limits](../limits/ai-execution.md) and [narration limits](../limits/narration.md); these owners retain their broader unqualified work.

Estimate **700–1,200 changed logic lines**, approximately **34–56 engineer-hours** including capability qualification, implementation, relevant evidence, documentation and review, with high privacy/recovery risk and an external live-provider acceptance dependency. This is a reasoned task estimate, not a fixed AI multiplier or a newly granted spending/time allowance.

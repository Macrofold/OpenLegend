# Agent agency implementation tracker

Proposed follow-on: [PX04](parallel-batch-04-expeditions-and-exchange.md#px04--voluntary-shared-outings) adds one voluntary shared outing through existing individual activity/agency owners after PG02. It covers only the named AG05/AG06/AG07/AG12 child acceptance; no broader agency or unattended-life task is closed.

## Spatial dependencies

[SW05–SW08](spatial-world.md) supplies supported ground route execution, results and senses; add SW12 only for flight-specific scenarios. Existing AG delivery can use flat schema-9 fixtures independently of the full camera/flight roadmap. Do not reset the operational goal/plan implementation or CR02 Jev-only work.

This is the focused tracker for optional multi-operation decisions, actor-owned operational goals, short native plans and their integration with existing cognition and invention. Checked items have local implementation/runtime evidence; unchecked items retain their full acceptance requirements. Automated and live-provider qualification remain separate gates.

Behavior belongs to [Agent agency](../agent-agency.md); the operational contract belongs to [Agent agency runtime](../../archive/07-technical-architecture/agent-agency-runtime.md). Existing [CR/CH](cognition-redesign.md), [NC](narration-and-conversations.md), [INV](inventions-and-world-evolution.md), [performance](performance.md) and [save/load](save-and-load.md) trackers retain their own work. Their IDs and valid acceptance requirements must not be silently replaced by AG tasks.

[EWF06](extensible-world-foundation.md#ewf06--action-and-controller-integration-without-a-parallel-agency-system) supplies common integration; AG retains its delivery and AG01–AG04 need not wait for complete EWF/EPR qualification. AG05/AG06 consume family/concern interfaces; AG09 captures manifest dependencies.

The native agency slice builds on module concerns and the existing single-action executor. See [Architecture](../architecture.md#actor-agency-foundation) for delivered behavior and [Verification](../verification/actor-agency-and-inventions.md#actor-agency-runtime) for actual evidence. Partial items below are not a claim of complete AG acceptance.

PW01's [branch caller evidence](../verification/level1-decisions.md#pw01-reliability-repairs--october-2-2026) repairs first-action admission under AG03/AG04, exact selected-transfer dispatch and inspected learned-page refresh under AG06. It preserves independent speech, typed future outputs, actual outcomes and replay protection; learned execution also snapshots its recorded command for clone/checkpoint integrity. These repairs do not close the broader result-reference, context, live behavioral or integrated acceptance below.

**Early whole-character integration:** [CE01–CE05](character-experience.md) links these AG foundations with character content, bodily/psychological experience, attention, memory and social expression. The [product specification](../projects/compelling-characters-feature-spec.md) requires coherent independent life beyond survival, with actual satisfaction, reprioritization and stopping. Existing AG12/CR12 own evaluation; no completed implementation is reopened merely by this cross-link.

## Ownership and delivery order

AG owns the new decision envelope, operational goal/plan state, native continuation and actor-side integration. INV owns invention request policy, actor-method clarification/translation, definition admission, activation and mechanical family growth. EPR owns stimulus scope, perception-change identity and reaction intake; NC owns conversations, narration integration and expressive-impact behavior. CR owns the existing memory/attention/reflection substrate; CH owns an optional tool-using planning harness. A useful native plan does not depend on building CH01.

Start with **AG01–AG04**: prove optional composition and persistent native work without inventing any new mechanics. Add **AG05–AG07** for unlisted attempts, relevant context and meaningful reconsideration. Integrate **AG08** with the relevant INV-1/INV-7 capabilities to deliver actor-led invention. AG09–AG11 accompany every slice rather than being postponed until the end. AG12 is the separate live behavioral gate. The full NC12 narration acceptance program is not a prerequisite for a native goal record; retain the particular privacy, receipt and conversation dependencies that the slice actually uses.

Use the current single writer and existing stores first. No new platform dependency, public event broker, arbitrary generated code or always-running actor harness is authorized. Follow the [development save policy](../../AGENTS.md#development-save-policy).

### AG01 — Optional, bounded, multi-operation decisions

**Owner:** server cognition contracts/director; domain response admission; protocol projections where needed. **Depends on:** existing NC00 foundation and actor-reference contract. **Primary touchpoints:** `apps/server/src/cognition-contracts.ts`, `apps/server/src/response-context.ts`, `apps/server/src/ai-director.ts`, `packages/domain/src/response.ts`.

- [x] Define one logical operation-list contract and a provider-compatible encoding with zero or more operations, repeated kinds, stable response-local aliases and bounded admission dependencies. Preserve the distinction between local aliases and server-authorized entity/action handles.
- [x] Change prompt examples to include empty, single-kind and combined decisions. Keep every operation optional; do not require visible reasoning, a goal for every need, or a reflection rewrite before a small intention edit.
- [x] Make the action-context gate control expensive suggestions, not permission to submit an unlisted attempt or intention. Preserve existing route/attention budget behavior and the deliberate bounded urgent-response refresh.
- [x] Update parser, domain contract and diagnostics together; no runtime consumer assumes one `talk`, `act` and `think`.
- [x] Exercise the operation-list schema through the configured live immediate-response route and continue its admitted native plan without another inference. Narrow evidence is recorded in [Verification](../verification/actor-agency-and-inventions.md#live-agency-contracts); broader behavioral acceptance remains AG12-owned.
- [ ] Add automated provider-schema fixtures without external requests; preserve the separate response/reflection and malformed-reference boundaries.
- [x] Apply advertised aggregate operation/byte limits and per-field limits before mutation. Define explicit no-response, envelope rejection, full acceptance and partial acceptance outcomes.

**Exit evidence:** empty output leaves existing work and goals untouched; multiple thoughts and utterances are independently represented; a goal plus a queued action can coexist; duplicate aliases, forward/cyclic dependencies and malformed envelopes fail without effects. Closing action suggestions still permits a freeform attempt. No new mandatory Jev category-selection call appears.

### AG02 — One actor-owned operational intention store

**Owner:** domain agency/mind mutation; server context and creation adapters. **Depends on:** AG01 and current actor/memory ownership. **Touchpoints:** `packages/domain/src/types.ts`, `kernel.ts`, `mind.ts`, `experience.ts`, `god-tools.ts`, actor creation/seeding and all readers of `actor.goal`/`actor.goals`.

- [ ] Add the minimum serializable agency state and a centralized create/revise/pause/resume/complete/abandon mutation. Preserve author scope, stable identity, revisions, private provenance, bounded parent relationships and actor-declared versus engine-evidenced completion.
- [x] Establish a single operational source of truth. Inventory current goal writers and replace their meaning at the development-format cutover; any needed native/UI current-goal string becomes a read-only projection. Do not maintain two independently writable goal systems.
- [x] Seed creator-authored initial goals once. Actor revisions thereafter do not rewrite the original backstory, and another actor's speech cannot edit them directly. Player-owned goals use explicit player input unless controller policy authorizes otherwise.
- [x] Allow reflection to submit the same typed mutations, with relevant revision checks. Prose mentioning a goal remains prose; it cannot silently authorize execution. A small immediate goal edit does not require CH01 or level-5 reflection.
- [x] Implement finite goal quotas, terminal-history retention and transparent rejection/consolidation behavior without dropping active obligations, unresolved dependencies or replay receipts, or creating an unlimited hidden planner scratchpad.

**Exit evidence:** goals survive a same-version restart and can be revised independently; a paused plan does not erase its goal; a mistaken subjective completion does not grant an objective reward or fulfill a promise; old seed text is not reapplied on every load. Cross-actor references, inherited dictionary IDs and parent cycles are rejected.

### AG03 — Bounded plan frontier and one native physical lane

[Action records and learned activities](action-experience.md) implements richer receipts, contributing effects and finite nested method execution through this plan/output/continuation owner. Overlapping discovery matches do not replay shared steps. AE evidence covers its named slices; broader gaps below remain independently tracked.

- [x] Retain actual single-item/stack outputs from gather/prepare/craft/cook; resolve earlier-step references at native dispatch and preserve them through restart. The decision envelope supports equip/eat output consumers.
- [ ] Extend result references only when a concrete consumer needs quantities, multi-output selection, recipe outputs, cross-frontier references or model-selected cook targets. Freeform grounding can now bind move/follow/pickup/drop parameters alongside existing concrete commands, and typed requested activities bind an earlier gather/pickup output into a later eat/equip step. Interpreted generated sequences still have no general future-output reference contract. Qualify that contract before extending it.

- [x] Integrate explicit cancel/replace and interruption detection with native work, preserving actual spent materials, retained goals and completed receipts. General suspended-work resumption is delivered by the interruption requirement below.

**Owner:** domain native execution/agency state; server readiness adapter. **Depends on:** AG02. **Touchpoints:** `packages/domain/src/kernel.ts`, `types.ts`, native action outcomes, existing `WorldService` transition path.

- [x] Persist short plan frontiers with step identity, supported arguments, success dependencies, blocked/waiting dispositions and the actual last outcome. A one-off sequence may exist without a durable goal.
- [x] Bind the actor-selected foreground plan and ordered one-off queue; blocked work cannot silently switch goals through an implicit utility scorer. Add enqueue and explicit replace/cancel semantics around the existing single action slot. Do not implement a plan by calling `executeCommand` for several timed actions in one immediate response.
- [x] Dispatch only ready native work and revalidate at start. Bind an earlier step's output through trusted typed result references. Do not use a prewritten future item ID or treat queue admission as completion.
- [x] Advance known valid steps without another model call. On failure, block dependent work and create at most the eligible reconsideration opportunity; do not blindly attempt the remainder or regenerate the same plan.
- [x] Implement interruption during long-running work using trusted action-family pause/cancel boundaries, retaining consumed materials, committed effects and actual elapsed work. Revalidate suspended plans before resuming; do not imply every family supports pause/resume. Plan edits cannot rewrite completed receipts, refund resources or control another actor's response. Delivered by [composed activities](../projects/composed-activities.md): `interrupt` mode pauses one plan unless an attack is under way, a working step has consumed materials or the running action is outside the plan; the paused step restarts from scratch after the interrupting work, once goal, target encounters and bindings revalidate, and replace/cancel discard it. [Evidence](../verification/composed-activities.md#interrupt-then-resume).

PW10 is a concrete AG03 consumer: selected finite gather/pack/fuel work and a separate watch run without a goal or model call per native step. The watch refuses unrelated enqueue; explicit replace/interrupt retains existing rules. Native functional/review checks passed suspension with a new attempt, actual spending limits, interrupted attendance and retained transfers. Injected director choices reached the same owner without generation. Scripted ordinary card execution/recurrence/failure passed; actual voluntary choice and broader autonomy remain separate ([contract](../agent-agency.md#explicitly-chosen-one-session-activities), [evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026)).

**Exit evidence:** gathering → preparing → crafting executes in sequence with correct durations and one-time consumption; ordinary speech/thought does not cancel it; explicit replacement follows native cancellation rules. A failed first step blocks dependents. Two actors competing for a final resource cannot both receive it. Several native completions can occur after one model decision with zero continuation inference calls.

### AG04 — Atomic component admission and durable child identities

**Owner:** domain response mutation, server application/repository boundary. **Depends on:** AG01–AG03; existing durable jobs/command receipts. **Touchpoints:** `packages/domain/src/response.ts`, `apps/server/src/ai-director.ts`, `world-service.ts`, `store.ts` and the selected repository implementation.

- [x] Apply immediate authorized operations and persist accepted pending dispatches in one transition/transaction. Keep asynchronous interpretation and provider I/O outside the mutation transaction.
- [ ] Give every component, step and invention bridge stable child identity. Return original outcomes for duplicate bodies, conflict for identity reuse with different bodies, and a rejected/deferred disposition for retired or uncertain identities.
- [x] Enforce independent component rejection and admission dependencies. A later rejected action does not unsay an accepted utterance; a component requiring a rejected goal creation cannot bind to a nonexistent goal.
- [x] Replace broad staleness checks where necessary with relevant goal/plan/action revisions. Preserve current actor lifecycle, target scope, policy, cancellation and load-epoch checks. Unrelated world ticks must not invalidate a whole decision.
- [x] Close replay protection beyond the 300-entry hot response-receipt window through existing durable admission, not an assumption that old callbacks never arrive.

PW03/PW10 preserve AG04's existing admission owner: explicit activity parameters compile to a normal composition, while fresh stock/receipts commit atomically through the object owner. The actual injected director path passed strict parsing, opaque-reference resolution, native admission and decline/refusal/stale-access handling with unique metered parameter-round identities. This does not repair PW01's separate selected-transfer dispatch or complete every child-identity case ([PW03](parallel-batch-01-playable-week.md#pw03--craftable-containers-and-camp-supplies), [evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026)).

**Exit evidence:** storage failure commits no partial envelope; duplicate completion, late completion, partial component rejection and mixed-body retry have deterministic outcomes. Crash/recovery at admission-versus-dispatch boundaries does not double-spend materials or start a second paid operation. All-optional empty decisions finish cleanly.

### AG05 — Resolve unlisted attempts to existing mechanics

- [x] PX04 adds the installed exact destination invitation and immediate accept/decline/leave commands through current typed request and ordinary action surfaces; own finite movement remains the existing activity owner. This does not close general following or unlisted-proposal work.

- [x] Offer body-admitted one-shot approaches to visible entities, including cognitive animals, through native movement. Preserve separate target descriptions when approach destinations coincide.
- [ ] Extend locomotion with sustained target following when that behavior is taken on; keep it distinct from one-time destination movement and define target-loss/reacquisition behavior at the existing perception boundary.

- [x] Retain bounded private unlisted intents and reuse exact normalized request-bound native descriptions without another provider call.
- [x] Resolve up to four new proposals through the existing durable response job, using exact binding and Jev classification before bounded generative interpretation when needed. Native move/follow parameters and existing concrete sequences share admission. Preserve component identity, scoped references and stale-manifest rejection; uncertain revisions await the initiator. See [current runtime evidence](../verification/integration-summaries.md#action-capability-native-slice); live semantic quality remains unqualified.
- [x] Add explicit withdrawal/resolution of the four unresolved intent slots through the scoped interpreter and private native controls; do not silently evict unresolved work. The INV bridge remains AG08 work.

**Owner:** server action interpretation; domain command adapters. **Depends on:** AG01, AG03–AG04. **Touchpoints:** `apps/server/src/context.ts`, `decision-context.ts`, `cognition.ts`, response admission and existing action adapters. INV-7.1 owns the shared missing-capability classification contract.

- [ ] Replace unconditional dead-end handling of freeform proposals with a durable resolution request. Use exact supported bindings first; use bounded interpretation only when the wording cannot be grounded adequately without it.
- [x] Reuse existing commands or short native compositions before requesting a new definition. The freeform path must work when no useful action was shortlisted, without broadening the actor's evidence scope.
- [ ] Preserve target, recipient, instrument and intended result distinctions. A model may identify an attempt, but it cannot provide authoritative health/resource effects or change the structured target through prose.
- [ ] Connect unresolved capability cases to the INV-owned service; do not duplicate recipe generation, family classification or policy locks. Clearly distinguish physical impossibility, insufficient known information, currently blocked action, unsupported host capability and provider unavailability in internal outcomes.
- [ ] Add reason-specific duplicate suppression using relevant dependencies and policy versions. A depleted resource becoming available can invalidate its block; a paraphrase does not bypass an unchanged unsupported capability result.

**Exit evidence:** differently worded requests resolve to the same supported behavior; existing compositions do not create needless definitions. Unsupported attempts cause no fictional success. “I take the gold” cannot use expression admission to transfer inventory, and a guessed hidden target is rejected without leaking its location.

### AG06 — Goal/plan-aware context and derived interests

- [x] PX04 supplies exact own outing terms/progress and permitted companion visibility in ordinary decision/activity context, without the companion’s private work or hidden location. Current reply candidates share native prerequisites.

PG02’s [October 5 evidence](../verification/cognition-context.md#october-5--unified-experience-and-unprescribed-choices) qualifies exact recent outcomes through required memory selection, remaining paused work, source-linked correction/forgetting and shared personal grammar. Complete identity remains required. Current interests, needs and chosen intentions use one shared action rating policy in shortlisting and final selection; thresholds, interest compilation and native eligibility remain unchanged.

The [embodied-survival feature](../projects/embodied-survival-feature-spec.md) now supplies capability-rich possessions, reserved bound tools, relevant-possession fingerprints and explicit revision-bound inventory inspection. Oversized preparation falls back to a disclosed page plus bound tools. [Native measurements](../verification/embodied-survival.md#inventory-preparation) cover 1k/8k inventories. Actor-proposed interests beyond the existing selected-evidence/native-prerequisite compiler, full relevance/expiry qualification, pre-materialization paging and bounded weapon-by-target candidate preparation remain open; these are not established by a final 16-item context.

- [x] Derive material interests from known pending native steps even without a prior selected-object subscription; keep matching restricted to perceived candidates.

**Owner:** server context/recall integration. **Depends on:** AG02–AG03 and delivered CR03/CR04 substrate. **Touchpoints:** `apps/server/src/decision-context.ts`, `response-context.ts`, `interests.ts`, `recall.ts`.

- [x] Render compact operational goals, current frontier, relevant blocked reason and fresh results once, with the established actor-perspective language and reference rules. Do not duplicate all goal prose into several context sections.
- [ ] Compile bounded interests from chosen goals and known plan prerequisites, not only from objects already selected by attention. Invalidate affected subscriptions on meaningful goal/plan changes and reevaluate currently exposed candidates once.
- [ ] Preserve scope-before-relevance, required evidence, accepted About me, current conversation guarantees, obligations and total byte reservation. Optional planner context yields before privacy or required-context integrity does.
- [ ] Retain contradictory evidence and a measured optional opportunity-discovery allowance. No interest subscription can search another actor's private inventions or unseen world state.
- [ ] Extend existing context diagnostics to show why a goal/result changed retrieval. Do not create a second embedding store or a new general memory extractor.
- [ ] Include supported item capabilities, accessibility and equipment state in task-relevant inventory context; reserve explicitly referenced tools and known prerequisites. Admit actor-proposed goal interests through the existing subscription owner, without native hunger-to-food/tool/animal mappings. Relevant inventory changes must survive the final opportunity fingerprint; unrelated changes must not force cognition. Measure cold/warm preselection work and disclose omissions under [CG04](../limits/cognition.md#cg04).

PW03/PW10 add a narrow AG06 inspection consumer: one currently accessible selected ground container supplies permitted page evidence, pack/take choices and finite-method binding. Distant appearance does not disclose contents; incomplete/lost inspection grants no later authority. PostgreSQL decision preparation passed page-two-only opaque contents and access-loss removal, and injected director admission refused a cache locked during choice. Browser/live qualification remains separate. No camp goal, preferred target or hidden opportunity is installed ([evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026)).

**Exit evidence:** a newly adopted need for a known material can attend to a currently visible resource that was absent from the preceding selected-object list. Goal changes expire the old cue; unchanged goals do not rebuild every context. Relevant contrary evidence and danger survive focused planning; mandatory context overflow fails before paid dispatch.

### AG07 — Meaningful feedback, survival and bounded reconsideration

[CF01/CF04](parallel-batch-06-rivals-and-contested-ground.md) propose combat choices and voluntary help through this same feedback/plan owner, consuming PG02 rather than replacing it with an enemy or companion controller. No runtime or broader quality criterion closes through those definitions.

- [x] PX04 invitation, arrival, separation and termination produce private actual-outcome evidence through existing reconsideration; unchanged motion makes no paid request. Native refusal/replay/departure checks are recorded in [outing evidence](../verification/voluntary-outings.md).

PG02’s native/live episodes connect actual completion with ordinary reconsideration. Corrected-content Ada switched from cord work to hare observation; a repeated trial instead stocked further. Material hunger can explicitly abandon unfinished work without refunding costs; native interruption separately resumes remaining steps. An unchanged opportunity buys no request. [October 6 quiet reflection](../verification/cognition-context.md#october-6--quiet-reflection-completes-after-provider-recovery) completes verified publication and ordinary subsequent action with corrected content. No scheduler or automatic goal completion was added ([evidence](../verification/cognition-context.md#october-5--unified-experience-and-unprescribed-choices)).

**Implemented behavior reversal; integration qualification remains open:** [Embodied survival](../projects/embodied-survival-tech-design.md#remove-choices-retain-bodily-mechanics) removes this bundled world's automatic person-controller berry seeking/eating and associated food-specific protection. The completed adequacy-based fix below remains historical evidence; its automatic-feeding premise is superseded. Deterministic physiology and incapacity checks remain, while unavailable cognition may now leave an NPC unfed. Coordinate EPR04 rather than preserving feeding autopilot as an acceptance requirement.

- [x] Emit one private experience on frontier failure/interruption, suppress unchanged retries, and remove goal-only edits from the autonomous response fingerprint. Duplicate suppression and spending admission remain authoritative; autonomous actor/global cooldowns are removed.

**Owner:** existing server actor scheduler and native controller policy. **Depends on:** AG03–AG06; current awareness/perception boundary. **Touchpoints:** `apps/server/src/ai-director.ts`, `actor-work.ts`, `interests.ts`, domain cognition policy and native outcome emission.

- [ ] Connect private goal-review, native action-result and invention-result opportunities through the existing scheduler. Integrate the [EPR01/EPR05 scope and intake contract](events-perception-and-reactions.md); no parallel opportunity schema or universal event bus. AG01–AG04 can use existing receipts before full EPR delivery; AG07 qualifies the shared intake integration. The September 28 intake seam: producers call `ActorWork.wake(actorId, { reason: 'result', urgency })`. The ticket coalesces the cause, keeps its queue age and is inspected under the shared fair ordering. Evidence still travels as private events or awareness, and the thought cursor consumes it only when a decision completes. Action and invention results keep their current path until wired.
- [x] Distinguish unresolved/deferred opportunities from completed consideration. Replace native-urgency cursor advancement that would incorrectly consume needed semantic evidence without a later path to reconsider it.
- [x] Remove the categorical low-fullness semantic dead end for capable actors. The earlier native-food adequacy gate is superseded by removing food autopilot; actual incapacity/sleep/cognition checks and bounded spending remain.
- [ ] Suppress self-thought/self-goal immediate wake loops, repeated unchanged failures and recursive result-to-result churn. Preserve episode identity, coalescing, spending admission and hysteresis under the existing D54 policy ownership.
- [ ] Keep simulation deadlines separate from wall-time provider deadlines/spend. Measure fairness under the current single global workflow before adding bounded concurrency; maintain one authoritative writer.
- [ ] Remove food-autopilot suppression/late invalidation and obsolete reactive thresholds; admit initial hungry bodies, worsening private conditions and relevant action results through the existing intake. Preserve new evidence during in-flight work and same-version episode/deadline continuity. Demonstrate no-credentials physiology without fabricating a cognitive response or restoring automatic feeding.

**Exit evidence:** a conscious hungry actor gets an eligible bounded planning/help opportunity rather than permanent suppression. A meaningful hunger opportunity remains eligible during long work, allowing foreground goal/plan revision and explicit interruption while preserving the longer-term intention. An already chosen executable food plan can continue without compulsory thought; merely acquiring food must not create an unchosen eat action. Repeated hunger samples, self-authored thoughts and unchanged invention failures do not create paid storms. Deferred urgent evidence remains available; restarts do not fabricate new encounters.

### AG08 — Actor-side invention continuation and choice

**Owner:** agency context/scheduler integration; shared invention implementation remains INV-1/INV-7. **Depends on:** AG02–AG07 plus the relevant INV request, policy, actor-method dialogue, admission and scoped-result work. **Touchpoints:** director request origin, decision context, goal/plan references, invention result delivery.

- [x] Let an actor decision initiate the shared request with actor origin, private purpose and its own complete method; the request links to the originating decision without granting creator permissions.
- [x] Deliver private validation feedback to fresh actor decisions, which may submit a revised method or stop. Freeform investigative dialogue remains under INV-7.
- [x] Allow normal bounded reconsideration after admission without forcing a goal, construction, extra post-invention call or material consumption.
- [x] Retain admitted knowledge without reviving abandoned plans; keep private request purpose outside recipe provenance and instruct actors to author construction-only descriptions.
- [x] Deliver discovery and validation through private experience/events and the existing knowledge owner; ordinary player job projection excludes NPC inventions.

**Exit evidence:** the actor supplies the conceptual design rather than receiving a hidden completed recipe. A suggested substantive substitution requires actor acceptance. Invention grants no item or proficiency. A nearby uninformed actor learns nothing from private validation. The inventor can adopt, continue, postpone or abandon construction after the result, with no duplicated job or automatic goal creation.

### AG09 — Same-version save, pause, recovery and revocation

**Owner:** agency domain state and existing save/application owners. **Depends on:** each stateful slice as it lands; coordinated with save/load tracker. **Touchpoints:** `WorldService`, `GameSaves`, saved world validation, durable jobs and receipt repositories.

- [ ] Include goals, frontiers, active native work and actor-visible invention state in same-version integrity. Apply the [development save policy](../../AGENTS.md#development-save-policy).
- [x] Rebuild only derived readiness/interests after restart. Preserve actual resources, completed steps and mutable goal revisions rather than asking a model to reconstruct them.
- [ ] Fence provider and native-dispatch callbacks by the current world/load epoch. Retain non-rewindable billing, revocation and uncertainty records under existing policy.
- [ ] Treat saved queued/running paid work as recovery/reconciliation state, not authorization to dispatch again. Preserve explicit versus autonomous pause/cancellation behavior and fresh checks on resumption.

PW03/PW10 contribute current-format PostgreSQL inspection/restart, native family restore and watch restart evidence to AG09. Final watch and crafted-family service-restart checks passed exact pins, inspection/contents and deadline/counters without provider dispatch on load. Broader callback fencing and paid recovery remain open ([evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026)).

**Exit evidence:** same-version restart resumes native readiness once; loading an earlier save rejects callbacks from the discarded timeline. External charges are not rewound. A canceled or revoked invention cannot activate because the lock later reopened. No provider call occurs merely from loading or rebuilding indexes.

### AG10 — Player, actor and god projections

- [x] Strip other actors’ agency/initial-goal seeds from observations and exclude agency from ordinary client views; god goal editing reads the same operational owner. Broader invention projections remain below.

**Owner:** current public protocol/view layer and existing cognition inspector; coordinate NC UI/history owners. **Depends on:** the corresponding AG01–AG09 slice. **Touchpoints:** `packages/protocol`, server `view.ts` and Intelligence trace helpers, existing client actor/world-agent views.

- [ ] Render admitted/queued/started/completed/blocked outcomes without equating a plan with a completed deed. Preserve message-local failure behavior and existing conversation identity/audience rules.
- [ ] Give authorized inspection a compact goal/plan/result view linked to existing trace IDs. Diagnostics do not purchase inference or expose hidden provider reasoning as definitive actor psychology.
- [ ] Ensure ordinary clients/other actors do not receive private goals, unspoken inventions, drafts or mental notes. God inspection is an explicit capability, not a broader actor observation.
- [ ] Keep embodiment/capability restrictions on speech and expressions. General non-speech audio is integrated with NC/perception event ownership, not implemented by creating fake speech messages.

PW03/PW10's AG10 consumer keeps ordinary review/Stop/plain own-request results separate from God-only detail and private NPC learning evidence. No-provider review/director fixtures retained selected parameters and honest terminal counters, without substituting completed narration. Scripted ordinary projection and read-only review passed; actual voluntary choice/retention/reuse remain unqualified; installing a request schema does not establish those behaviors ([PW10](parallel-batch-01-playable-week.md#pw10--chosen-camp-activities-and-reusable-finite-methods)).

**Exit evidence:** player versus god projections differ correctly; a clap is not a conversation turn; accepted queue entries have no fake completion narration. Refresh/reconnect does not replay an invention. Private goal changes do not appear in nearby actors' prompts or public event feeds.

### AG11 — Integrated deterministic and adversarial acceptance

**Owner:** relevant domain/server tests plus maintainer verification. **Depends on:** each feature under test. All fixtures inject controlled model outputs and make **zero external requests**. Existing tests such as `packages/domain/src/boundaries.test.ts` supply reusable authority-boundary patterns, not evidence that these new scenarios already pass.

- [ ] Implement the matrix below with reproducible starting states, explicit receipt assertions and resource/time checks. Include the failure paths, not only an ideal transcript.
- [ ] Run focused checks during implementation; after runtime changes run the repository's formatting and `pnpm run check` workflow while preserving unrelated edits. Report existing unrelated failures separately.
- [x] Publish actual fixture evidence in `docs/verification.md`, current facts in `docs/architecture.md`/implementation status and checkbox changes only after each stated gate is met.

The [October 2 Engineer 3 report](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026) contributes current family/watch native checks, final PostgreSQL restarts, scoped-page/access cases and six actual injected-director scenarios to AG11, alongside the historical baseline. Scripted ordinary card/craft/custody checks passed; uncoached player observation, shared TypeScript/picker blockers, actual Jev voluntary choices and combined PW06 remain separately tracked. AG12/AG13 and the full deterministic/adversarial matrix below are not closed; settled/reserved/outstanding/uncertain Engineer 3 Jev exposure remains $0.

| Scenario                              | Required observation                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No response during valid work         | No new thought, goal, event or cancellation; native work progresses                                                                                           |
| Hunger during long-running work       | Supported long work can be interrupted for food; the prior goal survives, progress/resources obey native rules, and resumption revalidates current conditions |
| Combined decision                     | Several optional components admitted with distinct outcomes; no forced category                                                                               |
| Same known action, different wording  | Equivalent native effect without a new definition                                                                                                             |
| Bow discovery and production          | Private actor-authored method, admitted recipe, separate gathering/preparation/crafting, actual ammunition/use prerequisites                                  |
| Invention without construction        | Knowledge may persist; no item, material consumption or forced goal                                                                                           |
| Inadequate or unknown method          | Neutral scoped clarification or honest limitation; no concealed engine-supplied conceptual solution                                                           |
| An easier food source appears         | An eligible opportunity to reassess; old plan not forced or silently erased                                                                                   |
| Unreachable prey or missing material  | Dependent work blocks without fabricated success; unchanged failure does not loop                                                                             |
| A social/epistemic goal               | Persists without a fake objective success predicate or control over another actor                                                                             |
| Nonhuman actor                        | Granted cognition works within its embodiment; no automatic speech or human hand capability                                                                   |
| Goal abandoned during invention       | Result does not restart the canceled plan or spend crafting inputs                                                                                            |
| Two actors, one final resource        | Single authoritative consumption; loser gets grounded feedback                                                                                                |
| Private invention near another actor  | No recipe/method/goal leakage through events, metadata, diagnostics or retrieval                                                                              |
| Duplicate/late/conflicting completion | Exactly one effect; conflicts and retired identities cannot be re-admitted                                                                                    |
| Restart/restore/pause/zero budget     | Correct scoped recovery, no new paid dispatch, native fallback preserves actual state                                                                         |
| Injection and malformed references    | Untrusted speech/goal text, prototype IDs, alias cycles and forged result refs cannot acquire authority                                                       |
| Crowded scene and long history        | Bounded candidates and diagnostics; relevant protected evidence and fair admission survive                                                                    |

### AG12 — Behavioral value and cost, separately authorized

PX04 adds [bounded outing comparisons](../verification/voluntary-outings.md): freely selected invitations, actual independent travel and separate arrival decisions, with failures and complete cost retained. This narrows the social-episode evidence only; matched broad evaluation, repeatability, whole-life quality and unattended-community scope below remain open.

PG02’s [October 5 evidence](../verification/cognition-context.md#october-5--unified-experience-and-unprescribed-choices) distinguishes live choices/effects, native supplied controls, confounded setups and provider failure. Independent observation is re-demonstrated without conditional biography; contrary stockpiling, failed prompt variants and actual costs remain. Reliable endings, freely chosen suspended-work resumption and whole-life quality remain open. [October 6 publication](../verification/cognition-context.md#october-6--quiet-reflection-completes-after-provider-recovery) now passes, while unchanged personal files and empty knowledge/goal changes leave lasting content-specific influence unqualified.

**Owner:** cognition/INV research evaluation and verification. **Depends on:** AG11 for tested boundaries, relevant CR12/CH03/INV live gates. Fixture success is not evidence that the chosen model spontaneously produces useful behavior.

For the integrated resident, run the applicable [complete character flows](../projects/compelling-characters-feature-spec.md#complete-behavioral-flows) through [CE05](character-experience.md#ce05--integrated-character-quality-and-complete-cost-qualification). The ordinary-afternoon and delayed-continuity cases connect body experience, company/belonging, enjoyment, independent pursuits and meaningful stopping. Retain the same evidence and full-cost accounting here; a separate test program or a successful survival chain alone cannot close that target.

- [ ] Compare matched initial scenarios and opportunities across: current menu/single-step baseline; freeform proposal without persistent plans; persistent intentions/native continuation; and optional bounded investigation where relevant. Keep model/configuration and total spending allowances explicit.
- [ ] Evaluate held-out variations and multiple independent runs: different names/material descriptions, alternative food sources, changed timing, unavailable targets, invention locks, no-response opportunities, and conflicting priorities. A single successful scripted bow demonstration is insufficient.
- [ ] Separate contract validity from behavior. Measure objective task progress where native evidence exists, false success claims, useful adaptation, private disclosure, avoidable interruption, repeated blocked attempts, goal churn and appropriate abstention. For subjective goals use labeled scenario judgments, not invented ground truth.
- [ ] Report total known and uncertain cost, including attention, routing, embeddings, generation, tools and reflection. Measure latency per stage, time to useful action, native steps per semantic decision, model calls per actor/simulated day and cost per real hour at each tested simulation speed.
- [ ] Test prompt-only optionality before an extra category gate. If a later Jev gate is evaluated, measure both prevented unnecessary calls and suppressed useful actions under matched budgets. Do not declare savings by excluding the gate's own spend.
- [ ] Keep quantitative release thresholds unset until a baseline and required experience are recorded; reserve explicit privacy/resource/replay invariants as hard gates. Publish uncertainty, sample size and failed runs. A more articulate plan is not necessarily better gameplay.

**Live execution gate:** separately confirm configured credentials, current provider compatibility, explicit nonzero cap and intended scenario set. This tracker authorizes no calls by itself. No automatic paid repair/retry loop is permitted. Retain the existing narrowly bounded semantic-supersession policy only under its distinct accounting and identity rules.

### AG13 — Embodied survival demonstration

The minimization follow-up uses world-owned hunting labels/method configuration and equipment-derived melee, ranged and unarmed options. Exact native bindings, ammunition requirements and actor-permitted targets remain authoritative. The earlier verbose numeric prose, repeated food-preparation explanation and explicit hunting biography are removed. The owner subsequently approved short tool descriptions, compact capability figures and visible animal health for comparison; those changes have native checks and [live preference/retry and complete-meal evidence](../verification/embodied-survival.md#complete-jev-only-meals). The prior [minimal-context comparisons](../verification/embodied-survival.md#minimal-context-and-equipment-derived-hunting) establish a working small combination, not global minimality or reliability.

**Status:** mechanics implemented and **Jev-only hunting/retry and complete meals demonstrated**; broader qualification remains incomplete. Live Jev selected knife hunts and miss-aware retries in lean worlds, eating carried food and gathering available berries in comparisons. The owner explicitly keeps the whole scenario Jev-only: no generative goal formation, seeded hunt or forced action. [Actual evidence and gaps](../verification/embodied-survival.md). [Feature specification](../projects/embodied-survival-feature-spec.md) · [Technical plan](../projects/embodied-survival-tech-design.md#delivery-and-verification).

**Depends on:** scoped EPR04/EPR05 and AG06/AG07 work, AC09.6 equipped melee, and BW18 starter content. Those owners retain their individual task bodies; this item owns their integrated behavioral acceptance. Existing AG12 owns broader quality/cost evaluation.

- [x] After implementation approval, reconcile the selected proposal into persistent agency/survival/combat/targeted-action contracts with unimplemented status preserved until each slice ships.
- [x] Trace an initial private bodily opportunity through actual decision context, optional self-authored goal, chosen equipped strike, native approach and real hit/miss outcome. No seeded operational goal, fallback survival slogan, actor-directed hunting prompt or fabricated provider choice.
- [ ] Qualify goal/plan continuity, repeat chosen strikes and meaningful failure feedback without a thought per footstep or automatic retry loop. Show the engine does not complete a broad survival goal merely because an animal dies. Empty-goal plan continuity and repeated real Jev strikes are now demonstrated; an active broad-goal continuity comparison remains unqualified.
- [x] Compare weapon choice and post-miss timing with actual Jev inputs/outcomes. Descriptions alone tied knife/fists; compact stats plus visible health gave a small knife lead in one matched snapshot, but later runs still sometimes chose fists. Spear/bow choices and complete meals were executed, with misses and a deer deferral retained. [Evidence](../verification/embodied-survival.md#complete-jev-only-meals) records scores, game times, calls and unsuccessful simplifications. Stable optimal preference and bounded retry latency remain unproved; D54/AG12 retain broader cadence/quality work.
- [x] Demonstrate the expanded hunt → harvest → cook → eat chain with empty goals, actual native outcomes and Jev only. Harvest options now expose actual definition-derived products. Hare/deer and knife/spear/bow trials complete; carried food is eaten directly and missing heat removes cooking. Shortened context still reached a meal but incurred starvation damage. This is representative scenario evidence, not a guarantee of unattended survival or a reusable learned method.
- [x] Separate mechanical fixture evidence from separately authorized live behavior. Record all agreed lean-camp trials and food-present/no-weapon/no-reachable-prey comparisons, actual latency/spend and incomplete outcomes. Another sensible survival choice is not proof of hunting; one favorable trace does not prove reliability.
- [ ] Verify charge/shutdown and alternate melee-profile fixtures reuse the same engine contracts without hunger, knife, Ada or deer identifiers. Measure relevant scheduling/context work under the technical plan; leave unrelated scale qualifications open.

**Delivered subsets:** private initial/worsening/review evidence; no native feeding; exact equip/strike plan execution; own hit/miss awareness; terminal plan feedback listing completed/blocked actions and their actual outcomes; charge/shutdown and alternate-club fixtures; PostgreSQL episode/cursor/recovery continuity. **Additional evidence:** real Jev-selected equip/approach/strike, miss recall followed by chosen retries, hare death, deer hits and the unchanged food/no-weapon/no-prey comparisons. Natural 40/30/20/10/zero crossings reached private events and cognition admission in a no-cost route fixture. **Remaining:** browser interaction/visuals, relevant-versus-unrelated acquisition and in-flight/restore scheduling races, and multi-actor preparation/fairness qualification. A complete deer meal is now demonstrated. Reliable unattended survival, stable optimal weapon selection and short retry delays remain unproved; the limited trials do not close population qualification.

**Exit:** the agreed autonomous approach/attack demonstration and meaningful comparisons have actual evidence, and mechanical/private-state/save/load checks pass. The owner has expanded acceptance to the [complete Jev-only meal flow](../projects/embodied-survival-tech-design.md#complete-jev-only-meal-follow-up); harvest/cook/eat autonomy and controlled simplification now require real integrated evidence. Learned activity implementation remains excluded. This item is not closed by writing the design or by removing autopilot alone.

## Recording completion

Each delivered item records the changed interfaces, same-version state implications, actual deterministic evidence, separately authorized live evidence where relevant, and remaining limits. Store current status/evidence in their designated owners; do not append a dated implementation diary here. Documentation integration cannot check any AG item, retroactively complete CR/NC/INV work, or claim that generated methods have been tested in the live game.

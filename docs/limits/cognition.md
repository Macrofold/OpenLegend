# Cognition and action selection: limits and constraints

[Feature contract](../agent-agency.md) · [Implementation work](../maintainers/cognition-redesign.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [decision-context.ts](../../apps/server/src/decision-context.ts), [recall.ts](../../apps/server/src/recall.ts), [cognition-contracts.ts](../../apps/server/src/cognition-contracts.ts).

The October 15 source recheck distinguishes current immediate callers, retained unused cognition helpers and superseded entries below. Current source ownership includes [agency](../../packages/domain/src/agency.ts), [response admission](../../packages/domain/src/response.ts), [native observation](../../packages/domain/src/kernel.ts), [routing](../../apps/server/src/ai-director.ts), [interests](../../apps/server/src/interests.ts), and [diagnostic presentation](../../apps/server/src/cognition-inspection.ts). Rechecking these contracts adds no runtime, live-model or capacity evidence; the original tuning recommendations remain proposals.

## LA001

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 16 nearby characters or animals; optional relevance checks may add more.

**Reason / tradeoff:** Expand the guaranteed nearby-being information when the model request has room, while keeping the situation's most important beings first.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA002

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 16 nearby objects; optional relevance checks may add more.

**Reason / tradeoff:** Expand the guaranteed nearby-object information when the model request has room, prioritizing objects needed for the current situation.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA003

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 16 owned items; optional relevance checks may add more.

**Reason / tradeoff:** Allow more owned items into the guaranteed information, especially items needed to understand the character's available actions.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA004

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 16 knowledge entries; optional relevance checks may add more.

**Reason / tradeoff:** Allow more relevant knowledge entries when the model request has room, without sending every stored note on every decision.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA005

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 8 memories; optional relevance checks may add more.

**Reason / tradeoff:** Expand the guaranteed memory selection when useful, while always including the evidence needed to understand the triggering event.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA006

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

Optional searches select at most 300 candidates from each information category, such as memories, before further relevance filtering.

**Reason / tradeoff:** Keep 300 as the initial search-result allowance until missed relevant information demonstrates a need to expand it.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Review**.

## LA032

**Historical caller; retained unused helper rechecked October 15, 2026 · Restrictiveness: Very safe.**

The retained `cognitionContext` helper requests up to 300 experiences for full reasoning and 30 for lighter reasoning, with 400,000/12,000-byte recall budgets respectively. The source recheck finds no current runtime caller of that helper; immediate decisions and independent reflection use their separate current preparation owners. These values do not describe every live cognition route.

**Reason / tradeoff:** Choose relevant experiences according to available model input space rather than assuming a fixed record count matches reasoning difficulty.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA033

**Historical caller; retained unused helper rechecked October 15, 2026 · Restrictiveness: Safe.**

The retained, currently uncalled `cognitionContext` helper checks its serialized context against both 80,000 JavaScript string units and 400,000 UTF-8 bytes, reducing optional recall while preserving required commitments. These are not the current immediate-decision envelope in LA034/CG08. The source remains present; no runtime cleanup is claimed.

**Reason / tradeoff:** Reconcile the two measurements with the chosen provider's request limit and state exactly which check rejected an oversized request.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Review**.

## LA034

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

The current immediate-decision workflow limits assembled model input to 100,000 bytes.

**Reason / tradeoff:** Keep a finite input allowance, but size it for the selected model and include instructions and response-format overhead consistently.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA035

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

During initial decision preparation, the server reserves up to 50,000 bytes of its shared input allowance for the largest candidate action descriptions. This protects room while optional recall is selected; it is not an independent 50,000-byte cap on the eventual action section. Later action preparation fits offered descriptions within the remaining complete 100,000-byte context allowance.

**Reason / tradeoff:** Let relevant action descriptions use available space after required facts are included, rather than rigidly limiting actions to half the allowance.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Expand**.

## LA036

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

The action-selection workflow searches the full eligible action library but returns at most 300 options for further judgment.

**Reason / tradeoff:** Keep the requested 300-option default and report incomplete coverage; improve relevance ordering when meaning-based search is unavailable.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA037

**Removed — absence source rechecked October 15, 2026 · Restrictiveness: — (removed).**

**Former limit, now removed:** When a computer-controlled character builds a multi-step plan, the model receives only the first 16 possible gathering, material-preparation and crafting steps after sorting by internal identifier.

**Reason / tradeoff:** Removed the sixteen-option planning cutoff. Planning options now fit the existing complete model-input allowance; diagnostics count size omissions and only included options receive plan bindings.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Completed removals**.

## LA038

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

A spontaneous cognition request describes at most the 8 newest significant experiences that could have caused the character to think.

**Reason / tradeoff:** Select the events needed to explain the current situation rather than cutting the trigger description at eight regardless of meaning.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Replace**.

## LA039

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

An experience normally qualifies to trigger spontaneous thinking when its importance is at least 6, or its event type is explicitly configured as significant.

**Reason / tradeoff:** Review whether this importance cutoff misses meaningful situations before changing how often characters think.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA040

**Removed — PW07 review verified, October 2 · Restrictiveness: — (removed).**

**Former limit, now removed:** A world's cognition policy can name at most 16 kinds of events that should count as significant, such as death or being taught something.

**Reason / tradeoff:** Removed the sixteen-event-type count ceiling. The creator submission schema and guide now match native validation: a 17-name typed submission and native admission pass, while an invalid name refuses. Cognition policy shape, event-name format, revision, permission and total request-byte checks remain. [Review evidence](../verification/parallel-batch-01-playable-week-engineer-2.md#independent-implementation-review).

[Native owner](../../packages/domain/src/cognition-policy.ts) · [Submission schema](../../apps/server/src/world-authoring-schemas.ts).

Original recommendation: **Completed removals**.

## LA041

**Removed — absence source rechecked October 15, 2026 · Restrictiveness: — (removed).**

**Former limit, now removed:** A computer-controlled character's action menu includes options to join only the first 4 eligible nearby conversations.

**Reason / tradeoff:** Removed the four-conversation action cutoff. All eligible nearby conversations can supply join actions to normal action selection.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Completed removals**.

## LA042

**Current — source rechecked October 15, 2026 · Restrictiveness: Medium.**

The system accepts a proposed reasoning level only when Jev assigns the winning choice a probability of at least 0.5.

**Reason / tradeoff:** Evaluate whether this routing threshold chooses suitable reasoning effort; it is a model-decision policy rather than a storage limit.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA043

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

The system skips further action selection when Jev assigns at least 0.8 probability to the answer that no action is needed.

**Reason / tradeoff:** Check whether this threshold suppresses useful actions before changing it; retaining a probability threshold can avoid unnecessary model work.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA044

**Current — source rechecked October 15, 2026 · Restrictiveness: Medium.**

Optional information passes Jev's relevance filter when its yes probability is at least 0.5.

**Reason / tradeoff:** Measure whether useful evidence is being rejected rather than treating the midpoint as proven correct for every information category.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA045

**Current — source rechecked October 15, 2026 · Restrictiveness: Medium.**

Some intent and invention classification results require model confidence of at least 0.55 to avoid a clarification or refusal path.

**Reason / tradeoff:** Calibrate this confidence requirement against clear requests that were incorrectly rejected or sent for clarification.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA058

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

Immediate reasoning levels 2, 3 and 4 allow 1,024, 4,096 and 8,192 output tokens respectively.

**Reason / tradeoff:** Check whether each task has enough output room, especially when reasoning tokens consume the allowance before a usable answer appears.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Review**.

## LA059

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

An immediate response that may include an invention gets an output allowance of at least 1,800 tokens.

**Reason / tradeoff:** Retain enough room for both the proposed invention and ordinary speech or action, within the authorized spending budget.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Review**.

## LA060

**Removed at original audit; source rechecked October 15, 2026 · Restrictiveness: — (removed).**

**Former limit, now removed:** The original reasoning-level table declared unused input/display sizes and a level-5 entry. Those declarations remain absent from the current contracts.

**Reason / tradeoff:** Removed the original unused input/display-size declarations and level-5 entry. The later independently enforced per-level table in [CG08](#cg08) is a separate delivered contract, including its reflection owner; this historical removal does not mean current per-level admission is unenforced.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Completed removals**.

## LA061

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

One generated character response can contain at most 16 proposed operations, such as speech, actions, thoughts or note edits, and at most 40,000 bytes.

**Reason / tradeoff:** Allow larger responses when useful, while limiting total size and validating each proposed game change before applying it.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA062

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

A proposed response operation can depend on at most 16 other operations, and a generated plan contains at most 8 steps referenced by indexes 0–7.

**Reason / tradeoff:** Expand plan and dependency counts together while preserving the rule that a dependent operation cannot run before its prerequisites succeed.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA063

**Current — source rechecked October 15, 2026 · Restrictiveness: Medium.**

One speech operation generated by a character's model is limited to 1,200 characters.

**Reason / tradeoff:** Keep dialogue concise by policy, but ensure the model, response validator and native speech operation agree on the allowed length.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Review**.

## LA064

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

A generated action description or goal objective is limited to 500 characters.

**Reason / tradeoff:** Allow enough prose to preserve target, method and intent, with the same length rules in the model format and game validator.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA065

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

One immediate private thought is limited to 240 characters and may name at most 8 associated characters, animals or objects by identifier.

**Reason / tradeoff:** Expand the thought and reference allowances when needed to express a complete thought without losing who or what it concerns.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA066

**Current — source rechecked October 15, 2026 · Restrictiveness: Medium.**

The game keeps only the latest 300 accepted character-response identifiers in its local duplicate-response prevention record.

**Reason / tradeoff:** Use durable saved response jobs to preserve duplicate-effect protection before changing this retention count.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Replace**.

## LA067

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

Identifiers have different maximum lengths across the API: requests 100, beings/actions 120, goals/records 180 and operation-dependency labels 24 characters.

**Reason / tradeoff:** Unify identifier lengths where the same identifier crosses multiple interfaces, preventing later rejection of an otherwise valid record.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Keep**.

## LA068

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

A character can have at most 8 unfinished goals tracked by the action-planning system.

**Reason / tradeoff:** Allow more stored goals while selecting only the relevant goals for each model request and executing a bounded amount of work.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA069

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

A character's goal structure permits 24 goals in total, sized from eight unfinished goals plus a sixteen-entry history allowance. There is no separately enforced sixteen-finished-goal cutoff: at total capacity, creating a goal removes one terminal goal only if no retained plan or child still references it; otherwise creation refuses.

**Reason / tradeoff:** Store older goal history separately and retrieve it when useful instead of making the active-goal structure the only history store.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA070

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

A character's current plan contains at most 8 steps, and only one plan step may be running at a time.

**Reason / tradeoff:** Allow longer saved plans if useful, while preserving ordered execution and rechecking each step when it starts.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA071

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

A character's planning structure retains only the latest 32 plan-history entries.

**Reason / tradeoff:** Allow older plan history to remain searchable without sending the complete history to every decision-making call.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA072

**Current — native-action integration source review, 2026-09-26 · Restrictiveness: Very safe.**

An actor retains at most four unresolved/revised action intentions. One response grounds at most four proposals sequentially, each into at most eight native commands. Full pending storage refuses new paid interpretation; exact free forms, recognized typed forms and explicit retry of an existing slot remain possible. Free typed refusals are returned to the initiator but not retained, so only paid-interpretation failures and held revisions occupy slots. This is a storage/admission bound, not four provider calls: generated candidates can require classification, generation and fulfillment review.

**Reason / tradeoff:** Bound pending negotiation and per-response inference. Larger retained intent sets remain a candidate for expansion under [AC03](../maintainers/action-capabilities.md#ac03--bounded-action-grounding); no increase is approved here. [Grounding](../../apps/server/src/action-grounding.ts), [agency](../../packages/domain/src/agency.ts).

## LA073

**Current — native-action integration source review, 2026-09-26 · Restrictiveness: Very safe.**

Input/stored intention text is 1–500 characters. Fulfillment descriptions/reasons permit 1,000; supported and omitted lists each permit eight entries with 500-character clauses/reasons. Oversize input/output is refused rather than silently rewritten. These replace the historical claim of a 1,000-character stored intention.

**Reason / tradeoff:** Keep negotiation payloads bounded while disclosing material differences. Exact optimal values are unqualified. [Validator](../../packages/domain/src/action-capabilities.ts), [grounding](../../apps/server/src/action-grounding.ts).

## LA074

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

A character can retain at most 16 unresolved commitments tracked by game rules, such as promises.

**Reason / tradeoff:** Allow more remembered promises while retrieving the ones relevant now; do not make promise capacity depend on a tiny fixed count.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA075

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

A character's editable knowledge notes allow 5,000 Unicode characters for general knowledge and 1,000 per subject-specific note.

**Reason / tradeoff:** Expand notes when meaningful knowledge cannot fit, while keeping a clear total storage and model-input policy.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Expand**.

## LA076

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

A name learned for another being, including a spoken self-introduction, may contain at most 120 Unicode characters.

**Reason / tradeoff:** Keep a reasonable name-length policy and avoid treating longer names as a performance problem without evidence.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Review**.

## LA077

**Removed — absence source rechecked October 15, 2026 · Restrictiveness: — (removed).**

**Former limit, now removed:** The saved description of what should attract a character's attention keeps at most 16 item properties, 8 kinds of beings/objects and 24 item definitions.

**Reason / tradeoff:** Removed the 16-property, 8-kind and 24-definition/prerequisite truncation from saved attention interests. Interests still come from the character’s permitted knowledge and selected evidence.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Completed removals**.

## LA078

**Removed — absence source rechecked October 15, 2026 · Restrictiveness: — (removed).**

**Former limit, now removed:** The character-attention system returns only the first 32 visible beings or objects matching the character's saved interests.

**Reason / tradeoff:** Removed the thirty-two-match cutoff. Interest matching now returns all matching visible beings and objects.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Completed removals**.

## LA079

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

A saved description of a character's attention interests expires after 7,200 game seconds.

**Reason / tradeoff:** Review whether two game hours is an appropriate refresh period when goals and private knowledge have not changed.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Review**.

## LA091

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

An urgent newly perceived event can cause at most one replacement attempt for an already-running response.

**Reason / tradeoff:** Keep protection against repeatedly cancelling and repurchasing responses, while exposing when the replacement allowance is exhausted.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Keep**.

## LA102

**Current — source rechecked October 15, 2026 · Restrictiveness: Very safe.**

The generic character-observation function returns only the latest 24 perceived events in its recent-event field.

**October 17 selected consumer:** [CTR05/CTR08](../maintainers/combat-and-threat-responses.md) require the actual attack, work-result and materially changed terms as actor-permitted decision evidence. This convenience prefix cannot silently substitute for the complete required source set; use the existing scoped owner and defer incomplete preparation truthfully. The current prefix above is not changed by this design record.

**Reason / tradeoff:** Allow callers to retrieve additional relevant perceived events instead of making twenty-four the only available observation window.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA231

**Current — source rechecked October 15, 2026 · Restrictiveness: Safe.**

The scheduler admits at most **two immediate pipelines per world**, **one per
actor** and **one ordinary pipeline**. Two urgent actors can occupy both positions.
Urgent execution shares the existing background provider lease, preserving two
total executions across immediate decisions, higher reasoning and maintenance.
Deferral records timing while the running job retains its admission position;
completion or handoff releases only its own position. Uncertain execution retains
its actual financial lease class across restart. Controlled native coverage
includes ordinary plus urgent, two urgent, no third slot and exact cancellation;
complete live fairness and latency qualification remain open under
[CTR08/CTR10](../maintainers/combat-and-threat-responses.md).

**Reason / tradeoff:** One long ordinary deliberation no longer owns both immediate
positions. Shared funding and provider capacity still limit dispatch, and each
actor/job retains its own evidence, reservations and cancellation.
[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## LA232

**Current — bounded urgent-context refresh · Restrictiveness: Safe.**

A running character response is eligible for one context refresh only when newly perceived evidence reaches **both importance 8 and urgency 8**. These are current server constants, not installed configurable world fields. The original attempt watermark is retained so the refresh includes all qualifying intervening evidence; cancellation, shutdown and the one-refresh bound still apply.

**October 17 selected consumer:** CTR08 preserves this bounded changed-situation policy while adding the [exact threat/result/condition producers](../projects/combat-and-threat-responses-tech-design.md#exact-meaningful-triggers). The one refresh covers the whole job, including its initial two-stage attempt and its single refreshed attempt. Newer causes remain pending beyond the captured evidence cut; additional blows alone cannot repeatedly cancel a still-valid choice after that refresh. An appraisal receipt from this same pipeline is already consumed by its second stage and cannot purchase another two-call decision. An independent later physical result or newly supported cause can support normal reconsideration after the active job reaches its terminal disposition, without resetting its refresh allowance. Distinct incoming blows are retained even when scheduling notifications coalesce; actual authority, source, recognition and physical invalidity still refuses under the [shared job contract](../../archive/07-technical-architecture/agent-agency-runtime.md#one-lifetime-through-preparation-choice-and-admission).

**Reason / tradeoff:** Reconsider genuinely urgent new circumstances without restarting on every important memory or repeatedly cancelling paid work. This is an explicitly bounded new-evidence decision, not an automatic retry of a provider failure. Preserve distinct attempt identities, reservations and current disclosure. Revisit the values or their policy ownership only with an explicit decision and measured behavior/cost evidence.

[Implementation](../../apps/server/src/ai-director.ts) · [Accepted intake contract](../maintainers/events-perception-and-reactions.md).

## LA236

**Removed — source rechecked October 15, 2026 · Restrictiveness: — (superseded).**

The former 120-character default diagnostic-trigger cutoff is absent from current publication. The director retains the exact stimulus in the detailed input and a readable trigger; `cognition-inspection.ts` removes standard prefix/time/addressing boilerplate without imposing that length cutoff. Existing diagnostic record/byte admission remains separate.

**Reason / tradeoff:** Keep the list preview short but preserve the full triggering explanation in the request's detail view.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Keep**.

## CG01

**Current — source inspected at `af1eb02` · Restrictiveness: Liberal.**

**World observation precedes candidate and final context limits.** Candidate preparation rejects more than 8,192 combined visible/inventory/recipe/note items or more than 4 MiB of note text before constructing candidate descriptions/hashes. It still consumes an already prepared observation, and admission permits substantial formatting below these guards. Subsequent attention/model-byte selection has separate limits; perception, knowledge and custody filter membership. Unlimited recipe/content admission is not automatically bounded total decision-preparation work.

**Exposure / consequence:** Crowds and ordinary growing inventories increase decision preparation; thousands of individually created items/recipes are lower-probability extremes. A model request limit protects provider input, not all prior formatting CPU/RAM.

**Reason / tradeoff:** Avoid hiding valid actions/content by identifier order. Query relevant candidates or incrementally pack descriptions while retaining required facts and explicit omission diagnostics.

**Evidence:** Distinguish ordinary dense-neighbor growth from deliberately creating 10,000 objects. [Implementation](../../apps/server/src/recall.ts) (`candidateSet; select`). [Revisit C17](../maintainers/limits-audit.md#c17).

**Measured follow-through, October 7:** the [AV02 complete resident caller](../verification/shield-defense.md#second-implementation-review--october-7-2026) prepared 1,584 choices with 1,509 carried lots, largely optional per-lot Drop suggestions; sampled warm calls ranged 37–248 ms on the shared host. Native attack/equipment admission and earlier incompatible-tool filtering are delivered, while general observation and pre-selection action preparation remain C17/PF work. This is diagnostic evidence, not hosted capacity or a new content cap.

**Implemented mitigation:** The count/text guards refuse oversized candidate preparation without deleting retained sources. Observation and resident-world preparation still precede them. [Preparation owner](../memory-architecture.md#retrieval-preparation-admission).

## CG02

**Current — native-action integration source review, 2026-09-26 · Restrictiveness: Safe.**

Grounding preserves all permitted single-command handles and visible follow choices; it refuses context above 100,000 encoded bytes before inference. This retains main's byte envelope and removes the older action branch's first-48-handle/first-16-follow truncation. Optional entity detail includes 64 visible entities with explicit available/included counts; an explicit selected target is first. Complete deterministic forms bypass inference. Jev's winning-choice threshold is 0.8; lower certainty takes the generated/reviewed or unresolved path, with no automatic paid retry.

**Reason / tradeoff:** Avoid losing existing actions through catalogue order while bounding model input. The entity-detail cap can still omit optional context, and the threshold is not a calibrated semantic guarantee. Expansion/calibration belongs to [AC03](../maintainers/action-capabilities.md#ac03--bounded-action-grounding), not a silent limit change. [Source](../../apps/server/src/action-grounding.ts).

## Routine animal acquisition

**Current · Restrictiveness: Medium.**

Ordinary animal/object first sightings and returns update current visibility and exposure identity but create no stored encounter. New memory-bearing people create private evidence at importance **3**, urgency **0**, with no automatic semantic trigger. Significant changes and separate speech/action/hazard events keep their existing handling; registered interests can still inspect visible candidates. [Base policy](../../packages/domain/src/worlds/base/senses.ts).

**Reason / tradeoff:** Avoid multiplying mundane bird/scenery history by observer count. This September 27 owner-authorized change replaces importance-zero animal onset records, object onset records and automatic social-onset reasoning. Unrecorded sightings cannot later be recalled as individual memories. It does not delete existing history or suppress current perception. Richer first-sighting significance remains EPR06; revisit when authored conspicuous objects or dangerous fauna are added. [Contract](../memory-architecture.md#encounters-sensory-detail-and-reminder-continuity) · [PF09](../maintainers/performance.md#pf09--population-work-follows-relevance).

## Maintenance read backoff

**Implemented · Restrictiveness: Medium.** A failed advisory maintenance scheduling read defers another scheduling attempt for 60 real seconds. Gameplay continues if authoritative saves succeed; background maintenance reports the failure. No automatic paid retry or source deletion is introduced.

**Reason / tradeoff:** A transient read failure should not stop the world or create a query retry storm. Cleanup can lag during the delay; retained history and ordinary durability remain intact. Reconsider the interval if operational measurements show delayed maintenance causing pressure. [Owner](../memory-architecture.md#maintenance-storage-failures).

## CG03

**Implemented — September 27 · Restrictiveness: Safe.** Committed interest/reflection/schedule metadata caching retains at most **512 keys and 2 MiB of estimated string storage** per store, counting two bytes per key/value character. Pending reads share entries; oldest entries and oversized resolved values are evicted. Memory/vector coverage caching retains its existing **512 scope/model entries**. Overflow performs ordinary database reads, with no cap on retained memories, interested characters or perception.

**Reason / tradeoff:** Avoid repeatedly fetching unchanged scheduling facts while bounding optimization memory. Values remain isolated from consumer edits, and transaction/restore invalidation preserves freshness. Raise the cache bounds only if measured eviction churn warrants it; no current Remove/Change/Expand task. [Contract](../performance/storage.md#committed-cognition-metadata) · [Metadata owner](../../apps/server/src/integration-values.ts) · [Coverage owner](../../apps/server/src/memory-repository.ts).

## CG04

**Current — source and native measurements, September 27 · Restrictiveness: Liberal for preparation, Safe for output.** Selected possessions remain capped at **16**. Their immutable definition facts are shared, required action-tool references are reserved, and cognition reuses one permitted observation across immediate discovery/planning. Preparation still scans/copies the actor's accessible inventory before selection; this is not indexed semantic retrieval.

Explicit inspection returns at most **16 possessions / 8,000 UTF-8 description bytes** with inventory-revision-bound continuation. It retains the last page's item IDs, with current custody rechecked before reuse. A changed inventory rejects continuation; a single oversized descriptor refuses truthfully. There is no automatic paid page-walking loop or total stored-inventory cap.

When combined visible/inventory/recipe/note preparation would exceed **8,192 rows**, decision observation retains only the current inspection page (initially the first) and bound action/equipment items. It discloses available/considered coverage and preserves the inspection command. Other required-context or noninventory overflows still refuse before paid dispatch. Page selection is explicitly incomplete; it must not claim “no food” from a page with no food. Required possession references over 16 still refuse instead of dropping references.

**Reason / tradeoff:** Preserve an inspection route and reduce formatting above the existing preparation limit without inventing goal-keyword policies, per-item calls or another vector store. Cold scans/sorting, 8k inventories below the fallback, and weapon-by-target action fan-out can still be costly. [Measurements](../verification/embodied-survival.md#inventory-preparation) observed those costs; they establish no population or stable latency envelope. [AG06](../maintainers/agent-agency.md#ag06--goalplan-aware-context-and-derived-interests) retains scoped candidate retrieval and full scheduling qualification. Revisit paging before materialization/semantic indexing when these tails affect ordinary play; do not hide necessary evidence to claim speed.

## CG05

**Current — level-1 selection and escalation, September 28 · Restrictiveness: Medium.** Level 1 rates each supplied action with an independent Noul question (`cognition-questions-v14`). The highest rating at or above **0.7** acts, or continues when it is the offered continue binding. A best rating from **0.5** to 0.7 is an uncertain selection; below 0.5 no supplied action fits; no rated action is its own reason. Each escalates to the most probable offered level-2–4 route in the same route answer (level 2 by default) when generation is enabled and its allowance can be reserved; otherwise the decision defers with that reason. Missing or invalid ratings defer without escalation; answers for unoffered handles are recorded, never executed and do not change the outcome. One selected binding may contain an explicit equip prerequisite plus strike through the existing bounded plan. Non-speech triggers rate actions in the routing request; speech triggers use a dependent second request, and an oversized combined request falls back to it before dispatch. Policy lives in `LEVEL1_POLICY` ([jev-questions.ts](../../apps/server/src/jev-questions.ts)); resolution is [level1-selection.ts](../../apps/server/src/level1-selection.ts).

**Reason / tradeoff:** Independent ratings replaced the proposed mutually exclusive Choice selector, whose similar alternatives diluted winning probabilities in live trials. Ratings measure concrete progress on a current need or goal, including preparation; explicit negative criteria reject unavailable prerequisites, inconsistent values and pointless repetition, and possible failure alone does not make an attempt useless. Escalation replaced the September 27 behavior of deferring whenever no action qualified, which left routine choices stalled; it trades an occasional generation charge for not trapping the actor in a shortlist. Defective answers never buy a larger model, so a malformed judgment cannot become an automatic paid repair. The thresholds are not calibrated correctness or feasibility guarantees; native admission remains mandatory. `AI_JEV_ONLY=true` disables generation, reflection, generated narration/compaction and paid embeddings, with no automatic fallback, so escalation defers there. [Provider contract](../ai-providers.md#jev-only-execution) and [AG13](../maintainers/agent-agency.md#ag13--embodied-survival-demonstration) record demonstrated spontaneous hunting and miss-aware retries with the 0.7 threshold; the 0.5 uncertainty line, escalation value and wider calibration remain unqualified. [Fixture evidence](../verification/level1-decisions.md).

## CG06

**Current — composed-activities implementation, September 29, 2026 · Restrictiveness: Safe.** A request's exact details (`slots`) accept one item, one tool and one living recipient reference, a whole amount of **1–999** units (`exact` handled or `held` total), a named stopping time from the world's list (a world names at most **8**, each one or two lowercase words of up to **24** characters) and at most **200 characters** of method wording. Actor-frame movement offsets are at most **50 m**. A stored refusal keeps at most **500 characters** of actor-safe reason and **8** dependencies in its signature. The free typed parser splits at most **4** clauses joined by "then", scans at most **256** accessible possessions per request, and gives the paid interpreter at most **32** possession/pile-item references; decisions list at most **16** visible pile items. The interpreter's pile-item list stops scanning at its limit and says when more exist, selected pile first. Oversized or unknown details are refused before paid dispatch; nothing is truncated into a different request.

**Reason / tradeoff:** Keep request identity, admission and stored refusals small and exact without silently dropping a consequential detail. The 999 cap and four-clause parser exclude large bulk orders and long spoken programs; larger amounts need a repeat or several requests, and longer sequences need interpretation or several requests. The 256-possession scan can miss a named item in a very large inventory; it refuses rather than guessing. Expand when a concrete supported request is refused by one of these bounds. [Contract](../action-capabilities.md#preserve-the-consequential-slots) · [Slots](../../packages/domain/src/action-capabilities.ts) · [Typed parser](../../apps/server/src/typed-actions.ts) · [AC01/AC03](../maintainers/action-capabilities.md#ac01--reference-bearing-intent-contract).

## CG07

**Current — composed-activities implementation, September 29, 2026 · Restrictiveness: Safe.** Each actor keeps at most **8** private remembered places (where it last saw a subject while following or acting on it; oldest forgotten first) and at most **one** paused plan. Interrupting while a plan is already paused is refused; replacing or cancelling work discards the paused plan. A paused step restarts from its beginning when resumed. Work cannot pause during an attack already under way, after a working step has consumed materials, during a status effect, or while an action started outside the plan runs; those requests are refused with that reason before anything stops. Leaving the world also discards paused work.

**Reason / tradeoff:** "Go back to where I saw it" and "eat, then carry on" need small private records, not a search index or nested interruption stack. Older sightings and deeper interruption chains are unavailable; passive sightings that the actor never acted on are not recorded yet (EPR-owned hook). Expand when a concrete activity needs nested interruption or more places. [AG03](../maintainers/agent-agency.md#ag03--bounded-plan-frontier-and-one-native-physical-lane) · [Agency](../../packages/domain/src/agency.ts).

## CG08

**Current — per-level decision limits and accounting, September 28 · Restrictiveness: Safe for request counts, Medium for money.** One table in [cognition-budget.ts](../../apps/server/src/cognition-budget.ts) (`levelLimits`) sets independent limits per semantic level; a per-decision ledger records every Jev and generation request of the decision with its instructions, context/state and schema/question sizes in UTF-8 bytes, reservation, settlement, usage and outcome. Recall and action-retrieval embedding reservations are charged to the same actor account and appear as their own trace stages and in the trace's recorded cost, but are not yet in the ledger.

| Level                                  | Input                                                       | Schema                     | Output ceiling                            | Visible response                   | Reasoning                                 | Tool rounds | Requests per decision | Money per decision        |
| -------------------------------------- | ----------------------------------------------------------- | -------------------------- | ----------------------------------------- | ---------------------------------- | ----------------------------------------- | ----------- | --------------------- | ------------------------- |
| 1 Jev attention, routing and selection | 220,000 serialized characters per request (client estimate) | counted inside the request | Jev answers only                          | decoded answers                    | none                                      | 0           | 20                    | 20 × Jev allowance        |
| 2 mini LLM                             | 100,000 bytes instructions + context                        | 65,536 bytes               | 1,024 tokens (1,800 with actor invention) | 40,000 bytes (advertised envelope) | low effort; 512-token accounted allowance | 0           | 10                    | 10 × LLM allowance        |
| 3 complex LLM, low                     | 100,000 bytes                                               | 65,536 bytes               | 4,096 tokens                              | 40,000 bytes                       | low effort; 2,048-token allowance         | 0           | 10                    | 10 × LLM allowance        |
| 4 complex LLM, high                    | 100,000 bytes                                               | 65,536 bytes               | 8,192 tokens                              | 40,000 bytes                       | high effort; 6,144-token allowance        | 0           | 10                    | 10 × LLM allowance        |
| 5 reflection harness                   | 100,000 bytes reflection context                            | harness-managed            | harness-managed                           | 100,000-byte reflection proposal   | xhigh effort                              | 8           | 1 run                 | one harness run allowance |

Allowances are the existing per-call reservations (`decisionAllowance`): Jev uses the greater of `JEV_CALL_RESERVE_USD` and its configured 500,000-input price bound, with Macrofold’s additional 1,024-byte input padding; generation uses `MACROFOLD_RUN_MAX_USD` for Macrofold or its configured minimum and 500,000-input/8,192-output-token price bound for direct providers. Interactive preflight also sums individually rounded per-request allowances through that same owner. Every request reserves exactly one allowance rounded upward to integer microdollars. Each money ceiling sums those individually rounded reservations for its request count, so fractional-microdollar configuration does not accidentally refuse the last permitted request. This adds no separate refusal or change to the request counts. [NP01 review evidence](../verification/level1-decisions.md#thorough-review--october-3-2026) covers the rounding boundary. These counts are runaway-loop stops, not tuning: Mike set them on September 30 well above current use so later pipeline steps fit without retuning. At the boundary the next request is refused before reservation with outcome `budget-exhausted`; an escalation refused this way defers. A schema over its allowance refuses like oversized context (`context-exceeded`); a response over its visible allowance, or failing schema/envelope validation, is rejected as `invalid` with no paid repair. The visible allowance is the domain's advertised response envelope (`RESPONSE_LIMITS`), measured on the operations exactly as admission measures them, so it rejects nothing admission would accept; the provider output ceiling normally binds first. The input rows restate pre-existing checks (the 100,000-byte context bound and the Jev client's size limit); this table adds no new input refusal. Level-5 limits are enforced by the reflection path (eight tool rounds, one run allowance) and listed here for one view. Conversation compaction and AG01 action grounding keep their own bounds; the ledger records their spend in the decision total but does not cap them here.

**Reason / tradeoff:** A decision could previously issue any number of Jev and generation requests with only the monthly per-actor reservation as a bound. Counting instructions, schemas and Jev attention/routing/selection in one ledger makes the actual per-decision cost inspectable. Current adapters send one output ceiling that covers visible and reasoning tokens and expose no separate hard reasoning cap, so reasoning is limited by effort and its token allowance is checked against reported usage afterward (an overrun is flagged, not refunded). Headroom was checked against the code paths, not live traffic: a decision makes at most three level-1 Jev requests per attempt (one recall attention, one routing, one action rating) and at most two attempts (the original plus one urgent-awareness refresh), so 6 against a cap of 20; each attempt makes at most one response generation, so 2 against a cap of 10 per level. The typical response schema is about 7.6 KB and a measured worst realistic scene (300 actions, 64 entities, invention enabled) about 15.8 KB against 65,536 bytes. Revisit if traces show legitimate decisions refused. Unpriced direct-provider models (level-2–4 mini/complex models whose prices are not configured) settle as uncertain at their full reservation. Values are engineering starting points, not measured optima. [Evidence](../verification/level1-decisions.md).

**October 17 selected threat-route consumer:** [CTR06/CTR07](../maintainers/combat-and-threat-responses.md) require one cheap relevance/appraisal call followed by one actual choice call, without a mandatory generated thought or third speech generator. Both calls, any otherwise authorized retrieval work and every superseded/failed request remain charged through this owner; the original job must have sufficient admitted allowance and reserve each call before dispatch. This selects a route within shared request/accounting bounds, not a separate combat allowance or an automatic paid retry. The earlier headroom counts describe their recorded baseline; qualify the actual new route and [complete relevant-feelings preparation](feelings.md#fl24--interpreted-threat-reactions) before making cost or latency claims.

## CG09

**Current — accepted inner-world snapshot versus the greeting target, September 28 · Restrictiveness: Liberal.** Every semantic decision includes the complete accepted “About me” snapshot. Its quota allows 10 documents of up to 8,000 bytes (80,000 bytes, roughly 20,000–27,000 tokens), which alone defeats the requested few-hundred-input-token greeting target. The rest of the request defeats it too: a fixture greeting with only 1,616 bytes of accepted text sent 19,173 bytes of instructions and context plus a 7,598-byte schema, led by the response format (4,792 bytes), “Me” (2,565), references (2,501) and known planning techniques (1,929). Near the top of the quota the snapshot plus required context exceeds the 100,000-byte level-2–4 input allowance: a 79,708-byte snapshot fails before any request is sent, while a 71,737-byte snapshot produced an 89,417-byte request and succeeded. NP01 now reports required-context refusal as `context-exceeded` in the existing job/trace surfaces; checks before conversation compaction and after preparation/reoffering stop further dispatch without truncating required content. Earlier preparation can have paid receipts, which remain counted. [Synthetic evidence](../verification/level1-decisions.md#np01-reliable-ai-outcomes-and-spending--october-2-2026) covers the affected paths. The measured sizes above remain historical payload evidence, not new measurements.

**Reason / tradeoff:** Truncating accepted identity text would silently change who the character is, so the conflict is exposed instead of hidden. Resolving it needs a product decision: a smaller quota, a greeting-specific projection of accepted text and of the response contract, or accepting larger greetings and occasional refusals near the quota. [CR01](../maintainers/cognition-redesign.md#cr01--separate-model-text-from-execution-metadata) owns the decision; [payload measurements](../verification/level1-decisions.md#payload-inspection) record the sizes.

## CG10

**Current — September 28, [perception-reaction intake](../projects/completed/perception-reaction-intake.md) · Restrictiveness: Medium.** Each observer keeps at most one private arrival record and one departure record per sighted person within a **3,600 game-second** window. The window is measured from its newest resident sighting record. Further comings and goings in the window update current visibility only. Losing sight of someone with memory is recorded at the arrival profile (importance **3**, urgency **0**, no automatic reasoning). Routine appearances of ordinary animals and objects stay unrecorded under the bundled-world policy; exposed outward changes retain their separate private records.

A person who returns within **30 game seconds** of a recorded departure keeps their perception episode, so non-authored recognition and plan targets survive a first brief occlusion or edge flicker. Live exposure, new detail and action reach still use exact current sight. The grace period counts only from the first departure recorded in the one-hour re-record window; later exits in that window write no record. A return within 30 seconds of that recorded departure keeps the episode even after further brief exits, and a return more than 30 seconds after it starts a new episode however brief the latest exit was. Outward-change records never re-arm a departure. [Base policy](../../packages/domain/src/worlds/base/senses.ts).

**Reason / tradeoff:** The one-hour window already existed, but it read only `world.memories`. Sightings moved to awareness entries, so every return created a new record. Enforcing it trades individual recall of repeated comings and goings for bounded history under jitter and crowd movement.

- Only resident awareness is consulted. Residency trimming at commits or a restart can therefore add a record that an uninterrupted run would have coalesced; it never loses one. Such outcomes depend on commit timing, like other residency-dependent reads.
- Linger does not see perception loss: if an observer's perception is blocked for less than 30 seconds after a recorded departure, a return can still reuse the episode. The episode-state clearing on loss otherwise applies.
- Episode linger covers people only. Animals and objects have no departure records, so their episodes still end on exit (see EPR03 hysteresis).
- D54 retains tuning. Revisit when authored conspicuous objects, dangerous fauna or a narration consumer of departures appears.

## CG11

**Current — September 28, [perception-reaction intake](../projects/completed/perception-reaction-intake.md) · Restrictiveness: Medium.** Active stimuli are derived from an observer's current exposure, never recorded per tick. At most **8** salient sources are kept per observer, ordered by salience, then novelty, then earlier onset, then ID; the rest are only counted.

- **Base-world salience:** burning **2**, incapacitated **3**, dead **3**; other outward states are 0. Bodies are not yet in visual exposure (an owner decision), so `dead` currently affects attention ranking only and never produces an active stimulus or review.
- **Novelty:** a source is novel for **60** game seconds after its exposure episode starts.
- **Attention:** salience raises a visible entity's rank in optional attention (candidate salience 3 + stimulus salience). Nothing is forced into context.
- **Review:** the base world defines no review cadence, so no periodic opportunity (and no mandatory paid thought) falls due. A policy review cadence adds a simulation-clock deadline to the character's intake ticket. A due review becomes a fresh opportunity through the normal admission and spending checks.

[Base policy](../../packages/domain/src/worlds/base/senses.ts) · [derivation](../../packages/domain/src/stimuli.ts).

**Reason / tradeoff:** Keep compelling ongoing conditions in mind without new records, novelty repeats or paid storms, under a bounded cue set.

- Which cue types may force context inclusion, and a production review cadence, are owner decisions (design §12, D54). Until accepted, the base world forces none and reviews none.
- Salience keys on coarse outward states only, so authored hidden metadata cannot raise or reveal anything.

## CG12

**Proposed — integrated character qualification scope, October 3, 2026 · Restrictiveness: Medium.** The first [compelling-character slice](../projects/compelling-characters-feature-spec.md) uses one live resident and a human participant, existing supported activities and the current personal-world clock. This is evaluation scope, not an engine population cap. A second independent resident and unattended operation require their own later qualification. No mandatory thought frequency, action-diversity quota, minimum biography length or new inference allowance is selected.

**Reason / tradeoff:** Prove that bodily and psychological experience, attention, choice, actual consequences and later behavior connect before increasing breadth. Complete accepted About me and required evidence remain governed by CG09 and the memory contract; this proposal does not permit silent truncation or unlimited history. Existing decision, preparation, memory, queue and spending bounds apply. On unavailable cognition or exceeded capacity, preserve and disclose the actual outcome under its owner rather than narrating a completed life. [CE03–CE05](../maintainers/character-experience.md) owns integration; AG12/CR12 measures the complete cost and experience. Revisit scope for a demonstrated missing opportunity, not to increase a character's activity count.

## CG13 — Provider run observation

**Current — PG02 native publication and read-throttling controls, October 4, 2026 · Restrictiveness: Low.** Background native reflection waits two seconds between status/tool-history polls (previously half a second). This reduces its steady read rate from four to one request per second, with up to two seconds of completion-notice latency. Other interactive observation retains its half-second cadence. HTTP 429 on accepted-run status/result or reflection tool-history reads uses Retry-After, at least one second; missing/invalid metadata waits sixty seconds. The original abort/deadline bounds all waits; no paid admission is replayed. Numeric and HTTP-date headers are accepted, with individual timer duration bounded by the JavaScript timer maximum.

Reason: overlapping reflection and ordinary decisions exhausted a local provider's API allowance, causing a successful native run to be abandoned. This is observation pacing, not a thought schedule or additional spending allowance. Shared-account adaptive pacing/streaming across many processes remains unqualified; change the cadence with measured contention and completion responsiveness. Owner: `MacrofoldBackend.waitRun` / `readRun`; transport exposes retry metadata without retrying itself. [PG02 evidence](../verification/cognition-context.md#pg02--attended-resident-feedback-october-3-2026).

## CG14 — Character authorship and personal evidence

**Current authoring requirement and native runtime consolidation — rechecked October 5, 2026 · Restrictiveness: Medium.** Backstory and evolving personality/disposition may influence cognition but must not encode situation-to-action rules, itineraries or permanently asserted transient circumstances. Scenario intentions are explicit setup interventions, not evidence of independent motivation. No new personality taxonomy, numeric meter, lifetime or mandatory paid introspection is selected. [Canonical authorship contract](../projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality).

**Reason / tradeoff:** Personality supplies reasons without prescribing a successful playthrough; removing a successful conditional clause can reduce demonstrated reliability and requires fresh behavioral qualification. Required action experience shares source-linked memory selection/rendering, while current physiology and executable plans remain separate authorities. Existing prompt/retention/privacy bounds still apply; unlimited memory recall and retention are not implied. Central personal rendering must preserve quotations and acquisition rather than attempting unrestricted pronoun rewriting. [Technical scope and remaining qualification](../projects/compelling-characters-tech-design.md) · [CE01/CE03](../maintainers/character-experience.md).

## CG15 — Learned places from retained experience

**Current — PX03, October 5, 2026 · Restrictiveness: Safe disclosure boundary; no new retention cap.** Known places derives one latest eligible observation per place from the character’s actual retained experience. Generated prose, mere possession and opening an accessible outer bag grant no additional knowledge. Forgetting and correction use their existing owner and affect cold as well as active evidence. The base world assigns its useful place observations the existing protected importance **8**, independently of story importance, to retain a practical destination through routine consolidation. Other worlds own their retention decision. No forced attention, extra AI allowance, automatic retry or total-place/memory cap is introduced.

**Reason / tradeoff:** Preserve a learned place as a useful next choice while making source loss and disagreement honest. [Memory contract](../memory-architecture.md#personal-perspective-and-acquisition) owns evidence/forgetting; [SP08](spatial.md#sp08--static-named-places-and-private-known-places) owns static scope and query bounds. Wider cognitive qualification remains CR12.

## CG16 — Outing choices and reconsideration

Renumbered from the outing branch’s CG15 during integration on October 7, 2026; CG15 above owns learned places. The outing limits are unchanged.

**Current — October 6, 2026 · Restrictiveness: Safe.** The character receives their own exact invitation terms, own distance/progress, known companion identity and current sight/unknown-location distinction. Accept/decline/leave are ordinary native candidates, including during other work. A same-pair pending invitation prevents another invitation route from substituting for a reply. No companion private plan, health, hidden position or unseen arrival enters this context. Actual invitation, arrival, changed company and ending produce one private significant evidence record through existing intake; linked plans retain that same source for required recall; unchanged movement buys no model request. Existing context, shortlist, ambiguity, spending and scheduling bounds remain unchanged. Incoming invitations have no separate per-recipient count cap: current views enumerate the participant’s live invitations, and decision preparation remains subject to existing context limits. Crowded-recipient presentation and complete-server load qualification remain tracked under [PX04 follow-up](../maintainers/parallel-batch-04-expeditions-and-exchange.md#px04--voluntary-shared-outings).

**Reason / tradeoff:** Social consent needs useful choices and truthful feedback, not a second thinker or forced compliance. A character may defer, continue or pursue a competing need. [PX04 evidence](../verification/voluntary-outings.md) records native and limited live comparisons, including failed/uncertain trials; it is not population reliability or broad psychological qualification. [BW14](base-world.md#bw14--paired-outings) owns the authored social envelope. Expand evidence or supported choices only for a demonstrated missing decision, preserving permission and ordinary reconsideration.

CF04 adds permitted exact combat-help terms and explicit helping alternatives beside independent choices. This reuses ordinary native candidate/response binding and the helper’s private accepted purpose, without new decision or spending allowances. A compatible movement or defensive action is not automatically help. Independent replacement can end the agreement while preserving that new work. [Controlled downstream evidence](../verification/rivals-and-contested-ground.md) proves binding/ownership, not autonomous acceptance, refusal, adaptation or useful companionship; those remain Batch 06 acceptance.

## CG17 — Selected behavioral guidance

**Current — world/engine boundary correction, October 14, 2026 · Restrictiveness: Low.** The selected saved cognition policy owns action reasons, the consideration and selection questions, and both selection criteria. Each nonempty prose field is bounded to **2,000 characters** to keep per-candidate question growth within the existing serialized provider admission. Completed-action and private-observation importance defaults are finite values in **[0,10]**, matching the existing event scoring domain. The bundled policy supplies the previous guidance and scores (6 each); another supported policy can choose different reasons and scores.

**Reason / tradeoff:** Localize meaning without adding executable prose or a new provider path. Longer authored wording must be rewritten or the bound reconsidered for a demonstrated useful requirement; the existing complete request-size check still owns admission. Guidance cannot add choices, disclose private evidence, grant execution/permissions or raise spending. Owner: [cognition policy](../../packages/domain/src/cognition-policy.ts), [memory contract](../memory-architecture.md#4-jev-attention-before-context-inclusion), CR13/CE03; this correction supplies no live model-quality evidence.

## Situation-aware context selection

**Selected design — updated October 20, 2026; implementation and qualification remain open.** The [feature specification](../projects/situation-aware-cognition-context-feature-spec.md) and [technical design](../projects/situation-aware-cognition-context-tech-design.md) define the coordinated change; [SC01–SC11](../maintainers/cognition-context.md) owns core delivery and SC12 is a deferred optional refinement. These entries record its discretionary, removed and deliberately unchanged constraints. They do not relabel historical CG measurements as new results or create a second table of budget constants.

### SCX01 — Required meaning takes precedence over a size target

**Designed · Restrictiveness: Safe for evidence; potentially restrictive at the existing request boundary.** Preserve the complete accepted About me under CG09, current required body/work/goal/obligation/stimulus/outcome facts, required corrections/withdrawals/uncertainty, and the full dependency/reference closure of every required meaning. Current actor permission and source eligibility control what can be supplied. No new identity excerpt length, generic fact count or target greeting-token ceiling is selected.

**Speech eligibility when installed:** The separately delivered [NST](../projects/npc-speech-streaming-tech-design.md) contract excludes open speech from semantic consumers before ranking, limits, exact required reads, hydration or derivatives. A terminal completed/interrupted occurrence becomes eligible once, retaining chronology, accepted prefix, interruption and first-publication hearing/identity. Current disclosure, forgetting, erasure and timeline fences still apply. Preserve this source rule when present; implementing NST is not a context-builder prerequisite.

**Reason / tradeoff:** An apparently cheap answer based on a different person, missing promise or erased alternative is a product regression. Complete identity can still make a greeting large, and required context can exceed existing allowances. The present design accepts that explicit limitation rather than silently changing identity or inventing a new quota; any future identity projection/quota choice remains at D55/CG09.

**Overflow:** Close and measure the required set as early as feasible, before optional work or spending where its failure is already provable. First remove duplicate representation and use a shorter deterministic form only when it preserves the complete required meaning. If the exact required set cannot fit or a required source cannot be obtained, refuse/defer the affected generation through existing `context-exceeded` or unavailable/stale dispositions with internal detail. Do not increase budgets, truncate identity/quotes or force abandonment of native work. An independent existing route may proceed only with its own complete evidence and current authorization.

A conservative upper estimate above the allowance is not proof of overflow. When safe lower/upper bounds straddle the limit, perform bounded exact required accounting before refusing if that measurement is available. If measurement itself is unavailable or exhausted, preserve that distinct disposition; do not call it a proven size overflow.

**Evidence / owner:** [Technical §§4–6](../projects/situation-aware-cognition-context-tech-design.md#4-typed-preparation-model), CR01/CR03/CR04 and SC01/SC02. Attachment character counts are [local representation evidence](../projects/situation-aware-cognition-context-evidence-and-decisions.md), not provider-token or quality qualification.

### SCX02 — Concurrent relevance and honest discovery coverage

**Designed · Restrictiveness: Safe for authority; no fixed scenario taxonomy or per-family quota.** Caller-, source- and installed-rule requirements combine from actual permitted facts. The builder does not classify scenes into a prescribed list or cycle information categories. Existing bounded discovery and captured cognition/world policy supply supported optional relevance and ordering, with deterministic source-key ties and complete dependency closure. Unrelated source scores are not automatically comparable. Stop when no justified candidate remains; spare allowance does not require filling. Current hard-query baselines preserve discovery/fallback coverage without rendering every row. Required evidence cannot be demoted by attention or fit.

**Reason / tradeoff:** Goals and urgency alone erase useful disagreement, quiet pleasures, old clues and inventive uses. Preserve actual personal interest, competing purposes, contrary evidence and discoverable possibilities without a mandatory number of “fun” facts or scripted choices. Repertoire implementation Priority/Level/world suitability never becomes runtime relevance. No finite selector is claimed to anticipate every possible meaningful association.

**Coverage / overflow:** Only a complete scoped query establishes absence in that scope. Partial, not-requested, unavailable, stale and forbidden are distinct; a missing result is not an empty world. Stale/forbidden snippets cannot remain usable. Remove optional roots in the specified order, retaining dependencies still supported by required or other selected roots. If the selected threat route requires a complete eligible choice set, generic optional selection cannot trim it; use its existing incomplete-preparation outcome.

Where NST is installed, terminal readiness and chronology are separate. Closing an older speech occurrence makes its permitted evidence newly available even after newer occurrences passed a chronological watermark. An unrelated decision cannot inspect unfinished speech as a shortcut around that rule. This conditional integration does not require adding speech-stream tracking to core context construction.

**Evidence / owner:** [Technical §§5–6](../projects/situation-aware-cognition-context-tech-design.md#5-situation-detection-without-an-exclusive-classifier), CR04/CE03/IS02 and SC02/SC09. Existing thresholds are not newly calibrated by this design; actual omission and episode comparisons remain open.

### SCX03 — Bound discovery and hydration before final rendering

**Designed mitigation of current growth · Restrictiveness: Medium at inherited preparation bounds.** Preserve existing source/query/character/byte/request limits, including CG01 and applicable memory/SPK preparation bounds. No new arbitrary maximum world population, inventory, learned-method library, context-profile count or retained life-history quota is introduced. Select permitted IDs and source sizes before loading bodies; build references only for selected permitted dependencies; reuse exact immutable definition/native-check work where its owner can prove validity.

**Reachable growth / consequence:** Current first-use observer handle preparation hashes every world entity, and observation can load a full inventory before page selection. Candidate × tool × target preparation, cold memory hydration, many simultaneous real obligations and dependency fan-out can also grow before a final short prompt is produced. The final schema/transport gate does not bound all that earlier work. A small returned list or SQL `LIMIT` does not prove a bounded query plan.

**Selected enforcing owner:** The new request-local `CompilerWorkMeter` in `decision-context-selection.ts` applies the existing pure `workVector`/`addWork`/`requireWork` arithmetic and `WORK_LIMITS.group` ceilings from `packages/domain/src/work-budget.ts`. Existing source row/body limits do not currently meter compiler edges, repeated fitting or key comparisons. This is new compiler admission against existing generic ceiling values, not a claim that current request preparation already enforces it. It creates no durable native invocation, world pause, action-resource charge or new content quota.

**Overflow / work accounting:** [Technical §13.1](../projects/situation-aware-cognition-context-tech-design.md#131-explicit-compiler-work-admission) specifies pre-allocation admission for metadata visits, nodes/edges, repeated traversal and byte comparisons, processed/encoded bytes and retained representations. Cumulative counters persist across roots/pages/waits/refresh; optional work cannot spend the reserved seal capacity of an already finalized required fallback. Optional exhaustion uses that still-current fallback with truthful coverage. New required evidence or changed authority invalidates it; required exhaustion defers the affected generation. Stable bottom-up mergesort and iterative graph traversal make exhaustion reproducible. Semantic dependency depth is not a new 32-edge limit. Estimated encoded retention is distinct from measured heap/RSS or latency. Required evidence is never silently dropped to meet a benchmark.

**Evidence / owner:** [Technical §13](../projects/situation-aware-cognition-context-tech-design.md#13-performance-and-preparation-work), SC02/SC08, PF09/PF14 and C17. This is a source-grounded design for known work growth, not a measured latency or production-capacity improvement. Database-internal scans and opaque library CPU remain subject to their own bounds and complete-caller qualification; compiler counters are not proof of those costs.

### SCX04 — Count the complete request and preserve current budgets

**Designed accounting correction · Restrictiveness: Existing admission bounds unchanged.** Retain CG08's separate message/context, schema, visible-output, request-count, tool-round and financial constraints and the current complete serialized transport gate. Include all actual instructions/context/reference text, response schema/tool definitions/results and output allowance in complete diagnostics/admission analysis. Keep component bytes distinct from total transport bytes to avoid double counting. Existing final schema/context checks already exist; the identified preparation metric estimates prompt-only input, not a wholly unbounded pipeline.

**Reason / tradeoff:** Minifying a pretty HTTP export, moving a manual to tools, or changing a cache hit can alter different costs. Report actual provider input/output/cached/reasoning usage when available and preserve missing fields as unknown. Keep the separately labeled complete-input estimate and its estimator/model/basis distinct; do not infer cached or reasoning receipt fields from a byte heuristic. Estimates introduce no new refusal policy. Do not treat a character count as exact tokens or a missing receipt as zero cost. A smaller final request can lose if it causes more retrieval, inspection or generation work.

**Overflow / financial behavior:** All selected preparatory attention, embeddings, existing compaction, threat stages, generation and configured reconsideration remain charged through current owners. No new paid counting request, summarizer or repair is automatic. Early required-context refusal preserves any real earlier receipts. Current schema/output/body limits continue to refuse at their actual owner; a caller cannot increase one silently to compensate for duplicated context.

When NST is installed, include its record/envelope accounting alongside its independently bounded normalized logical response and charge actual screening executions through their existing owner. Listener fan-out creates no generation request. Measure the actual installed request and executions; historical operations-schema savings do not predict a future combined result. [NST-L02](npc-speech-streaming.md#nst-l02--structured-parts-and-aggregate-output) retains that separate project's finite records/document bounds. No screening or streaming implementation is added to core SC scope.

**Evidence / owner:** [Technical §11](../projects/situation-aware-cognition-context-tech-design.md#11-complete-request-accounting-and-cache-behavior), SC01/SC06 and current AI/budget owners. The supplied request's local savings estimates remain qualified in the evidence record; actual token/latency/financial improvement is unmeasured.

### SCX05 — Remove padding without limiting compatible choices

**Selected removal · Restrictiveness: No new response-count limit; existing native bounds retained.** Replace padded logical operation alternatives with common metadata plus one active payload. Retain all eight enabled kinds, repeated operations, empty output where permitted, genuine nulls, admission dependencies, native plan outputs and `interrupt`. Core SC can complete with today's sparse `operations` envelope, current revisions and meaningful modes. If NST is separately delivered, its sole `records` root uses speech records and sparse non-speech records without inactive `talk: null`; no operations-only generation reader remains after that cutover. NST delivery is not required to finish SC. No “one operation per reply,” “speech requires idleness” or talk-only classifier shortcut is selected.

**Reason / tradeoff:** Inactive null fields and duplicate structural manuals add size and drift without helping a decision. Sparse nested closed alternatives can preserve the contract with less input/output scaffolding. Family and parameter shape must be paired. Concise shared semantic instructions remain necessary for admission versus completion, work transitions, references, goals and silence. All current parsers/producers/preview/native consumers must change together; no legacy response reader is retained.

**Boundary:** The generative sparse schema does not replace an installed native route's bound-choice/composition contract. When the separately selected CTR route is installed, retain its two stages and exact eligible/relevant/uncertain choices; simultaneous speech/action requires an actually supported composition. Do not add a third generator or require CTR's delivery/physical-counterattack qualification as an SC release gate.

**Evidence / owner:** [Technical §9](../projects/situation-aware-cognition-context-tech-design.md#9-compact-response-contract), SC03/SC04, AG01 and existing response/admission owners. Local sparse-schema character calculations do not establish provider compatibility or character behavior.

### SCX06 — Keep necessary detail up front; no new automatic tool round

**Designed · Restrictiveness: Existing immediate tool/call limits retained.** Full useful capability detail is required when it materially affects the current choice. A concise discovery description may replace optional form detail only with useful meaning and a current exact permitted route that actually returns the missing detail promptly, under the rules in technical §8. An open proposal or information-needed result is not itself such a route. Proposal grounding can replace optional invocation syntax only when the initial facts already support an informed exact intention and all references/amounts/qualifiers are preserved. Immediate generative levels keep CG08's zero tool rounds. Native inspection remains an actual supported action with its current timing, access, page and spending consequences.

**Reason / tradeoff:** Sending every form is wasteful; repeatedly asking for obvious or urgent facts makes play slow and weakens decisions. Retain the initial detail if the route is unavailable, requires guessing, cannot supply a necessary parameter or imposes a material tactical/ordinary-play burden. A missing target in partial discovery is not proof that the world lacks it. UI field/button removal must preserve any unique meaning; References remains necessary.

**Extension gate:** A demonstrated consequential omission or excessive inspection burden may justify separately designing a bounded read-only within-job tool through CR04/CR08/CH01/conditional ND20. First compare corrected initial selection and existing native detail access. This gate neither postpones required current selection fixes nor selects an external memory system, automatic second generation, ninth operation or unbounded search loop.

**Evidence / owner:** [Technical §8](../projects/situation-aware-cognition-context-tech-design.md#8-detail-access-without-a-mandatory-second-generation), SC05/SC09. Actual extra-turn/friction and quality comparisons remain open.

### SCX07 — Request-owned reuse, exact scopes and bounded diagnostics

**Designed · Restrictiveness: Safe for privacy and current authority.** Default reuse is request-scoped. Longer-lived definition/schema/source caches use existing bounded owners with exact semantic dependency/version/disclosure keys, eviction and invalidation; this project selects no new unbounded private-context cache or duplicated transcript/memory store. Derived units, dependency graphs and reference maps are not saved as another authoritative mind.

**Reason / tradeoff:** Stable prefix and local shared preparation can reduce repeated work, but stale meaning or cross-character data cannot be reused for a cache hit. Provider cache eligibility depends on its actual rendered context/settings; keep exact request-specific reference constraints initially. Handle text may legitimately change across requests while entity identity/recognition remains stable; only the captured binding is authority.

**Lifecycle / overflow:** Correction, forgetting, changed grants/control, relevant custody/geometry/definitions and timeline restore invalidate affected reuse. Keep borrowed mutable state out of retained preparation. Diagnostics retain bounded counters/selected manifests under existing capture/retention policy; full private text requires authorized inspection and is not copied per poll. An unavailable cache falls back to the ordinary permitted read or explicit failure; it never returns another scope's value. Old results cannot publish after restore even if IDs recur.

Where NST is installed, its first accepted nonempty speech prefix creates a progress receipt/publication claim before the whole-response receipt. Preserve it against replacement, refresh, fallback, reconsideration and escalation. Later failure retains approved committed words interrupted; generated non-speech operations still require complete typed validation. Restore and historical hearing remain with NST's owner and current security/suppression remain effective. Core SC preserves the current installed lifecycle; it does not implement these separate future mechanisms.

**Evidence / owner:** [Technical §§11–13](../projects/situation-aware-cognition-context-tech-design.md#11-complete-request-accounting-and-cache-behavior), SC06–SC08, current identity/data/save/trace owners and existing CG03 cache limits. No new cache-hit, retained-memory or population qualification is claimed.

### SCX08 — Optional revision binding and local references

**Designed, deferred optional follow-up · Restrictiveness: Current native write safety retained; local schema references disabled by default.** Core SC retains current revision and meaningful work-mode fields. SC12's server-bound metadata change is outside core release dependencies and need not be implemented or evaluated to complete the general builder. If separately selected, after sparse consumers qualify it removes only derivable echoes and explicitly identical work transitions, retaining captured revision/existence/read bindings. A later same-reply write consumes an accepted new revision only through an explicit dependency on the last accepted writer; independent stale writes refuse. Full note replacement requires full current text; absent/unread is not empty or revision zero.

**Reason / tradeoff:** The model should choose meaning, not copy server-known revision counters. Moving those fields across the trust boundary requires precise target and same-reply semantics, all specified in technical §10; it does not relax optimistic concurrency or create an old-wire adapter. Independent mode-like parameters keep their meanings.

**Separate conditional removal:** `$defs/$ref` factoring is not required for sparse delivery. The current validator rejects references. If measured benefit and configured adapters justify it, enable only the captured-schema local nonrecursive subset from technical §9.5, with strict traversal/admission and explicit rejection of external, missing, cyclic or dynamic reference forms. Otherwise retain inline definitions. No external schema resolver, recursive support, paid fallback or alternate old-format reader is selected.

**Evidence / owner:** [Technical §§9.5–10](../projects/situation-aware-cognition-context-tech-design.md#95-ref-is-a-separate-gated-refinement), SC12 and existing mutation/receipt/schema owners. Vendor support and earlier illustrative size transformations are not local/protocol qualification. No runtime revision-binding or reference-validator change has been made by this design task.

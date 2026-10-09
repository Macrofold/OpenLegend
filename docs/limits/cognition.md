# Cognition and action selection: limits and constraints

[Feature contract](../agent-agency.md) · [Implementation work](../maintainers/cognition-redesign.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [decision-context.ts](../../apps/server/src/decision-context.ts), [recall.ts](../../apps/server/src/recall.ts), [cognition-contracts.ts](../../apps/server/src/cognition-contracts.ts).

## LA001

**Historical — needs recheck · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 16 nearby characters or animals; optional relevance checks may add more.

**Reason / tradeoff:** Expand the guaranteed nearby-being information when the model request has room, while keeping the situation's most important beings first.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA002

**Historical — needs recheck · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 16 nearby objects; optional relevance checks may add more.

**Reason / tradeoff:** Expand the guaranteed nearby-object information when the model request has room, prioritizing objects needed for the current situation.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA003

**Historical — needs recheck · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 16 owned items; optional relevance checks may add more.

**Reason / tradeoff:** Allow more owned items into the guaranteed information, especially items needed to understand the character's available actions.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA004

**Historical — needs recheck · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 16 knowledge entries; optional relevance checks may add more.

**Reason / tradeoff:** Allow more relevant knowledge entries when the model request has room, without sending every stored note on every decision.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA005

**Historical — needs recheck · Restrictiveness: Very safe.**

The guaranteed information sent to a character's decision-making model includes at most 8 memories; optional relevance checks may add more.

**Reason / tradeoff:** Expand the guaranteed memory selection when useful, while always including the evidence needed to understand the triggering event.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA006

**Historical — needs recheck · Restrictiveness: Safe.**

Optional searches select at most 300 candidates from each information category, such as memories, before further relevance filtering.

**Reason / tradeoff:** Keep 300 as the initial search-result allowance until missed relevant information demonstrates a need to expand it.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Review**.

## LA032

**Historical — needs recheck · Restrictiveness: Very safe.**

The older cognition workflow requests up to 300 experiences for full reasoning but only 30 for lighter reasoning.

**Reason / tradeoff:** Choose relevant experiences according to available model input space rather than assuming a fixed record count matches reasoning difficulty.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA033

**Historical — needs recheck · Restrictiveness: Safe.**

The older cognition workflow limits its assembled model input to 80,000 characters and 400,000 bytes.

**Reason / tradeoff:** Reconcile the two measurements with the chosen provider's request limit and state exactly which check rejected an oversized request.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Review**.

## LA034

**Historical — needs recheck · Restrictiveness: Safe.**

The current immediate-decision workflow limits assembled model input to 100,000 bytes.

**Reason / tradeoff:** Keep a finite input allowance, but size it for the selected model and include instructions and response-format overhead consistently.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA035

**Historical — needs recheck · Restrictiveness: Very safe.**

The current decision workflow reserves no more than 50,000 bytes of its shared input allowance for action descriptions.

**Reason / tradeoff:** Let relevant action descriptions use available space after required facts are included, rather than rigidly limiting actions to half the allowance.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Expand**.

## LA036

**Historical — needs recheck · Restrictiveness: Safe.**

The action-selection workflow searches the full eligible action library but returns at most 300 options for further judgment.

**Reason / tradeoff:** Keep the requested 300-option default and report incomplete coverage; improve relevance ordering when meaning-based search is unavailable.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA037

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** When a computer-controlled character builds a multi-step plan, the model receives only the first 16 possible gathering, material-preparation and crafting steps after sorting by internal identifier.

**Reason / tradeoff:** Removed the sixteen-option planning cutoff. Planning options now fit the existing complete model-input allowance; diagnostics count size omissions and only included options receive plan bindings.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Completed removals**.

## LA038

**Historical — needs recheck · Restrictiveness: Very safe.**

A spontaneous cognition request describes at most the 8 newest significant experiences that could have caused the character to think.

**Reason / tradeoff:** Select the events needed to explain the current situation rather than cutting the trigger description at eight regardless of meaning.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Replace**.

## LA039

**Historical — needs recheck · Restrictiveness: Safe.**

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

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A computer-controlled character's action menu includes options to join only the first 4 eligible nearby conversations.

**Reason / tradeoff:** Removed the four-conversation action cutoff. All eligible nearby conversations can supply join actions to normal action selection.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Completed removals**.

## LA042

**Historical — needs recheck · Restrictiveness: Medium.**

The system accepts a proposed reasoning level only when Jev assigns the winning choice a probability of at least 0.5.

**Reason / tradeoff:** Evaluate whether this routing threshold chooses suitable reasoning effort; it is a model-decision policy rather than a storage limit.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA043

**Historical — needs recheck · Restrictiveness: Safe.**

The system skips further action selection when Jev assigns at least 0.8 probability to the answer that no action is needed.

**Reason / tradeoff:** Check whether this threshold suppresses useful actions before changing it; retaining a probability threshold can avoid unnecessary model work.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA044

**Historical — needs recheck · Restrictiveness: Medium.**

Optional information passes Jev's relevance filter when its yes probability is at least 0.5.

**Reason / tradeoff:** Measure whether useful evidence is being rejected rather than treating the midpoint as proven correct for every information category.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA045

**Historical — needs recheck · Restrictiveness: Medium.**

Some intent and invention classification results require model confidence of at least 0.55 to avoid a clarification or refusal path.

**Reason / tradeoff:** Calibrate this confidence requirement against clear requests that were incorrectly rejected or sent for clarification.

[Implementation starting point](../../apps/server/src/decision-context.ts).

Original recommendation: **Review**.

## LA058

**Historical — needs recheck · Restrictiveness: Safe.**

Immediate reasoning levels 2, 3 and 4 allow 1,024, 4,096 and 8,192 output tokens respectively.

**Reason / tradeoff:** Check whether each task has enough output room, especially when reasoning tokens consume the allowance before a usable answer appears.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Review**.

## LA059

**Historical — needs recheck · Restrictiveness: Safe.**

An immediate response that may include an invention gets an output allowance of at least 1,800 tokens.

**Reason / tradeoff:** Retain enough room for both the proposed invention and ordinary speech or action, within the authorized spending budget.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Review**.

## LA060

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** The reasoning-level table declares input and visible-output sizes, plus a level-5 entry, that are not independently enforced by the searched runtime code.

**Reason / tradeoff:** Removed unused input/display-size declarations and the unused level-5 table entry. Enforced level-2–4 output-token and reasoning settings remain.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Completed removals**.

## LA061

**Historical — needs recheck · Restrictiveness: Very safe.**

One generated character response can contain at most 16 proposed operations, such as speech, actions, thoughts or note edits, and at most 40,000 bytes.

**Reason / tradeoff:** Allow larger responses when useful, while limiting total size and validating each proposed game change before applying it.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA062

**Historical — needs recheck · Restrictiveness: Very safe.**

A proposed response operation can depend on at most 16 other operations, and a generated plan contains at most 8 steps referenced by indexes 0–7.

**Reason / tradeoff:** Expand plan and dependency counts together while preserving the rule that a dependent operation cannot run before its prerequisites succeed.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA063

**Historical — needs recheck · Restrictiveness: Medium.**

One speech operation generated by a character's model is limited to 1,200 characters.

**Reason / tradeoff:** Keep dialogue concise by policy, but ensure the model, response validator and native speech operation agree on the allowed length.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Review**.

## LA064

**Historical — needs recheck · Restrictiveness: Safe.**

A generated action description or goal objective is limited to 500 characters.

**Reason / tradeoff:** Allow enough prose to preserve target, method and intent, with the same length rules in the model format and game validator.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA065

**Historical — needs recheck · Restrictiveness: Very safe.**

One immediate private thought is limited to 240 characters and may name at most 8 associated characters, animals or objects by identifier.

**Reason / tradeoff:** Expand the thought and reference allowances when needed to express a complete thought without losing who or what it concerns.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA066

**Historical — needs recheck · Restrictiveness: Medium.**

The game keeps only the latest 300 accepted character-response identifiers in its local duplicate-response prevention record.

**Reason / tradeoff:** Use durable saved response jobs to preserve duplicate-effect protection before changing this retention count.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Replace**.

## LA067

**Historical — needs recheck · Restrictiveness: Safe.**

Identifiers have different maximum lengths across the API: requests 100, beings/actions 120, goals/records 180 and operation-dependency labels 24 characters.

**Reason / tradeoff:** Unify identifier lengths where the same identifier crosses multiple interfaces, preventing later rejection of an otherwise valid record.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Keep**.

## LA068

**Historical — needs recheck · Restrictiveness: Very safe.**

A character can have at most 8 unfinished goals tracked by the action-planning system.

**Reason / tradeoff:** Allow more stored goals while selecting only the relevant goals for each model request and executing a bounded amount of work.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA069

**Historical — needs recheck · Restrictiveness: Very safe.**

A character's goal structure retains 16 finished goals and permits 24 goals in total.

**Reason / tradeoff:** Store older goal history separately and retrieve it when useful instead of making the active-goal structure the only history store.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA070

**Historical — needs recheck · Restrictiveness: Very safe.**

A character's current plan contains at most 8 steps, and only one plan step may be running at a time.

**Reason / tradeoff:** Allow longer saved plans if useful, while preserving ordered execution and rechecking each step when it starts.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA071

**Historical — needs recheck · Restrictiveness: Very safe.**

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

**Historical — needs recheck · Restrictiveness: Very safe.**

A character can retain at most 16 unresolved commitments tracked by game rules, such as promises.

**Reason / tradeoff:** Allow more remembered promises while retrieving the ones relevant now; do not make promise capacity depend on a tiny fixed count.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA075

**Historical — needs recheck · Restrictiveness: Safe.**

A character's editable knowledge notes allow 5,000 Unicode characters for general knowledge and 1,000 per subject-specific note.

**Reason / tradeoff:** Expand notes when meaningful knowledge cannot fit, while keeping a clear total storage and model-input policy.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Expand**.

## LA076

**Historical — needs recheck · Restrictiveness: Safe.**

A name learned for another being, including a spoken self-introduction, may contain at most 120 Unicode characters.

**Reason / tradeoff:** Keep a reasonable name-length policy and avoid treating longer names as a performance problem without evidence.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Review**.

## LA077

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** The saved description of what should attract a character's attention keeps at most 16 item properties, 8 kinds of beings/objects and 24 item definitions.

**Reason / tradeoff:** Removed the 16-property, 8-kind and 24-definition/prerequisite truncation from saved attention interests. Interests still come from the character’s permitted knowledge and selected evidence.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Completed removals**.

## LA078

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** The character-attention system returns only the first 32 visible beings or objects matching the character's saved interests.

**Reason / tradeoff:** Removed the thirty-two-match cutoff. Interest matching now returns all matching visible beings and objects.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Completed removals**.

## LA079

**Historical — needs recheck · Restrictiveness: Safe.**

A saved description of a character's attention interests expires after 7,200 game seconds.

**Reason / tradeoff:** Review whether two game hours is an appropriate refresh period when goals and private knowledge have not changed.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Review**.

## LA091

**Historical — needs recheck · Restrictiveness: Safe.**

An urgent newly perceived event can cause at most one replacement attempt for an already-running response.

**Reason / tradeoff:** Keep protection against repeatedly cancelling and repurchasing responses, while exposing when the replacement allowance is exhausted.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Keep**.

## LA102

**Historical — needs recheck · Restrictiveness: Very safe.**

The generic character-observation function returns only the latest 24 perceived events in its recent-event field.

**Reason / tradeoff:** Allow callers to retrieve additional relevant perceived events instead of making twenty-four the only available observation window.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA231

**Historical — needs recheck · Restrictiveness: Safe.**

The scheduler for immediate AI responses runs only one interactive or spontaneous-cognition job at a time.

**Reason / tradeoff:** Measure wait times and improve fairness before adding a bounded amount of parallel work; do not create unlimited paid concurrency.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## LA232

**Historical — needs recheck · Restrictiveness: Safe.**

A running character response is considered for interruption when new evidence reaches importance or urgency 8.

**Reason / tradeoff:** Review whether this threshold identifies events important enough to cancel the response without causing excessive repeated model work.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## LA236

**Historical — needs recheck · Restrictiveness: Safe.**

A short diagnostic description of what triggered cognition is cut to 120 characters by default.

**Reason / tradeoff:** Keep the list preview short but preserve the full triggering explanation in the request's detail view.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Keep**.

## CG01

**Current — source inspected at `af1eb02` · Restrictiveness: Liberal.**

**World-context candidates are built before final context limits.** candidateSet traverses observed visible entities, ground items, direct inventory and known recipes to build descriptions/hashes before subsequent attention/model-byte selection. There is no separate total pre-formatting candidate count/byte cap here; perception, knowledge and custody filter membership. Unlimited recipe/content admission is not automatically bounded candidate work.

**Exposure / consequence:** Crowds and ordinary growing inventories increase decision preparation; thousands of individually created items/recipes are lower-probability extremes. A model request limit protects provider input, not all prior formatting CPU/RAM.

**Reason / tradeoff:** Avoid hiding valid actions/content by identifier order. Query relevant candidates or incrementally pack descriptions while retaining required facts and explicit omission diagnostics.

**Evidence:** Distinguish ordinary dense-neighbor growth from deliberately creating 10,000 objects. [Implementation](../../apps/server/src/recall.ts) (`candidateSet; select`). [Revisit C17](../maintainers/limits-audit.md#c17).

**Measured follow-through, October 7:** the [AV02 complete resident caller](../verification/shield-defense.md#second-implementation-review--october-7-2026) prepared 1,584 choices with 1,509 carried lots, largely optional per-lot Drop suggestions; sampled warm calls ranged 37–248 ms on the shared host. Native attack/equipment admission and earlier incompatible-tool filtering are delivered, while general observation and pre-selection action preparation remain C17/PF work. This is diagnostic evidence, not hosted capacity or a new content cap.

**Implemented mitigation:** Candidate formatting rejects more than 8,192 combined visible/inventory/recipe/note items or more than 4 MiB of note text before constructing their strings. Observation and resident-world preparation still precede this guard. [Preparation owner](../memory-architecture.md#retrieval-preparation-admission).

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

**Reason / tradeoff:** Avoid repeatedly fetching unchanged scheduling facts while bounding optimization memory. Values remain isolated from consumer edits, and transaction/restore invalidation preserves freshness. Raise the cache bounds only if measured eviction churn warrants it; no current Remove/Change/Expand task. [Contract](../performance.md#committed-cognition-metadata) · [Metadata owner](../../apps/server/src/integration-values.ts) · [Coverage owner](../../apps/server/src/memory-repository.ts).

## CG04

**Current — source and native measurements, September 27 · Restrictiveness: Liberal for preparation, Safe for output.** Selected possessions remain capped at **16**. Their immutable definition facts are shared, required action-tool references are reserved, and cognition reuses one permitted observation across immediate discovery/planning. Preparation still scans/copies the actor's accessible inventory before selection; this is not indexed semantic retrieval.

Explicit inspection returns at most **16 possessions / 8,000 UTF-8 description bytes** with inventory-revision-bound continuation. It retains the last page's item IDs, with current custody rechecked before reuse. A changed inventory rejects continuation; a single oversized descriptor refuses truthfully. There is no automatic paid page-walking loop or total stored-inventory cap.

When combined visible/inventory/recipe/note preparation would exceed **8,192 rows**, decision observation retains only the current inspection page (initially the first) and bound action/equipment items. It discloses available/considered coverage and preserves the inspection command. Other required-context or noninventory overflows still refuse before paid dispatch. Page selection is explicitly incomplete; it must not claim “no food” from a page with no food. Required possession references over 16 still refuse instead of dropping references.

**Reason / tradeoff:** Preserve an inspection route and reduce formatting above the existing preparation limit without inventing goal-keyword policies, per-item calls or another vector store. Cold scans/sorting, 8k inventories below the fallback, and weapon-by-target action fan-out can still be costly. [Measurements](../verification/embodied-survival.md#inventory-preparation) observed those costs; they establish no population or stable latency envelope. [AG06](../maintainers/agent-agency.md#ag06--goalplan-aware-context-and-derived-interests) retains scoped candidate retrieval and full scheduling qualification. Revisit paging before materialization/semantic indexing when these tails affect ordinary play; do not hide necessary evidence to claim speed.

## CG05

**Current — level-1 selection and escalation, September 28 · Restrictiveness: Medium.** Level 1 rates each supplied action with an independent Noul question (`cognition-questions-v11`). The highest rating at or above **0.7** acts, or continues when it is the offered continue binding. A best rating from **0.5** to 0.7 is an uncertain selection; below 0.5 no supplied action fits; no rated action is its own reason. Each escalates to the most probable offered level-2–4 route in the same route answer (level 2 by default) when generation is enabled and its allowance can be reserved; otherwise the decision defers with that reason. Missing or invalid ratings defer without escalation; answers for unoffered handles are recorded, never executed and do not change the outcome. One selected binding may contain an explicit equip prerequisite plus strike through the existing bounded plan. Non-speech triggers rate actions in the routing request; speech triggers use a dependent second request, and an oversized combined request falls back to it before dispatch. Policy lives in `LEVEL1_POLICY` ([jev-questions.ts](../../apps/server/src/jev-questions.ts)); resolution is [level1-selection.ts](../../apps/server/src/level1-selection.ts).

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

Allowances are the existing per-call reservations (`decisionAllowance`): with Macrofold, `JEV_CALL_RESERVE_USD` and `MACROFOLD_RUN_MAX_USD`; on direct providers the greater of the configured reserve and a 500,000-input/8,192-output-token price bound. Every request reserves exactly one allowance rounded upward to integer microdollars. Each money ceiling sums those individually rounded reservations for its request count, so fractional-microdollar configuration does not accidentally refuse the last permitted request. This adds no separate refusal or change to the request counts. [NP01 review evidence](../verification/level1-decisions.md#thorough-review--october-3-2026) covers the rounding boundary. These counts are runaway-loop stops, not tuning: Mike set them on September 30 well above current use so later pipeline steps fit without retuning. At the boundary the next request is refused before reservation with outcome `budget-exhausted`; an escalation refused this way defers. A schema over its allowance refuses like oversized context (`context-exceeded`); a response over its visible allowance, or failing schema/envelope validation, is rejected as `invalid` with no paid repair. The visible allowance is the domain's advertised response envelope (`RESPONSE_LIMITS`), measured on the operations exactly as admission measures them, so it rejects nothing admission would accept; the provider output ceiling normally binds first. The input rows restate pre-existing checks (the 100,000-byte context bound and the Jev client's size limit); this table adds no new input refusal. Level-5 limits are enforced by the reflection path (eight tool rounds, one run allowance) and listed here for one view. Conversation compaction and AG01 action grounding keep their own bounds; the ledger records their spend in the decision total but does not cap them here.

**Reason / tradeoff:** A decision could previously issue any number of Jev and generation requests with only the monthly per-actor reservation as a bound. Counting instructions, schemas and Jev attention/routing/selection in one ledger makes the actual per-decision cost inspectable. Current adapters send one output ceiling that covers visible and reasoning tokens and expose no separate hard reasoning cap, so reasoning is limited by effort and its token allowance is checked against reported usage afterward (an overrun is flagged, not refunded). Headroom was checked against the code paths, not live traffic: a decision makes at most three level-1 Jev requests per attempt (one recall attention, one routing, one action rating) and at most two attempts (the original plus one urgent-awareness refresh), so 6 against a cap of 20; each attempt makes at most one response generation, so 2 against a cap of 10 per level. The typical response schema is about 7.6 KB and a measured worst realistic scene (300 actions, 64 entities, invention enabled) about 15.8 KB against 65,536 bytes. Revisit if traces show legitimate decisions refused. Unpriced direct-provider models (level-2–4 mini/complex models whose prices are not configured) settle as uncertain at their full reservation. Values are engineering starting points, not measured optima. [Evidence](../verification/level1-decisions.md).

## CG09

**Current — accepted inner-world snapshot versus the greeting target, September 28 · Restrictiveness: Liberal.** Every semantic decision includes the complete accepted “About me” snapshot. Its quota allows 10 documents of up to 8,000 bytes (80,000 bytes, roughly 20,000–27,000 tokens), which alone defeats the requested few-hundred-input-token greeting target. The rest of the request defeats it too: a fixture greeting with only 1,616 bytes of accepted text sent 19,173 bytes of instructions and context plus a 7,598-byte schema, led by the response format (4,792 bytes), “Me” (2,565), references (2,501) and known planning techniques (1,929). Near the top of the quota the snapshot plus required context exceeds the 100,000-byte level-2–4 input allowance: a 79,708-byte snapshot fails before any request is sent, while a 71,737-byte snapshot produced an 89,417-byte request and succeeded. NP01 now reports required-context refusal as `context-exceeded` in the existing job/trace surfaces; checks before conversation compaction and after preparation/reoffering stop further dispatch without truncating required content. Earlier preparation can have paid receipts, which remain counted. [Synthetic evidence](../verification/level1-decisions.md#np01-reliable-ai-outcomes-and-spending--october-2-2026) covers the affected paths. The measured sizes above remain historical payload evidence, not new measurements.

**Reason / tradeoff:** Truncating accepted identity text would silently change who the character is, so the conflict is exposed instead of hidden. Resolving it needs a product decision: a smaller quota, a greeting-specific projection of accepted text and of the response contract, or accepting larger greetings and occasional refusals near the quota. [CR01](../maintainers/cognition-redesign.md#cr01--separate-model-text-from-execution-metadata) owns the decision; [payload measurements](../verification/level1-decisions.md#payload-inspection) record the sizes.

## CG10

**Current — September 28, [perception-reaction intake](../projects/perception-reaction-intake.md) · Restrictiveness: Medium.** Each observer keeps at most one private arrival record and one departure record per sighted person within a **3,600 game-second** window. The window is measured from its newest resident sighting record. Further comings and goings in the window update current visibility only. Losing sight of someone with memory is recorded at the arrival profile (importance **3**, urgency **0**, no automatic reasoning). Animals and objects stay unrecorded.

A person who returns within **30 game seconds** of a recorded departure keeps their perception episode, so non-authored recognition and plan targets survive a first brief occlusion or edge flicker. Live exposure, new detail and action reach still use exact current sight. The grace period counts only from the first departure recorded in the one-hour re-record window; later exits in that window write no record. A return within 30 seconds of that recorded departure keeps the episode even after further brief exits, and a return more than 30 seconds after it starts a new episode however brief the latest exit was. Outward-change records never re-arm a departure. [Base policy](../../packages/domain/src/worlds/base/senses.ts).

**Reason / tradeoff:** The one-hour window already existed, but it read only `world.memories`. Sightings moved to awareness entries, so every return created a new record. Enforcing it trades individual recall of repeated comings and goings for bounded history under jitter and crowd movement.

- Only resident awareness is consulted. Residency trimming at commits or a restart can therefore add a record that an uninterrupted run would have coalesced; it never loses one. Such outcomes depend on commit timing, like other residency-dependent reads.
- Linger does not see perception loss: if an observer's perception is blocked for less than 30 seconds after a recorded departure, a return can still reuse the episode. The episode-state clearing on loss otherwise applies.
- Episode linger covers people only. Animals and objects have no departure records, so their episodes still end on exit (see EPR03 hysteresis).
- D54 retains tuning. Revisit when authored conspicuous objects, dangerous fauna or a narration consumer of departures appears.

## CG11

**Current — September 28, [perception-reaction intake](../projects/perception-reaction-intake.md) · Restrictiveness: Medium.** Active stimuli are derived from an observer's current exposure, never recorded per tick. At most **8** salient sources are kept per observer, ordered by salience, then novelty, then earlier onset, then ID; the rest are only counted.

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

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

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A world's cognition policy can name at most 16 kinds of events that should count as significant, such as death or being taught something.

**Reason / tradeoff:** Removed the sixteen-event-type count ceiling. Cognition policy shape, event-name format, revision and permission checks remain.

[Implementation starting point](../../apps/server/src/decision-context.ts).

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

**Historical — needs recheck · Restrictiveness: Very safe.**

A character can retain 4 unresolved action intentions; one interpretation call can translate at most 4 intentions into sequences of up to 8 executable actions each.

**Reason / tradeoff:** Allow more stored intentions while limiting the number interpreted or executed in a single request.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Replace**.

## LA073

**Historical — needs recheck · Restrictiveness: Very safe.**

The stored normalized description of an unresolved action intention is limited to 1,000 characters.

**Reason / tradeoff:** Ensure the interpreted description preserves the original method and target, with consistent text limits across the interpretation workflow.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Expand**.

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

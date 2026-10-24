# Better decisions without stopping the game — feature specification

| Status      | Current progress                                                                                                    | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Luna Low is enabled by default; background concurrency is expanded to 100, with broader release qualification open. | 2026-10-22   |

Specification updated **2026-10-22T21:59:22Z**. [Technical design](decision-escalation-tech-design.md) defines scheduling, answer formats, saving, spending, freshness and crash handling. Its [concrete acceptance cases](decision-escalation-tech-design.md#deterministic-acceptance-examples) remain delivery criteria. [Verification](../verification/decision-escalation.md) distinguishes implementation checks from broader release qualification.

## Purpose

Keep ordinary character decisions fast, while giving difficult or unusable decisions one opportunity to benefit from **GPT-6 Luna at low reasoning effort**. The character's existing activity, native reactions and the rest of the world continue while that extra reasoning happens. The stronger model proposes an answer; the game checks whether that answer can still be used.

The server owns one bounded reconsideration attempt. The fast decision model remains configurable; the fallback choice does not imply that every primary request meets a sub-second deadline.

## Current behavior

Ordinary operation still chooses a generative route when no supplied action is suitable. With fallback disabled, missing or invalid ratings defer without a repair call. Native action admission, protected memory selection, background reflection and durable spending remain the existing authorities.

The implemented capability records why reconsideration is allowed, schedules one stronger-model attempt separately, and saves its final outcome. The immediate coordinator is released after a durable action, continuation or deferral, while a separate execution limit still counts the original remote request. It does not edit personality files, grant new actions, repair missing engine rules or turn a conversation into a mandatory long deliberation.

The capability defaults to apply for the configured originating model and existing permitted recovery reasons. An operator can explicitly disable it or override that scope. A finite existing spending allowance and direct OpenAI credentials remain required; default standard Luna pricing is supplied unless an operator catalogue overrides it. Existing generation-disabled operation continues to prohibit it. The [technical design](decision-escalation-tech-design.md#adoption-and-current-policy) owns exact configuration and admission contracts.

## Why Luna Low is the selected fallback

The [complete known-miss comparison](../benchmarks/decision-fallback-models.md#all-267-recorded-jev-misses-complete-comparison) tested all 267 recorded Jev misses. Excluding 59 calculations that belong in native code, Low and Medium matched 132/208 (63.46%) and 135/208 (64.90%). They earned 83.99% and 84.11% of possible points, with mean requests of 2.66 and 3.68 seconds. Low trades three net accepted answers for faster delayed reasoning.

Low can still take several seconds and therefore runs in the background. Luna Decisions was faster for selecting offered answers, but that API does not generate arbitrary speech or feeling proposals. No candidate comparison proves that the running game can recognize every incorrect answer; benchmark references never become runtime triggers. The [current full comparison](../verification/decision-api-benchmark.md) records general answer quality separately.

## The character's experience

The following describe intended character experiences. Injury and emotional mechanics that are not installed in a selected world remain illustrative; the native and fixture evidence is recorded separately in the [implementation verification report](../verification/decision-escalation.md).

| Situation                                                                                         | Immediate behavior                                                                                                         | When stronger reasoning can help                                                                           | What may happen later                                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A character with an injured leg considers chasing a hare, in a world that prohibits that exertion | The world excludes or rejects the prohibited action; an admitted ongoing action or native protective reaction can continue | Other permitted ways of getting food involve meaningful tradeoffs                                          | Luna selects a currently permitted alternative, such as an already offered nearby food source; it cannot invent treatment or guarantee a hunt succeeds |
| A difficult job requires choosing between several feasible plans                                  | The character continues compatible work, or leaves the unresolved choice pending                                           | The plans differ in commitments, preferences and likely consequences                                       | A checked proposal can begin at the next permitted interruption point                                                                                  |
| A hungry, sad character hears a cutting remark from someone they resent                           | Existing feelings and physical needs continue under their own rules                                                        | Several reactions are plausible and a qualified policy requests reconsideration                            | One grounded frustration/appraisal proposal may be accepted; a later answer cannot replay the insult or apply its emotional effect twice               |
| A character hears a rumor that conflicts with an older memory                                     | Required evidence includes both accounts with their sources and times                                                      | Interpreting the evidence matters and the first answer abstains or a supported check finds a contradiction | A revised judgment can affect the unresolved choice; neither model can invent a witness or turn testimony into verified world knowledge                |
| A player asks an NPC a difficult question                                                         | Keep the established pending-reply indicator and let the player continue using the game                                    | The conversational route calls for more reasoning                                                          | Commit only the actual permitted reply; do not emit a canned spoken promise while waiting or replace words already heard                               |
| A service returns a confirmed unusable answer                                                     | Record the service problem; keep eligible native behavior running                                                          | A configured, funded recovery reason allows one stronger attempt                                           | Accept its checked answer, or finish explicitly unresolved if it fails                                                                                 |
| The target leaves, a relevant promise is withdrawn, or the actor eats while Luna is thinking      | Native changes take effect normally                                                                                        | The old decision may no longer be useful                                                                   | Discard or reject the obsolete proposal; no automatic repeated purchase follows                                                                        |
| A machine needs to allocate charge, in an installed non-biological world                          | The same engine mechanisms read that world's charge and operation constraints                                              | Allocation is a judgment among valid alternatives                                                          | Use the same escalation path without assuming hunger, legs, healing or human emotions                                                                  |

Continuing an action is not always safe or appropriate. Only its existing native owner can establish that it may continue. If the world supplies no suitable protective or continuing behavior, the system records unresolved semantic work and the world's ordinary consequences still occur. Escalation does not promise universal protection.

## Which decisions deserve escalation

Every applicable request receives one of these dispositions before another paid call is considered:

| Finding                                                                                                       | Treatment                                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A known quantity, elapsed time, installed decay law or exact prerequisite determines the answer               | Compute or check it through its native owner. Supply the permitted fact to the model when useful          |
| A valid, sufficiently supported offered answer meets the task's selection policy                              | Admit it normally; no stronger-model call                                                                 |
| The answer is deliberately unknown, no offered action fits, or the existing policy requests deeper reasoning  | Consider one stronger attempt if time, usefulness, permissions and funding allow                          |
| A selected proposal violates a concrete current rule                                                          | Reject it. Rebuild the permitted alternatives once and consider escalation if a meaningful choice remains |
| A confirmed completed answer is missing necessary fields or cannot be decoded                                 | Consider one stronger attempt under the enabled recovery policy; preserve the original failure and cost   |
| The first provider definitively refused admission because its input is too large or that route is unavailable | Use the stronger route only if its exact supported configuration fits and is independently available      |
| A request may still be executing or its dispatch outcome is unknown                                           | Reconcile the original request; no second paid attempt while its completion is unresolved                 |
| The situation changed, control was revoked, the world was restored, or the decision expired                   | End the old work. A later real event can create a new opportunity through normal admission                |
| The larger model also fails, refuses or abstains                                                              | End this escalation without another model or repeated repair                                              |

The absence of a detected violation means only that the checks passed. It does not certify a good emotional interpretation, complete memory recall, sound priorities or correct beliefs. An engine can verify that an anger change has a permitted target and amount; it cannot generally prove that anger was the best reaction.

For that reason, the design also supports **optional, measured uncertainty-based escalation**. Candidate signals include an explicit abstention, task-specific close scores, known missing optional evidence and an installed policy's consequence category. These are not interchangeable with calibrated correctness. The existing action-suitability threshold remains its own policy. Additional numeric thresholds stay disabled until evaluated on held-out episodes; no universal confidence cutoff is proposed.

## Immediate and delayed decisions

The immediate responsiveness target is **a recorded action, continuation or explicit deferral within one second** of accepting the decision opportunity. Native emergencies do not wait for either AI. A deferral counts as responsiveness, but never as a correct resolved decision in evaluation. The [limits inventory](../limits/ai-execution.md#de-l01--immediate-and-delayed-deadlines) owns the implemented deadlines and the still-unqualified delivery target.

A task may be:

- **Immediate only:** the answer loses its purpose almost immediately. Use the fast/native path; Luna is not a synchronous fallback for a dodge or similar moment.
- **Useful later:** the character can leave a choice unresolved or continue compatible work. Luna may supply a proposal before the task's usefulness deadline.
- **A response requiring language:** the existing conversation route may already need generation. Use one appropriately capable response request rather than a separate decision repair followed by another generation of the same reply.

The game keeps simulation time separate from elapsed real time. A world running faster can make a plan obsolete before its network timeout. Pausing does not extend a paid call or let a result publish into a paused world. A changing environment is not frozen to make the model right.

If the fast model answers after one second, a choice that is still useful may be checked and used as a delayed answer. It is not counted as a split-second decision, and it does not require a second charge simply for arriving late. Immediate-only choices expire instead. An uncertain first execution blocks a second paid call while it is reconciled; the original task deadline bounds that wait.

## What the stronger model receives and returns

Supply a fresh, character-permitted description of the initiating situation, current actions and goals, body and needs, applicable feelings, required memories and commitments, relevant optional evidence, installed rules, and exact available choices. Preserve unknowns, conflicting claims, event times and whether information was observed, heard, remembered or inferred. Include all task-relevant installed restrictions; do not silently drop one because the character has twenty meters or hundreds of memories.

Prefer preventing an illegal choice from being offered in the first place. Where a previous answer was rejected, the new request can include a short factual explanation such as “that option requires more available energy than this character has.” Explanations must not reveal private facts. Luna receives neither the benchmark answer key nor instructions to agree with the earlier model.

The output remains small and structured: an offered choice, task-specific rating/probability, explicit abstention, a subset of relevant optional memories, or supported response operations. Every requested question must be explicitly answered or declined. An appraisal can mean “propose frustration at this intensity, supported by this permitted event,” through the installed feeling rules. Language is optional unless the task calls for speech. A fluent explanation does not excuse an invalid structured choice, and private model reasoning is never required. The [exact output contract](decision-escalation-tech-design.md#exact-answer-envelope) prevents implementers from inventing their own formats.

No raw whole-world data, unrelated private memories, credentials, extra tools or writable mind workspace are supplied. Context overflow is explicit. A larger context window cannot reconstruct forgotten facts or compensate for facts the server never provided.

## Applying an eventual answer

Before using the answer, the game checks the same character and current timeline, current control and disclosure rights, the unresolved decision, its bound evidence, applicable rules and the exact proposed action's current prerequisites. It also checks whether an earlier answer or native action already resolved the opportunity.

Use a still-relevant proposal once. Reject a stale or prohibited proposal without changing the world or asking the model to pretend it happened. Previously committed independent speech or action remains committed; escalation can only fill unresolved, explicitly independent work. It cannot rewrite history or undo an injury.

The action and the record saying that this decision was resolved must be saved together. A crash cannot leave an action committed while its decision still looks available for replay. Once any part of a combined response has happened, that combined response is closed to automatic regeneration; only other questions declared independent before the call may remain eligible. This prevents a failed action from causing an NPC to repeat words the player already heard.

For feelings, retain the original triggering occurrence and native timing. Do not apply a second “increase frustration” for an event whose appraisal was already committed. The current native feeling owner starts a new appraisal's lifetime when it is committed; a fallback cannot backdate it, restart an existing feeling, or pretend the character felt it while the model was still thinking. A delayed new interpretation may be accepted only if its installed policy and the current situation support it. An immediate reaction whose opportunity has passed remains unresolved. Both ordinary structured replies and delayed responses now support a bound appraisal operation when the installed definition explicitly permits decision-time appraisal.

The new feeling-output capability requires explicit permission in each installed feeling definition, independently of reflection permission. Existing bundled feelings initially remain disabled for this new consumer; an authored opt-in fixture verifies it. The implementation adds the integration without inventing a rule that hungry characters must become frustrated. Slowly changing needs or feeling intensity do not automatically invalidate every delayed answer: the task must explicitly allow an observation from the earlier moment, its meaningful condition must still hold, and current action restrictions must pass. Exact-value questions receive no such tolerance.

## Spending, load and failure

The implementation permits one stronger-model request per decision, with no recursive escalation or automatic same-model repetition. Its cost shares the existing decision/account budgets, including money still reserved for uncertain earlier requests. The benchmark's $100 experiment allowance is not a gameplay operating budget.

Preparing that fallback cannot silently buy other AI calls for memory ranking, summaries, embeddings or action interpretation. It uses permitted current facts and valid cached information, then makes at most one additional model invocation. Missing required context ends preparation explicitly. The configured direct route must also be priced as direct OpenAI even when ordinary generation uses Macrofold.

Only an operator may choose the provider/model and permit the extra spending. A character's thoughts, a player message or a generated world description cannot grant it. A cheaper replacement, different billing mode or different data-sharing route requires explicit configuration rather than silent substitution.

The server permits 100 simultaneous background operations, shared across character reconsideration, maintenance/indexing and urgent decisions, plus its separate primary-inference allowance. Each uncertain execution occupies one position; unrelated work can use the remainder without discarding possible charges. Queues and concurrent execution are bounded under [DE-L02](../limits/ai-execution.md#de-l02--bounded-scheduling-and-context-retention). Native simulation and ordinary player interaction must remain responsive under overload. Declining additional optional deliberation is preferable to accumulating an unlimited backlog of obsolete answers. The inspector records why a request was declined, cancelled, unusable or still financially uncertain.

Pausing, shutdown and restart end unfinished delayed decisions. Resuming or restarting does not automatically send or apply them again. Completed actions and real spending records survive; a later genuine event may create a new decision. If a provider might still be executing, its occupied execution capacity remains accounted for until completion is known, even across restart. Missing price alone retains the financial allowance without occupying execution capacity forever.

## Player and developer presentation

Ordinary play shows only actual character behavior and the established pending/failure indicators. It does not show provider names, confidence claims or an imagined inner monologue explaining a service problem. Existing speech already heard is never replaced by the stronger answer.

The authorized cognition inspector links the original decision and its stronger attempt. It explains, in ordinary language: what prompted reconsideration, what the character did while waiting, the permitted evidence supplied, what each model proposed, what was accepted or rejected, elapsed times and combined cost. “Rule checks passed” is distinct from “judged correct in a benchmark.” Inspection itself issues no inference calls.

## Delivery and acceptance

Detailed tasks and unchecked gates belong to [DE01–DE05](../maintainers/cognition-redesign.md#decision-escalation), not a second checklist here.

1. **Native checks and request meaning:** identify task-specific deterministic facts, supported output shapes, the unresolved decision and its legal alternatives. Preserve source/effect distinctions.
2. **One asynchronous stronger attempt:** deliver Luna Low for a bounded existing action-selection case, with shared accounting, fresh admission, cancellation and no shared-slot wait during remote execution.
3. **Complete consumer integration:** cover explicit independent decisions, appraisal and attention consumers where supported, conversation integration, restart/restore, privacy and the existing inspector.
4. **Measured selection policy:** extend the benchmark to exercise actual escalation triggers, new prompts, timing and state changes; qualify any optional uncertainty thresholds before enabling them.

Acceptance requires correct execution and explicit unresolved outcomes, no duplicate effects or lost spending records, no disclosure after revocation, no stale answer overriding newer intent, and bounded work under load. Measure both the immediate response and the later useful answer. Report how often escalation improves a decision, worsens it, is unnecessary, arrives too late or cannot run. Compare against the same fast-only baseline and native-check improvements, not an answer-key-selected subset alone.

Human review remains necessary for emotional appropriateness, character consistency and conversational usefulness. The mechanical checks and synthetic score do not establish these qualities.

## Scope boundaries and decisions

This feature implements one low-effort generative fallback and explicit eligible fast-model origins. It does not add universal emotional laws, new injury mechanics, a planning agent with tools, a multi-model voting system, unlimited retries, silent provider switching or automatic personal-file edits. Those capabilities retain their existing owners and separate approval boundaries.

Implementation and live Low gameplay checks are complete. A small live policy comparison triggered no fallback and therefore demonstrated no added quality benefit. Human character review, natural primary-failure integration and representative deployment capacity remain explicit [release qualification limits](../verification/decision-escalation.md#remaining-release-qualification). Default activation is authorized; those limits are not implied to have passed.

## Maintained records

- Implementation and acceptance: [DE01–DE05](../maintainers/cognition-redesign.md#decision-escalation).
- Limits and constraints: [DE-L01–DE-L05](../limits/ai-execution.md#decision-escalation-limits); existing [cognition allowances](../limits/cognition.md#cg08) remain shared owners.
- Mechanism and verification: [Technical design](decision-escalation-tech-design.md).
- Existing contracts: [AI providers](../ai-providers.md), [memory and response admission](../memory-architecture.md), [engine/world boundaries](../engine-and-world-boundaries.md).

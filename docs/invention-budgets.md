# Invention budgets, runtime cost, and accounting

For the unified World Agent, the accepted default is **$5 for one explicitly funded workshop session, including image generation**. Purpose breakdowns are visible; no separate mandatory art cap or fixed allocation split is selected. The [World Agent runtime](world-agent-runtime.md#8-shared-5-allowance-and-external-runs) owns how session funding spans projects and remote-run allocations. Existing sessions/configured lower caps retain their admitted limits; reconnects never grant another allowance. The current workshop-root implementation is narrower than this target.

**Status: accepted target design.** This document owns invention-episode spending admission, bounded refinement, recurring computational sustainability, and causal cost attribution. It extends the existing local dispatch accounting and [billing/usage contract](../archive/07-technical-architecture/billing-and-usage-reporting.md); it does not create a second wallet, billing ledger, or entitlement authority. [Invention foundation](invention-foundation.md) owns project lifecycle, the [module runtime](../archive/07-technical-architecture/world-module-runtime.md) owns execution interfaces, and [INV](maintainers/inventions-and-world-evolution.md) owns delivery.

The implemented [workshop-root cap](architecture.md#invention-workshop-tools) is one bounded subset of this design, recorded on the existing attempt ledger. It does not complete cross-world payer, runtime, art or entitlement enforcement.

## 1. Three independent resource questions

A candidate may be mechanically valid but unaffordable to author or unsustainable to execute. Keep these decisions separate:

| Budget                         | Question                                                           | Examples                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Authoring/verification episode | What may be spent creating and checking this objective?            | Generation, Jev review, embeddings, bounded harness turns, native tests, image generation, validation compute, retained draft storage.    |
| Installed runtime envelope     | What work may this admitted behavior cause while the world runs?   | Native CPU, queries, targets, events, scheduled descendants, retained state, optional cognition/narration/semantic work, visual variants. |
| Product entitlement            | Does this account have a qualifying invention unit under its plan? | Reserved/used units in a policy-defined period, separate from monetary spending and NPC funding.                                          |

An invention unit is not money. A failed paid attempt can cost money without producing a qualifying invention. Faithful art improvement or depicting an existing state does not consume a second invention unit. Fictional materials, mana, or currency cannot increase any real allowance.

No default allowance is inferred from a model key, an unlocked invention setting, a god-mode label, or an existing subscription. All applicable monetary and execution limits must be explicitly configured and enforced. Zero available funding disables new paid dispatch while native play and already available assets continue.

## 2. One episode across revisions and workers

Use the existing root request/project lineage as the initial authoring-episode implementation; the unified runtime adds explicit funding-session identity without replacing that lineage or the attempts ledger. A project may span deliberately funded sessions, and a session may inspect multiple permitted projects; all costs retain both identities. Its allowance covers all authorized child attempts: clarification, revisions, authoring, validation, speculative art, refinement, and any related harness work. Changing a draft ID, browser session, actor worker, provider, or server process cannot reset the allowance.

The initiating actor/account, permission origin, payer, world, and episode are separate fields. An NPC proposal may originate in an already-accounted actor decision; do not charge that decision again as a new invention-generation call. A player-delegated NPC task keeps player origin and the explicitly bound payer. A permitted shared technical result does not create permission to spend someone else's funds.

A fork may establish a new objective only through an explicit authorized scope/funding decision. Per-payer, world, account, and rate limits still apply so creating roots cannot evade aggregate caps. Keep attribution to the source project and actual charge receipt.

An episode budget is not a requirement to commission every stage. Preserve the zero-call supplied-candidate and exact-reuse routes. Art can stop at an adequate native fallback. A later deliberate refinement can use remaining authorized allocation or a separately admitted new allowance with explicit lineage; it cannot silently reopen an exhausted budget.

## 3. Hierarchical admission without double-counting

Applicable limits can include payer/project total, world allowance, account/actor allocation, episode cap, purpose allocation such as art, and per-attempt ceilings. Eligibility requires all applicable controls to pass. They are constraints on the same underlying costs, not separate charges to sum together.

Represent each paid invocation or service line item once and link it to the scopes it consumes. Parent workflow totals are aggregations of child facts. Do not add the provider cost again when an intermediary charge already includes it; preserve the distinction among BYOK provider estimates, platform compute/service charges, actual debits, and unpriced usage.

Reserve a conservative upper bound atomically before dispatch. Concurrent calls must not each observe the same remaining dollar and both spend it. The initial implementation can use the existing serialized/transactional repository; cross-world payer limits require a shared authoritative check before that deployment is enabled.

Conceptually, a scope's available capacity is:

```text
scope limit
  - settled applicable cost
  - unresolved dispatched exposure
  - outstanding undispatched reservations
```

These categories must be disjoint. A partial settlement replaces the corresponding held exposure rather than being added on top of the full hold. Refunds/credits are explicit adjustments under the accounting policy, not assumed compensation for a failed result.

A reporting service's delayed balance is not the dispatch guard. Use durable local/admission facts so a slow report cannot authorize overspending. If current external accounting is missing after recovery, block affected paid work instead of assuming that no cost occurred.

## 4. Attempt lifecycle and uncertainty

An execution attempt retains its stable operation identity, parent/root, selected candidate, payer/scope, purpose, provider/model and price basis, admitted unit/time limits, reservation, dispatch status, receipt, cost status, and publication disposition.

Use explicit distinctions:

| Situation                                                                     | Accounting behavior                                                                                                  |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Rejected before dispatch                                                      | No provider charge is implied; release only the reservation known not to have been used.                             |
| Reserved but not yet dispatched                                               | Hold capacity until definitive cancellation/release or dispatch.                                                     |
| Dispatched and completed with usable usage                                    | Settle according to the configured rate/actual receipt rules, retaining estimate versus finalized status.            |
| Dispatched, cancelled, timed out, malformed response, or uncertain completion | Retain conservative exposure until reliable reconciliation; result failure is not evidence of no cost.               |
| Duplicate delivery or transport retry                                         | Reuse the same attempt/result identity, never create another charge or world effect.                                 |
| Explicit authorized new paid attempt                                          | New attempt identity under the same episode and current remaining allowance; old uncertain exposure remains counted. |

Persist dispatch eligibility/identity before external execution and reconcile receipts independently of whether the candidate is eventually published. A crash after provider execution cannot become permission to resend. Where provider idempotency or lookup is unavailable, represent the uncertainty honestly rather than claim exactly-once external execution.

A completed, valid, already funded result does not require a second reservation or a positive remaining allowance merely to publish. Verify its original attempt authorization and current content/rights/revocation boundaries; budget exhaustion by itself is not revocation. Lowering a limit stops additional dispatch, not settlement or eligible publication of work already incurred. Any newly billed processing, storage commitment, refinement, or subsequent invocation still needs its own admission. An operator's explicit safety/revocation decision can separately prevent publication.

Cancellation is best effort for stopping work; stale-result rejection remains mandatory for publication. An art result discarded after a redesign can still have incurred cost. A native test that fails still used CPU. Neither clears the episode's accounting.

## 5. Bounding what a call can cost

Bind each attempt to explicit input/output, image/output-count, compute-time, tool-turn, and elapsed-time limits as appropriate. Enforce application-side input caps and supported provider-side ceilings. Use the configured rate version and conservative treatment of unreported cache categories.

For token-billed work, the estimate is based on bounded billable units and applicable input/cached/write/output rates. Image, compute, storage, and service fees use their own units. Do not pretend every service is token-priced or missing usage is free.

A reservation is only a hard bound when the enforceable request/provider contract supports that bound. If total exposure cannot be bounded, do not advertise a guaranteed hard cap or dispatch under a falsely precise reserve. Use a supported bounded route or an explicitly authorized exposure policy with its limitation visible to the payer.

Rates belong in versioned configuration with provenance, not permanent gameplay code or a research memo copied indefinitely. Model aliases, processing tiers, context-size bands, cache rules, and intermediaries can affect pricing. Record the actual reported model and billing basis when available; uncertainty remains explicit.

Use exact integer currency units and explicit currency, with rounding only at defined boundaries. Follow existing micro-USD/decimal-string conventions and overflow validation. Do not aggregate different currencies silently or use a floating-point estimate as the authoritative ledger.

No numeric product allowance or provider price is fixed by this design. The repository's standing implementation-task spending authorization is not a player subscription entitlement or a runtime default.

## 6. Bounded repair and paid speculation

An admitted episode can authorize a finite number of refinement rounds, wall time, tokens, image outputs, and test work. These are maximums, not instructions to spend them. The coordinator stops when the requirements are satisfied, the candidate is rejected/unsupported, a relevant permission is revoked, or the allowance is exhausted.

A test failure can lead to a new bounded candidate revision within the authorized repair scope. A provider timeout is not a semantic finding and does not automatically authorize replay. Distinguish repair of a known returned result from retrying an external operation whose completion is unknown.

A material scope change, more expensive requested output, or exhausted allowance requires a new explicit authorization. Retain the draft and useful findings while waiting; do not keep a paid agent process idle through a human decision or a long-running image job.

Speculative rough art is optional. Reserve it against the same episode and its art allocation, and disclose that it may be unused if mechanics fail or change. Expensive refinement normally waits for a stable accepted design. Confirmed conjuring cannot spend on art before its existing confirmation gate.

Limit autonomous retry pressure using stable request/meaning identities, current-timeline deduplication, meaningful-change triggers, and cooldowns under agency/invention policy. Repeated unchanged proposals, cosmetic renaming, reopening a modal, and reconnecting must not generate paid attempts.

## 7. Installed runtime envelopes

Every executable family/module needs a conservative supported work contract. An artifact can request a bounded specialization; it cannot grant itself more compute, external access, or paid work.

Record, where applicable:

- Per-invocation CPU/instruction or bounded operation work and memory/output limits.
- Maximum query candidates and accepted targets, region/population scope, and expansion/nesting.
- Scheduling frequency, fan-out, descendants, progress/cancellation rules, and pending-work limits.
- Persistent-state growth, retained references, and cleanup/retention behavior.
- Event production and downstream reaction/cognition/narration eligibility.
- Optional semantic/provider work, quotas, and no-provider/over-budget behavior.
- Visual-state/asset-variant growth and rendering/texture requirements.

The [module runtime](../archive/07-technical-architecture/world-module-runtime.md) owns how these bounds bind to host operations. An expected benchmark is not a hard worst-case bound. Prefer deterministic work limits where possible and qualify representative workload performance separately.

A recurring world process can live indefinitely while each step/window and its active state remain bounded. Do not force a meaningless finite lifespan on weather or a persistent law. Do require a supported scheduling rate, bounded outstanding work, progress, cancellation/removal, and a coherent failure policy.

### 7.1 Composition and amplification

Compute conservative summaries from the actual operation graph. When branches are proven mutually exclusive, a justified maximum may replace a sum. Otherwise account for concurrent branches, target multiplicity, scheduling frequency, and nested fan-out. A model's claim that a loop is usually small is not a bound.

A rule where every actor queries every other actor can create population-squared work before any model calls. Include potential downstream paid decisions and narrative work, not just the native query. If the design exceeds the supported envelope, offer a bounded nearby/topology-limited or lower-frequency alternative only with acceptance of changed behavior.

An apparently cheap heat event emitted every simulation second can amplify through EPR, cognition, narration, and art. Apply meaningful triggers/coalescing under those owners' policies. Do not suppress required physical transitions, important disclosure, or actual receipts merely to reduce cost. Where necessary separate native event authority from optional reaction summaries.

Runtime native behavior should not require an LLM to ask whether every object is warm on every tick. A deliberately admitted semantic resolver must specify a residual question, eligible bounded outcomes, evidence, frequency, monetary exposure, uncertainty behavior, and native fallback under the declaration contract. Ordinary play and physical progress remain viable when providers are unavailable.

### 7.2 Aggregate world admission

Check more than one instance. Installation and actual instance/process creation can each require current capacity checks, because a valid per-item bound multiplied by population can exceed the world's budget.

Use configured scope/population assumptions, bounded admission of active processes, and measured native capacity at relevant simulation speeds. A new definition being installed does not reserve unlimited future instances. Shared-player fairness and priorities belong to the host/world scheduler; one inventor cannot monopolize it by selecting a high priority field.

A mandatory behavior with no safe capacity fallback cannot be silently enabled and skipped under load. Delay activation, reject unsupported scope, or use a declared pause/quarantine boundary. Optional art refinement and nonessential diagnostics can be deferred first; survival correctness and acknowledged command durability are not optional quality settings.

## 8. Scheduling and performance isolation

Paid authoring, native verification batches, semantic review, and image processing execute outside the live world mutation lane. Bound worker concurrency, queues, memory, and serialization/copy costs. Begin with the smallest existing in-process/durable-job arrangement that preserves responsiveness; workers or separate processes are justified when CPU isolation is needed.

Prioritize player-visible progress and inexpensive reuse. Do not allocate a permanent sandbox per invention or entity. A bounded job yields while awaiting asynchronous tools or review and resumes only from durable state under fresh checks.

Backpressure must be visible and actionable. `Queued for art`, `verification capacity unavailable`, `budget exhausted`, and `unsupported mechanic` are distinct outcomes. Do not call a scheduling delay a fictional failed experiment or buy repeated attempts because the UI polls.

A final activation/publication check should be short and deterministic. Expensive testing uses pinned snapshots or a bounded affected-state representation; a changed relevant dependency causes replanning rather than holding a write lock throughout reasoning.

## 9. Runtime enforcement and quarantine

Compare enforced bounds with observed behavior. Reject uncommitted work that exceeds a deterministic limit, retaining a technical outcome and no partial world effect. A wall-time timeout is an operational fault, not an alternate fictional result; apply the declared recovery policy.

Escalate from visible throttling/deferment of optional work to scoped quarantine when integrity, resource sustainability, or mandatory behavior requires it. A frozen mechanic can be quarantined without silently rewriting it. If a required owner cannot stop safely, pause the affected authority rather than let two owners race or silently drop its updates.

Limits cannot grant themselves an exception. Raising a world allocation requires the proper scheduler/operator authority; raising real spending requires the payer; changing a fictional resource rule requires world authoring authority. These are separate decisions even when the same local owner holds all of them.

Do not clear an active fault merely because a new model response claims it is fixed. A repaired candidate goes through validation and coherent replacement. Existing consumed materials, paid charges, and historical effects require their explicit recovery/compensation policies.

## 10. Causal observability and reporting

Attach bounded correlation IDs from the invention/project to validation, activation, runtime invocations, generated events, admitted cognitive work, and asset jobs where causation is known. This permits questions such as which mechanic is increasing optional inference spending without placing private prompts in general telemetry.

Record counts, native work/latency, query candidates/targets, event and scheduled-descendant counts, state growth, retries/cancellations, cache reuse, provider dispatch/usage, and errors. Avoid an unbounded trace or synchronous per-span database write in the native loop. Sample/aggregate non-authoritative diagnostics and keep authoritative cost/receipt facts durable.

Distinguish direct costs from attributed downstream costs. Shared events or batched jobs may have multiple causes; choose an explicit allocation rule or report unattributed/shared cost instead of duplicating it in every parent total. For correctness, each actual monetary line item contributes once to aggregate spending.

User views show settled charges, provisional estimates, unknown-cost counts, held/reserved exposure, and available allowance separately. A reservation is not an extra charge. Show episode totals and useful stage categories: interpretation/search, authoring, semantic review, native verification compute, rough art, refinement, validation, and storage/serving where measurable.

Billing time is real dispatch/service time, independent of simulated time, pause, speed, or rewind. Late settlement updates the original incurred period while retaining its posting record. Reuse the existing billing report ranges and scopes rather than introducing another inconsistent date model.

## 11. Entitlements and fairness

Keep player invention quota reservations separate from monetary reservations. The entitlement service decides which successful admissions qualify, under a versioned policy. No tier price, unit amount, or renewal schedule is invented here.

A qualifying admission commits its unit once. Definitive non-admission can release its quota hold; uncertain completion reconciles against durable admission before release. Concurrent requests across worlds must not spend the same last unit. Period rollover, plan changes, late completion, and lineage/fork treatment use the entitlement owner's explicit rules.

A recipe's supporting art does not consume another invention unit. Ordinary depiction of a state, asset reuse, and compatible art improvement are not new mechanics. Player-directed work preserves player entitlement origin; autonomous NPC work follows separate world permissions/funding. Exhausting an invention allowance does not remove already admitted techniques or prevent ordinary use.

Apply rate/concurrency and storage limits as well as dollars to prevent abuse by zero-priced native work, repeated rejections, enormous drafts, or deliberate cache misses. These are application integrity controls, not fictional punishment or automatic denial of creative intent.

## 12. Restore, revocation, and operational recovery

Root spending, actual charges, unresolved dispatch, current permission/lock revocations, privacy protections, and external operation receipts survive gameplay rewind. Draft history may remain historical while its old timeline cannot dispatch or publish. Loading an old save cannot reset an episode, clear an uncertain reserve, or restore someone else's billing grant.

When a cap is lowered below already incurred/held exposure, report the encumbrance and stop new affected dispatch. Do not manufacture a refund or cancel coherent native state halfway through a committed operation. Cancel eligible undispatched optional work and follow declared runtime recovery for actual capacity restrictions.

Raising a limit or unlocking an origin does not automatically retry failed/uncertain jobs or reactivate revoked continuations. A new eligible continuation must use current authority and the retained lineage. Recover non-rewindable ledgers together with operational backups; missing authority blocks affected paid work.

## 13. Optimization priorities

Optimize in this order unless measurement identifies another bottleneck: reuse valid definitions/artifacts; avoid unnecessary provider routing/generation; preserve drafts and precise repair findings; select mandatory checks from contracts; batch independent semantic questions; cache evidence under correct dependencies; keep contexts compact; then compare provider/model prices and performance.

Measure spend per accepted and actually usable result, time to usable fallback, time to refined art, repair count, false rejections, unnecessary escalations, later defects, and incremental runtime cost. A lower token price can lose to an adequate one-call model that needs fewer repairs. A fast asset generator can lose if every sprite needs manual alignment.

Admission-time cost is not the whole product cost. Retention, serving, native simulation, review labor, and downstream cognition may dominate a frequently used mechanic. Report unmeasured components rather than label them free.

Numeric caps, confidence thresholds, population fixtures, and quality policies must be explicit versioned deployment settings with measured qualification before enablement. This design establishes the ownership and enforcement rules, not unsupported dollar or latency guarantees.

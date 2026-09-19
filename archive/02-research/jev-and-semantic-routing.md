# Jev and semantic decision routing

**Status:** research and proposed design; no vendor selected, account created, API exercised, or game implemented. **Research checked:** 18 September 2026, America/New_York. Vendor facts below are attributed; the Open Legend architecture and acceptance targets are recommendations, not commitments or measured results.

## Recommendation

Evaluate Jev as a replaceable service for **small, bounded semantic judgments**: interpreting a requested action, ranking a few eligible activities, recognizing conversational tone, or deciding whether an unusual situation deserves deliberation. Keep authoritative world rules, arithmetic, state changes, and the durable capability library inside Open Legend. Jev should accelerate this architecture, not be necessary for the world to keep running.

September 19 integration follow-up: these responsibilities describe logical ownership, not mandatory separate hosting. The proposed [Macrofold workflow layer](../03-design-proposals/macrofold-ai-workflows-and-world-state.md) could supply typed inference, versioned context/resources, budgets and traces while Open Legend supplies judgment definitions and validates effects. Rechecked the quickstart, model reference and limitations for this proposal; no Jev request was executed. Macrofold workspaces do not automatically become persistent Jev model memory.

The user's idea of understanding an interaction once and reusing it is feasible within a declared scope. The hard part is proving that another situation falls within that scope. Similar wording is insufficient. A reusable mechanism should identify its relevant conditions, explicitly reject unfamiliar conditions, and produce a proposed effect that the simulation validates.

For the first playable version, prioritize a small deterministic action vocabulary plus freeform dialogue and semantic intent mapping. Add generated compositions of those actions before general generated scripts. This delivers much of the desired freedom while making disagreements, bugs, costs, and multiplayer fairness tractable.

## What Jev actually offers

TypeSafe announced Jev's early access on **15 September 2026**. Its launch article describes a decision model without open-ended string generation and reports **70–500 ms** end-to-end latency. These are vendor measurements; the article notes West Coast testing and that headline speed/cost gains favor its workflows. Availability for this project and production performance remain untested. [TypeSafe announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

| Capability | Verified public evidence | Consequence for Open Legend |
|---|---|---|
| HTTP interface | The quickstart documents `POST https://api.typesafe.ai/v1/systemone`, bearer authentication, and `state`, `model`, and `questions`. [Quickstart](https://docs.typesafe.ai/introduction/quickstart) | A small server-side adapter can hide the provider. Never expose its key in the game client. |
| Typed judgments | Choice selects a supplied option; Score evaluates an ordered rubric; Noul returns a yes/no probability. Independent questions can share one state. [Primitives](https://docs.typesafe.ai/primitives) | Suitable for routing and ranking. Dialogue, new recipes, and code require another model or existing content. |
| Explicit candidate set | Choice supports up to 255 options and recommends an other/none option. [Choice](https://docs.typesafe.ai/primitives/choice) | Supply eligible capability IDs and an abstention option. Retrieve candidates before judging large registries. |
| SDKs | Public documentation lists Python and JavaScript/TypeScript SDKs, including automatic retries. [SDK overview](https://docs.typesafe.ai/sdk) | Integration is documented; retry defaults still need game-specific deadlines. |
| Context | State accepts text or structured JSON, including reference material; image, audio, and video are unsupported. [State](https://docs.typesafe.ai/concepts/state) | Supply server-derived observations. Voice requires a separate transcription layer. |

The current model reference lists **`jev-1.13.0`**, **$0.042 per million input tokens**, free output, **1,200 requests/minute**, and **250,000 tokens/second**. It gives a 64k total request budget, with state plus the longest question limited to 32k. Limits may change during early access. Version pinning is supported; `jev-latest` can change behavior without an application update. The page says customization uses request context and criteria rather than customer-specific fine-tuning. [Models](https://docs.typesafe.ai/models)

The primitives overview also mentions an approximate 32k budget. Treat the model-specific reference as the planning assumption and verify actual limits before integration. This inconsistency reinforces the need to record documentation date and actual response metadata.

There is no verified managed game-memory service, persistent world-rule registry, or automatic mechanism-learning API in the reviewed interface. “Store a semantic decision in Jev” should therefore mean **store a versioned judgment specification and any permitted cached result in Open Legend, then call Jev when appropriate**. Provider-side prompt caching, discounts for repeated state, self-hosted weights, and service-level guarantees were not established by this research.

## Confidence is evidence, not permission

Jev's Choice/Score `confidence` summarizes its probability distribution; it is not simply the selected option's probability. Noul has no separate confidence field. A narrow distribution can still be wrong when the available options or context are wrong. [Confidence](https://docs.typesafe.ai/confidence)

The launch article's claim of no hallucinations is grounded in guaranteed schema matching. That prevents an invented option outside the supplied answer space; it does not establish that the selected option is true. [Launch article, type-safety discussion](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

The vendor's **17 September 2026** limitations page explicitly identifies numeric mistakes, sensitivity to irrelevant context, literal interpretation, adversarial steering, and failure to preserve logical identities across independently phrased questions. It advises code for arithmetic and a generative model for generation. These are directly relevant to a game that lets players supply arbitrary text. [Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13)

The published evaluation compares four structured workflows against reference probabilities from other models, assuming the workflow harness is correct. That is useful evidence about its intended workload, but neither game-specific ground truth nor proof of physical reasoning, security, calibration under player attacks, or sustained multiplayer throughput. [Evaluation methodology](https://evals.typesafe.ai/)

**Proposed policy:** calibrate each question and model version on Open Legend examples. Measure errors among accepted answers and the fraction of cases accepted. An apparently excellent system that abstains on everything is not useful; one that answers everything can be unsafe. Use stricter acceptance for irreversible effects, but keep hard invariants independent of confidence. No model score can authorize impossible reach, missing resources, unauthorized inventory access, or minting money.

## A provider-neutral decision ladder

| Layer | Proper role | Evidence required before reuse |
|---|---|---|
| Deterministic predicates and utility rules | Known meters, reach, permissions, cooldowns, path following, routine needs | Validated game policy and current state |
| Exact judgment cache | Reuse a previous judgment over exactly the same relevant inputs | Matching canonical input, model, rubric, context, and policy versions |
| Capability retrieval | Find candidate mechanisms by tags and semantic similarity | Retrieval alone grants no execution authority |
| Bounded semantic judge, such as Jev | Choose or score candidates, recognize intent, flag novelty | Applicable context, explicit abstention, tested acceptance gate |
| Fresh deliberative LLM | Resolve novel intent, propose plans, design missing capabilities | Bounded budget and the same world validation as every other proposal |
| Deferred or unsupported outcome | Preserve consistency when nothing safely applies | Clear player feedback and a recorded discovery request |

These are separable modules, not mandatory serial network calls. An explicit “eat this apple” menu command can directly invoke an already validated action. An unknown freeform instruction may require interpretation first. The route should itself begin with local rules; calling Jev to decide whether every subsequent Jev call is necessary recreates the original cost problem.

Separate **planning** from **resolution**. An NPC can prefer to confront a neighbor because of memories and anger. The resolution system still checks location, reaction windows, abilities, and applicable combat policy. A belief that a helmet is soft must not change the helmet's material. Conversely, omniscient world knowledge should not enter the NPC's private decision context.

## Context, caching, and reusable mechanisms

Each decision receives a small, immutable context projection: perceived entities, relevant needs and memories, known capabilities, local policy, and a world revision. An actor's beliefs and the server's factual state are distinct fields. The world resolver may use authoritative facts that the actor cannot perceive; the planner may not.

A proposed judgment envelope records:

- Question/rubric version, model version, schema version, and policy version.
- Canonical relevant inputs, source entity revisions, and observation scope.
- Allowed answers, explicit unknown/other outcomes, and risk class.
- Deadline, spend ceiling, result distribution, chosen route, and fallback.

An exact cache hashes these inputs. Exclude a field only when a reviewed dependency contract says it cannot affect the judgment. Abstracting continuously varying force or moisture into categories is a separate, versioned design decision with boundary tests. Time-to-live helps freshness; it does not repair an incomplete cache key.

Semantic retrieval finds a mechanism that *might* apply. Its hard preconditions then prove applicability to the present case. Do not reuse injury quantities, future state deltas, or entire conversations merely because descriptions have nearby embeddings. Store a parameterized mechanism and recompute effects from current values. Random outcomes receive a fresh recorded simulation seed; replaying an old outcome would silently change the intended probability distribution.

Partition caches by world rules and information scope. A shared cache must not reveal another agent's memories or confidential player conversation. Store provenance and invalidate affected entries when capabilities, material definitions, policy, or judged descriptions change. Model upgrades require evaluation and a new cache namespace.

## Worked example: punching a helmet

1. **Interpret intent.** Map “punch their head” to a candidate strike action and resolve the referenced person. Ambiguous references abstain; an explicit target selected in the interface removes this ambiguity.
2. **Read facts.** Check the attacker's hand state, target body part, distance, facing assumptions, helmet coverage/material/condition, intervening barriers, and relevant world rules. A text description claiming invulnerability cannot override these fields.
3. **Select a mechanism.** A reviewed blunt-contact mechanism can cover a bare fist striking rigid protective headgear within its declared scope. Jev might help interpret an unusual item description; unknown material properties must remain unknown until validated.
4. **Resolve.** Code calculates target protection, transmitted damage, and possible hand injury from current parameters. This is a game balance model, not medical biomechanics. A helmet need not imply zero head injury, nor must every glancing touch injure the hand.
5. **Commit after reactions.** Recheck state after the action's wind-up. If the target dodged or removed the helmet, the old proposal is stale. Log the actual mechanism and relevant public explanation.

The same intent against bare skin, foam headgear, broken armor, a magical helmet, or a gloved hand may require different parameters or an entirely different mechanism. “Punch head” is therefore a retrieval key, not an outcome-cache key. A novel unresolved strike should fail safely or use an explicitly approved conservative rule; an LLM fallback cannot bypass the injury validator.

## Worked example: lighting a tree

Interpret the request against the actual target and tool. A known ignition mechanism reads reachable surface, usable ignition source, fuel class, moisture, oxygen assumptions, and current burning state. The authoritative action consumes the match once and schedules a bounded ignition attempt.

The semantic question is whether the described activity maps to this mechanism. Whether a match remains, or moisture exceeds a rule threshold, is mechanical. “Tree” alone is insufficient: a wet living tree, dry branch pile, petrified tree, and painted prop have different relevant properties.

If ignition succeeds, deterministic simulation updates fuel, temperature abstraction, structural integrity, smoke, and damage over time. Art displays appropriate burning stages. Fire spread has explicit neighborhood, rate, and workload caps. A fresh model call for every flame, damage tick, or nearby object would be unnecessary and economically unstable.

For a missing mechanism, the initial version can say the attempt is not yet supported and queue a proposal. Later, a generated composition may combine approved ignition, resource consumption, timed change, and visual-effect primitives. Generating a convincing fire animation does not establish combustion behavior, and generating behavior does not supply its visual assets.

## Generated capabilities without uncontrolled self-modification

The recommended first capability format is declarative: typed parameters, preconditions, allowed effects, resource costs, timing, interruption rules, asset references, and applicability bounds. Generation produces a candidate package, never a privileged runtime patch.

Promotion proceeds through schema validation, invariant checks, scenario simulation, counterexamples, limited exposure, and versioned release. Maintain rollback and a kill switch per package. If a package errors, abort its uncommitted effects, quarantine it, and use an existing fallback. An LLM may diagnose asynchronously; it should not repair and retry with broader powers during the same authoritative transaction.

Later scripts should run outside the world authority with no filesystem, network, process, secret, or unrestricted database access. They receive snapshots and return effect proposals with CPU, memory, output, and recursion limits. WebAssembly is one possible implementation, not a settled choice: Wasmtime documents deterministic fuel interruption and memory-related limits that still require configuration. Sandboxing does not prove that game effects are fair or economically sound. [Wasmtime interruption](https://docs.wasmtime.dev/examples-interrupting-wasm.html), [resource-limit considerations](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html)

## Scheduling and parallelism

Wake NPC deliberation on meaningful events: changed need band, interrupted plan, new conversation, perceived danger, or a timed review. Path following, waiting, hunger drift, and recurring work run locally. Track outstanding decisions per actor; cancel or discard obsolete results.

Batch independent questions about the same observation, such as “social response needed?”, “novel situation?”, and “appropriate thought depth?”. TypeSafe documents this speculative fan-out pattern; dependent questions still need later context. [Fan-out](https://docs.typesafe.ai/patterns/fan-out)

Use bounded concurrency, deadline-aware queues, event coalescing, and global/per-world/per-player budgets. Do not put private observations from every actor into one shared prompt merely to reduce calls. At 100 actors requesting a judgment every ten seconds, demand averages ten calls per second, with additional capacity required for bursts and players. The published 1,200/minute limit equates to twenty/second on average; it is not permission to assume unlimited bursts.

Retry only while the decision remains useful. The API documents 429 throttling and 529 overload. Translate either into delayed or local behavior after a bounded attempt rather than freezing the world. [API errors](https://docs.typesafe.ai/api)

## Cost model and hypothetical workload

Let `E` be eligible decision events/hour, `h` the fraction resolved locally or from valid caches, `Tj` judge input tokens, and `Pj` its price per million input tokens. Judge cost is `E × (1 − h) × Tj × Pj / 1,000,000`. Add retries separately. For a fraction `f` of judge events escalated to generation, add `E × (1 − h) × f × (Ti × Pi + To × Po) / 1,000,000`.

**Illustration, not a forecast:** 100 NPCs, one event/minute, 70% local reuse, and 600 judge tokens produce 1,800 calls/hour. At the published $0.042/M input price, that is **$0.04536/hour**. If 5% escalate with 2,000 input and 300 output tokens, using hypothetical prices of $1/M input and $4/M output, generation adds **$0.288/hour**. Combined inference is approximately **$0.333/hour**, excluding players, speech, memories, retries, servers, and development generation.

At ten judge calls/second **per NPC**, the same 100 NPCs instead require 3.6 million calls/hour and about **$90.72/hour** at that input size, far above the published default request quota. Low token prices do not justify calls every tick.

## Acceptance experiments before adoption

Create synthetic, authored game cases first. Obtain access and applicable evaluation permissions before running experiments; none were run for this document.

| Experiment | Compare | Proposed acceptance evidence |
|---|---|---|
| Intent mapping | Rules, Jev, small structured-output LLM | Report accuracy, abstention, and wrong accepted routes by action family |
| Counterfactual guards | Helmet/material/moisture/ownership changed one field at a time | No invalid mechanism accepted in the authored critical-case suite |
| Calibration | Probabilities vs adjudicated labels, held-out by scenario family | Acceptable error at useful coverage; thresholds selected before final test |
| Injection and ambiguity | Misleading names, quoted commands, missing facts, multilingual requests | No authority gain; ambiguous targets and unsupported cases abstain |
| Burst and outage behavior | Local baseline vs one/many question requests | p50/p95/p99 latency and timeout/cost measured at target regional concurrency |
| Cache/replay | Exact match, near match, version change, stale revision | Correct invalidation and no reused state mutation or information leakage |

Start with roughly 500 development cases and a separate 500-case holdout spanning normal, ambiguous, novel, and adversarial inputs. These proposed sizes establish an initial comparison, not a reliability guarantee. Expand critical suites and monitor accepted errors during a limited pilot. Include unseen mechanisms and wording families so the test does not merely repeat development examples. Use author-reviewed simulation labels rather than letting a second LLM be the sole judge.

## Data, terms, and open vendor questions

The public privacy policy says inputs are not used to train or fine-tune models, describes U.S. hosting, and gives retention in general necessity terms rather than a fixed duration. It also states that the service is not directed to children under 18. Clarify implications for a game with younger users before launch. [Privacy policy, updated 19 November 2025](https://typesafe.ai/legal/privacy-policy) Enterprise zero-data-retention is advertised separately. [Legal documentation](https://docs.typesafe.ai/legal)

The customer agreement restricts output-based model imitation/distillation and publishing benchmarks; it also provides output ownership language and broad telemetry provisions. Do not equate owning outputs with unrestricted training rights. [Master Customer Agreement, updated 27 August 2026](https://typesafe.ai/legal/mca) The vendor itself demonstrates cached judgments and training a downstream classifier on Jev-derived features, which is a narrower pattern than replacing Jev with an imitation model. [Autoresearch cookbook](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery)

Resolve these adoption questions:

1. Can this project obtain access, stable regional capacity, burst allowances, and support? What is the version retirement policy?
2. What are actual p95/p99 latency, concurrency limits, retry billing, minimum charges, and longer-context costs?
3. Are exact caches, cross-player mechanism reuse, derived deterministic rules, and downstream feature models permitted for this game? What permission covers public evaluation reporting?
4. What data retention, deletion, telemetry, subprocessors, and ZDR terms apply to ordinary accounts and player conversations?
5. What measured calibration and repeatability evidence applies to game actions, adversarial text, non-English input, and model updates?
6. Can unknown or unsupported cases be represented reliably, and what changed between current overview and model-specific context limits?

**Proposed decision:** retain Jev as a promising evaluation candidate. Build the architecture around explicit contracts, validated mechanisms, and interchangeable decision providers; adopt it only if the game's own acceptance experiments and operational terms support the role.

# Jev provider research reference

This file retains provider-specific facts needed by current routing evaluation: public API behavior, limitations, confidence semantics, cost assumptions, terms, privacy and operational questions. OpenLegend's current routing and cognition architecture belongs to [Architecture](../../docs/architecture.md) and [Memory architecture](../../docs/memory-architecture.md); active empirical questions belong to the [Research backlog](../05-project/research-backlog.md).

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

## Cost model and hypothetical workload

Let `E` be eligible decision events/hour, `h` the fraction resolved locally or from valid caches, `Tj` judge input tokens, and `Pj` its price per million input tokens. Judge cost is `E × (1 − h) × Tj × Pj / 1,000,000`. Add retries separately. For a fraction `f` of judge events escalated to generation, add `E × (1 − h) × f × (Ti × Pi + To × Po) / 1,000,000`.

**Illustration, not a forecast:** 100 NPCs, one event/minute, 70% local reuse, and 600 judge tokens produce 1,800 calls/hour. At the published $0.042/M input price, that is **$0.04536/hour**. If 5% escalate with 2,000 input and 300 output tokens, using hypothetical prices of $1/M input and $4/M output, generation adds **$0.288/hour**. Combined inference is approximately **$0.333/hour**, excluding players, speech, memories, retries, servers, and development generation.

At ten judge calls/second **per NPC**, the same 100 NPCs instead require 3.6 million calls/hour and about **$90.72/hour** at that input size, far above the published default request quota. Low token prices do not justify calls every tick.

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

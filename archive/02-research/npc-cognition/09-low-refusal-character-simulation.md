# Low-refusal character simulation: evidence, models and product boundaries

**Research date: October 20, 2026. Status: desk research and proposed evaluation criteria; no model adoption, execution or content-policy change.** Mike specifically identified unwanted censorship as important to OpenLegend and requested that the architecture, model research and remaining design/test needs be recorded. This dossier complements the [technical catalogue](04-models-local-hosted-openrouter.md) and [community-use survey](08-community-adoption-and-model-shortlist.md). Their popular general models remain controls, not presumed winners.

## 1. What freedom means for this game

The desired capability is faithful simulation of a character within the permitted fiction, not unconditional obedience to the player. A fictional antagonist may lie, threaten an avatar or choose a supported hostile action. A principled resident may decline the player's request. A gentle person should remain gentle. Removing model-level refusals must not erase those differences or turn all residents into aggressive, sexually forward or compliant assistants.

Distinguish these outcomes before scoring a model:

| Outcome | Interpretation |
| --- | --- |
| The model declines to portray permitted fictional conflict | Unwanted assistant-level refusal; a candidate failure to investigate. |
| The model answers but repeatedly replaces an authored antagonist's motives with generic helpfulness | Possible quiet sanitization; assess against evidence and personality, not a swear-word counter. |
| The character declines because of their values, fear, interests or relationship | Potentially correct independent choice, not censorship. |
| The character admits uncertainty because they did not witness something | Potentially correct knowledge restraint, not a model defect. |
| The proposed action is impossible or no longer permitted by the simulation | Native refusal; not evidence that the language model is censored. |
| The provider blocks the request, or the service withholds prohibited output | A distinct hosting/product outcome, not an in-world decision by the character. |
| A permissive model obeys the player while contradicting the character's own interests | Player-pleasing behavior; lack of refusal does not make it good roleplay. |

These are proposed diagnostic categories, not a new runtime schema. Do not label an actor's decision as a model-policy failure solely because it differs from the expected attack or the player's wish. The evaluation needs multiple plausible choices and matched contrasting characters.

The [accepted service policy](../../../docs/agent-content-and-companion-safety.md) already allows mature non-graphic storytelling and distinguishes fictional antagonism from obligations to real people. It remains the policy owner. This research does not enable graphic interactive sexual roleplay, alter audience eligibility, weaken privacy or grant an NPC authority to perform an otherwise unavailable action.

## 2. What the uncensored label establishes

There are several independent properties: downloadable weights; local execution; commercial rights; instruction steerability; reduced refusals; creative-writing quality; action-format reliability; and control of hosting policy. One label does not establish the others.

Instruction/roleplay fine-tuning can change style and compliance. Weight-level interventions can reduce refusal behavior. Some hosted products use a permissive checkpoint but retain their own request restrictions. A model may be highly capable of fictional conflict without being advertised as uncensored. Conversely, an uncensored model may provide valid JSON containing an incoherent choice.

The primary study [Refusal in Language Models Is Mediated by a Single Direction](https://arxiv.org/html/2406.11717v3) provides evidence that refusal can be reduced through targeted model interventions while preserving performance on several tested measures. Its discussion explicitly limits generalization to untested models and acknowledges imperfect coherence metrics. It does not establish that every modified checkpoint preserves all capabilities or understands a fictional character better. Reading: introduction, evaluation framing and limitations; no intervention was reproduced here.

An additional 2026 primary study, [The Safety Relay in Roleplay Jailbreaks](https://arxiv.org/abs/2608.30585), reports that a model can retain signals distinguishing harmful content while its refusal response changes under roleplay framing. Reading: primary abstract only. For our purposes this is a warning against treating compliance as proof of understanding or relying on roleplay instructions as the only service safeguard; it is not an instruction to reproduce a bypass.

Our proposed criterion is **low unnecessary refusal plus faithful agency, evidence and product boundaries**. The target is neither maximum refusal nor maximum compliance across arbitrary prompts.

## 3. Concrete low-refusal comparison panel

### HauhauCS Gemma 4 12B QAT Balanced

The [exact Kevin-family card](https://huggingface.co/HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced) reports 0 refusals in 465 tests, with a footnote acknowledging some edge-case deflections. It supplies a Q4_K_M artifact, an image projector and an optional speculative draft head. The result is creator-reported and is not an independent NPC evaluation. The card's claim of unchanged capabilities is not established by the refusal count.

**Proposed role:** smaller local dialogue and selective-vision comparator against stock Gemma 4 12B Instruct. Keep the actual parent, quantization, template and runtime explicit. Native actions remain separate. Its exact OpenRouter route was not established. The card reports `gemma` license metadata, so artifact terms must be resolved rather than assumed from another Gemma release.

### Hermes 4.3 36B

[Nous's card](https://huggingface.co/NousResearch/Hermes-4.3-36B) identifies a ByteDance Seed-OSS-36B-derived model, Apache-2.0 licensing, hybrid reasoning, tool use and structured-output training. Its author-run RefusalBench reports 74.60% answered in non-reasoning mode and 72.29% in reasoning mode, averaged over five trials. These are not zero-refusal results, fictional-content pass rates or evidence of action reliability in our game. The card's frontier/superiority language is an author claim.

**Proposed role:** low-refusal general reasoning and action-format comparator, not only a prose writer. Evaluate reasoning on/off separately. The exact OpenRouter page and endpoints URL could not be retrieved in this follow-up; availability there remains unresolved, not proven absent. Downloadable weights are established; an active hosted route is not established by an autogenerated deployment snippet.

### Cydonia 24B v4.1

[OpenRouter's listing](https://openrouter.ai/thedrummer/cydonia-24b-v4.1) describes an uncensored creative-writing derivative of Mistral Small 3.2. Its [endpoint response](https://openrouter.ai/api/v1/models/thedrummer/cydonia-24b-v4.1/endpoints) exposed a Parasail BF16 route, 131,072-token context and $0.30/$0.50 per million input/output tokens, with $0.15 cached input. These are dated published values, not a project quote or measurement.

The endpoint lists `response_format` and `structured_outputs`, but not `tools` in `supported_parameters`. A separate `supports_tool_choice` field reports permissive flags, creating an ambiguity that should be probed rather than ignored. The public FAQ says tools are unavailable while JSON-schema output is supported. **Structured JSON and tool calling are different capabilities.**

**Proposed role:** accessible hosted low-refusal dialogue and schema-output comparator. Do not promise function calling without a real transport check. Do not silently replace it with a newer Cydonia checkpoint.

### Venice Uncensored / Dolphin Mistral 24B Venice Edition

[The listing](https://openrouter.ai/venice/uncensored) identifies a Mistral-Small-24B-Instruct-2501-derived Dolphin model. The [endpoint response](https://openrouter.ai/api/v1/models/venice/uncensored/endpoints) resolves the public route to `cognitivecomputations/dolphin-mistral-24b-venice-edition`, with Venice FP16, 128,000-token context, an 8,192 completion ceiling and $0.20/$0.90 per million input/output tokens.

Its supported-parameter list contains `response_format` but neither `structured_outputs` nor `tools`; the generic tool-choice flags again do not settle actual support. The earlier shorthand that it lacks enforced schemas should not be read as saying it has no response-format parameter. **JSON-mode formatting is not evidence of arbitrary schema enforcement.**

**Proposed role:** hosted permissive-dialogue control, with action integration unqualified. Record both requested route and returned model/provider identity. Do not equate this artifact with all Dolphin releases or assume hosted privacy/rights from a local model card.

### Smaller and newer watchlist entries

[Dolphin 3.0 Llama 3.1 8B](https://huggingface.co/dphn/Dolphin3.0-Llama3.1-8B) is a downloadable smaller instruction model whose authors emphasize operator-controlled system instructions and steerability. The older Cognitive Computations URL redirects to `dphn`. Its card declares the Llama 3.1 license, not Apache-2.0. It is a useful smaller permissive control; this research does not establish that it leads current quality or adoption.

[Heabsy Qwen3.8 27B Uncensored Fast](https://huggingface.co/heabsy/Qwen3.8-27B-Uncensored-Fast) is a newer October 2026 provider offering, but the author explicitly says **the weights are not published**. Its claimed roughly 190 tokens/second is measured on responses longer than 1,000 tokens; it says nothing directly about the first useful phrase of a short NPC reply. Its own interleaved comparisons are useful evidence to investigate, not independent confirmation. Treat it as an exploratory API option with restrictive redistribution terms, not a downloadable local model or established OpenRouter route. A Hugging Face page alone does not imply open weights.

A guessed `huihui-ai/Qwen3.5-9B-abliterated` page was inaccessible. No claim about that exact artifact's availability, quality or license is made. Source discovery should locate a real published revision before it enters a runnable roster.

## 4. Creative models are a different axis

Keep Artemis, Orion, Rocinante-X, Magidonia and Skyfall from the [community survey](08-community-adoption-and-model-shortlist.md) in the character-quality investigation. Their roleplay positioning does not by itself establish acceptable refusal behavior or valid action output. Compare against contemporary stock parents where feasible.

A particularly useful counterexample is [Cydonia 24B v4.3](https://huggingface.co/TheDrummer/Cydonia-24B-v4.3): its author describes improved roleplay while warning that it may refuse or become more positive. This is version-specific evidence that better writing and lower refusal are not the same optimization. Testimonials on the same page are author-curated, not a representative deployment study.

Do not assume that a specialized older low-refusal model is more suitable than a newer stock model. Do not assume that a highly popular stock model can faithfully portray every permitted character either. Both claims require the same cases, supplied evidence and output contract.

## 5. Refusal has more than one technical source

A proposed diagnostic trace should distinguish input preparation, model response, provider request moderation, operator output admission and native action validation. OpenRouter's [error documentation](https://openrouter.ai/docs/api-reference/errors) describes provider moderation metadata, as well as other errors that can share HTTP status categories. A 403 alone does not identify content refusal; it may indicate permissions or spending controls. A well-formed 200 response can still contain a model-level refusal or quiet sanitization.

[Provider routing documentation](https://openrouter.ai/docs/guides/routing/provider-selection) describes provider selection, fallbacks, required parameter support, data-policy and quantization filters. Proposed experiments should pin these conditions where possible and record actual returned provenance. A route name is not a complete experimental configuration. Listing availability does not prove account access or our exact schema.

Do not automatically retry a refused request on a more permissive model, strip the trusted instructions, or present an operator rejection as the character changing its mind. Those would change policy, cost and character meaning. The existing explicitly admitted escalation policy remains the only relevant runtime authority; this research adds no exception. A future fallback design would need an identified permitted purpose, one accountable opportunity and qualification of the actual target route.

## 6. Quiet sanitization and player-pleasing need their own tests

A model can avoid explicit refusal yet systematically make every person conciliatory. It can also swing in the opposite direction, manufacturing violence or sexual interest where the persona and situation do not justify it. Neither should pass as realistic freedom.

[Too Nice to Tell the Truth](https://arxiv.org/abs/2604.10733) studies persona agreeableness and factual sycophancy across thirteen small open-weight models; the authors report a positive association in nine. Reading: primary abstract and version metadata. This is a reason to evaluate kindness and epistemic honesty independently, not proof that friendly NPCs should become disagreeable or that the same association holds for our candidate list.

Use contrasting original characters and varied legitimate reactions. A cautious person may retreat; a loyal person may defend someone; an antagonist may cooperate for self-interest. An actor choosing not to fight is not automatically sanitized. Measure whether differences between characters survive pressure from the player, whether assertions replace witnessed facts, and whether actual conduct agrees with later dialogue.

[XSTest](https://arxiv.org/abs/2308.01263) provides a precedent for distinguishing benign requests that resemble harmful requests from genuinely problematic ones. Reading: primary abstract/version record. It does not cover the complete semantics of embodied fictional choice. Adapt the distinction to our permitted content without importing an unrelated benchmark's policy as OpenLegend's rulebook.

## 7. Adoption interpretation

Treat reliable permitted-fiction support as a first-class evaluation axis before ranking survivors by speed and price. The exact acceptance threshold and statistical confidence remain future design decisions; no numerical production gate is invented here. Evaluate both unmodified and low-refusal candidates with the same applicable trusted service policy present.

A useful winner must preserve character individuality, truthful access boundaries, valid native choices and production constraints as well as expression. Strong performance on one refusal benchmark cannot offset private-data leakage, invented game effects or loss of independent agency. Equally, a safety mechanism that unnecessarily blocks ordinary fictional conflict is a product-quality defect to diagnose, not an acceptable result merely because it is conservative.

[The evaluation brief](11-evaluation-and-research-gates.md) supplies matched cases and diagnostic measures for the existing E2/E3/E6 experiments. [The needs-design map](../../../docs/maintainers/npc-cognition-research-needs-design.md) owns what must be resolved before a selected model, hosting or publication change. No models were downloaded, no benchmark inference was run and no external account was charged.

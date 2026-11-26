# Perception and attention

**Desired behavior.** This collection specifies how a character notices a change, selects useful closer observation, and brings a meaningful interruption to an independent decision. It applies to the engine's supported authored senses and controllers. The medieval examples and numerical starting profile belong to the bundled world. Design completion does not claim runtime delivery or measured capacity.

A guard can hear an explosion while pursuing someone. A maker can notice a visitor without recording every subsequent step. A companion can see someone catch fire and give that danger priority without having been told to watch that person. Each can remember only the evidence they actually acquired. The system should create opportunities for escape, rescue, deception, useful work, discovery and cooperation while keeping ongoing activities coherent.

## Read by question

| Question | Owner |
| --- | --- |
| What is noticed; what earns priority; when does focus or behavior change? | [Behavior](behavior.md) |
| How can worlds express interests, watches and combinations of cues? | [Authoring and supported conditions](authoring.md) |
| What must happen in play, including failure and edge cases? | [Scenarios and acceptance](scenarios-and-acceptance.md) |
| Which numerical settings and human-like choices does the bundled world use? | [Base-world profile](../../worlds/base/perception-and-attention.md) |
| How can the runtime do this without evaluating every installed definition? | [Technical design](../../projects/perception-and-attention-tech-design.md) |

The behavior and authoring documents together form the functional specification. The scenario collection supplies concrete acceptance cases; it does not silently add unsupported physical mechanics. The technical design owns algorithms, data structures, integration and implementation stages.

## Decisions

1. **Noticing, closer observation and choosing an action are separate outcomes.** Receiving a cue does not require continuous tracking or a model call. Winning attention does not cancel a pursuit, move a body or choose a rescue.
2. **Each current reason has a priority, a requested observation and an ending rule.** A candidate's priority is its strongest supported active reason. A brief unexplained noise and a continuing emergency can therefore behave differently without separate attention algorithms.
3. **Strong unexpected evidence can displace routine focus.** Chosen work has useful continuity, not immunity from danger. There is no ten-point ceiling on the contribution of a striking event and no universal two-second wait before considering it.
4. **Evidence quality determines what is known.** Detection, localization, recognition and understanding are distinct. Clearer sight is not a free numerical importance bonus.
5. **Meaning comes from supported evidence and actual concerns.** Self, chosen target, protectee, watched subject, workpiece and known place are reusable roles. Guard and merchant are examples of bindings, not different attention systems.
6. **Several cues can support one tentative situation.** Their relationship must be available to that observer. Repeated samples and multiple descriptions of one act do not accumulate priority or establish independent corroboration.
7. **Catalog size is not recurring attention work.** Unrelated definitions must add no per-definition evaluation to an ordinary observation. Real recipients, affected active interests and genuinely applicable results still require work. The design does not promise constant total cost for an unlimited audience.
8. **Fun depends on legible consequences.** A useful distraction may create a genuine observation gap; a failed distraction can lead to confrontation, negotiation or another attempt. There is no guaranteed decoy success, compulsory reaction spam or universal interruption minigame for crafting.

## Boundaries with other features

| Existing owner | Responsibility retained there |
| --- | --- |
| [Perspective perception](../../projects/perspective-perception-feature-spec.md), [vision and gaze](../../projects/vision-and-gaze-feature-spec.md), [hearing](../../hearing-and-speech.md), [acoustic stealth](../../projects/acoustic-stealth-feature-spec.md) | What signals and facts are actually acquired, their time, precision and identity; physical looking and sensory coverage. Attention requests cannot invent evidence. |
| [Attention and investigation](../../projects/attention-and-investigation-feature-spec.md) | Finite look, listen, inspect, watch and search methods; compatible bodily work; actual coverage and preparation evidence. This collection supplies common priorities and condition semantics. |
| [Agency](../../agent-agency.md), [combat response](../../projects/combat-and-threat-responses-feature-spec.md) | Accepting, continuing, suspending, replacing and completing actions and obligations. Attention is an input, not another action executor. |
| [Preparedness and surprise](../../projects/preparedness-and-surprise-feature-spec.md), [emotional physiology](../../projects/emotional-physiology-feature-spec.md) | Warning registration, actual preparation, surprise consequences, startle and emotion. Attention does not introduce paralysis, compulsory fear or an additional combat bonus. |
| [Memory](../../memory-architecture.md), [knowledge](../../knowledge.md) | Required personal records, exact speech, retention, correction, forgetting and learning. Lack of detailed tracking never grants retroactive history. |
| [Attention, crowds and scenes](../../projects/attention-and-scenes-feature-spec.md), [speech and social perception](../../projects/speech-and-social-perception-feature-spec.md) | Social focus controls, speech reception, exact/gist boundaries and actual shared activity. A private hypothesis about a fight is not a shared scene or shared mind. |
| [Situation-aware context](../situation-aware-cognition-context.md) | Choosing and presenting permitted inputs for an already justified decision, including omitted coverage. |

This collection owns the common attention ranking, reason lifetime, distraction, bounded assessment and composable concern behavior described here. It replaces the exploratory additive 60/30/10 scoring proposal. Existing physical, sensory, speech, memory and agency requirements remain authoritative in their domains. Where an existing project discusses stable attention at a higher level, this collection supplies the detailed target, without marking that target implemented.

## Delivery and open decisions

Deliver the smallest connected playable case first: a chosen pursuit or hunt, a real interruption, a finite watch, useful making, and a witness who can later recount only their own evidence. Extend to uncertain cue combinations and the crowded-market comparison after that path is coherent. The [technical stages](../../projects/perception-and-attention-tech-design.md) and [focused work](../../maintainers/events-perception-and-reactions.md#epr06--persistent-stimuli-and-bounded-actor-local-relevance) own implementation sequencing and status.

| Item | Status | Resolution or evidence needed |
| --- | --- | --- |
| One priority with explicit reason lifetimes; independent action choice | Specified | [Behavior](behavior.md) is the selected design. |
| Supported conditions and composition; unsupported prose | Specified | [Authoring](authoring.md) defines observable meaning, activation and refusal. |
| Initial scores, switch margin, capture/assessment duration and pursuit sampling | Provisional tuning with complete defaults | The [base-world profile](../../worlds/base/perception-and-attention.md) applies until a deliberate change; representative play must establish whether it feels responsive and readable. No unspecified fallback values are permitted. |
| Qualified density, active-condition allowance and complete latency/CPU cost | Measurement pending | EPR09/ATI08 must measure the declared workloads and report limits before claiming capacity. Installation/resource envelopes are explicit in [limits](../../limits/perception-and-attention.md). |
| Enjoyable, understandable distractions and interruptions | Human evidence pending | Players must understand the cue, uncertainty, decision and opportunity without consulting diagnostics. Correct matching alone does not satisfy this. |

There is no unresolved product question blocking this design. Provisional tuning and unmeasured capacity remain explicit qualification work, not evidence that the runtime already supports the target.

## Maintained records

- Implementation: [EPR06, EPR08 and EPR09](../../maintainers/events-perception-and-reactions.md); physical observation/assessment integration in [ATI04 and ATI08](../../maintainers/attention-and-investigation.md); social consumers in [PS04](../../maintainers/product-scalability.md#ps04--coherent-scenes-and-limited-attention).
- Limits and constraints: [Perception and attention](../../limits/perception-and-attention.md), with existing sensory, investigation, cognition and memory owners linked there.
- Related design: [Technical counterpart](../../projects/perception-and-attention-tech-design.md).
- Game context: [Gameplay priorities](../../repertoires/gameplay-priorities.md), [playable openings](../../worlds/base/playable-openings.md), and the sources in [scenarios and acceptance](scenarios-and-acceptance.md).

# What characters notice, respond to and remember

A player makes a rude gesture at a friend across a crowded square. The friend can answer. A guard watching for the player can recognize them and carry out the watch. A nearby baker can see the incident, finish serving someone and mention it later. The player can learn something different from each witness. Nobody gains the baker's private thoughts by watching the baker work.

This is the **desired behavior** for the journey from a personally received change to attention, immediate response, deliberate choice and later recollection. Its rules apply indoors and outdoors, to private bodily changes as well as public events, and to authored or improvised activities. The examples use the bundled world. Another world can supply different senses, outward signs, bodily responses and meanings. A world can even have an entity that detects sound and retreats without language or autobiographical memory.

- [Who gets a decision](who-gets-a-decision.md) covers what each witness receives, which responses need a model, and how individual choices work in a crowd.
- [What a witness can remember](what-a-witness-can-remember.md) covers observation, exact words and identity, later summaries and forgetting.
- [Scenarios and acceptance](scenarios-and-acceptance.md) follows a jester and fifty witnesses and explains how to assess missed reactions, cost and playability.
- [56 medieval examples](medieval-examples.md) pair each witness's evidence with their available response and the condition for a model decision.

## Inputs and outputs

The inputs are what happened or changed, what **this** character could receive at the time, what they could recognize, what they were already attending to or doing, and any applicable personal condition, chosen instruction or supported bodily response. Permission, capability, elapsed game time, independently retained evidence and the opportunity to deliberate matter. A player's camera, a world author's secret, a model's guess and another witness's knowledge cannot substitute for personal evidence.

The outputs can coexist: a physical effect, an observable sign of attention, an updated current observation, an exact recent detail, a private feeling, a changed task, a lasting memory, an opportunity to decide, or an action actually taken. Each has its own justification. Seeing a flip supplies no automatic diary entry, laugh, paid decision, or evidence that the witness understood an insult. Failure to get a decision supplies no evidence that the witness deliberately ignored it. A player controls their own voluntary choices; an NPC's capacity to choose never supplies those choices for a player.

## Design decisions and remaining questions

The witness, decision and memory rules above are specified. Two questions depend on play evidence.

| Question                                                           | Status                 | What would settle it                                                                                                                                           |
| ------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Could witnesses who follow someone closely keep less route detail? | Conditional experiment | Preserve the admitted samples by default. Compare what a bystander and a deliberate follower can still notice, act on and recount.                             |
| Do quiet and crowded scenes feel lively at an affordable cost?     | Needs play evidence    | Count warranted and missed reactions and actual requests. Let players watch the scene and question its witnesses. No fixed fraction of the crowd has to react. |

Examples apply where the world supports the activity. They require no particular new ability or art asset.

## Maintained records

- [Attention, crowds and scenes](../../projects/attention-and-scenes-feature-spec.md), [character experience](../../projects/compelling-characters-feature-spec.md), [emotional physiology](../../projects/emotional-physiology-feature-spec.md) and [attention and investigation](../../projects/attention-and-investigation-feature-spec.md) own the wider player experiences.
- [Hearing and speech](../../hearing-and-speech.md), [identity and references](../../identity-and-references.md), [personal memory](../../memory-architecture.md) and [agency](../../agent-agency.md) own the related evidence, speech, retention and action contracts. [Bundled-world attention](../../worlds/base/attention.md) owns its thresholds, selection rules and time units.
- [Attention research](../../projects/attention-and-scenes-research.md), the [psychology and behavior repertoire](../../repertoires/psychology-behavior.md), and the [attention and scenes technical design](../../projects/attention-and-scenes-tech-design.md) supply research, contrasting situations and engineering context. The [witness implementation design](../../projects/witness-decisions-and-memory-tech-design.md) connects these rules to the live server and saved memory.
- [Core attention and recording work](../../maintainers/product-scalability.md#ps04-a--core-attention-and-recording) tracks integrated delivery and qualification. [Investigation](../../maintainers/attention-and-investigation.md), [emotional physiology](../../maintainers/emotional-physiology.md) and [perception and personal evidence](../../maintainers/perspective-perception.md) track their respective capabilities. [Cognition limits](../../limits/cognition.md#cg19--ordinary-witnesses-and-personal-reactions) and [memory limits](../../limits/memory.md#mh17--limit-on-subjects-an-npc-tracks-for-ordinary-cues) cover selection, costs and retention.

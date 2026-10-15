# Versu — coordinated social life without surrendering individual choice

**Coverage: social AI, continuity, interpretation and authoring cost only. Reviewed October 14, 2026.** Topic-only dossier for the Versu interactive-fiction system and its documented episodes, not a full-game research completion or current product-availability claim.

[Main NPC guide](../synthesis/characters-companions-and-relationships.md) · [The Sims](the-sims.md)

## Architecture and its acknowledged limits

Evans and Short describe concurrent social practices that offer contextually relevant actions while individual characters select among them. A shared dinner, conversation and flirtation can provide different opportunities at once. Selection is short-horizon and utility-based, not an unrestricted long-term planner. The implementation evaluates consequences through reversible operations rather than copying the entire simulated world for each candidate. [V1, sections 3–8]

The paper's limitations are particularly relevant: tuning hundreds of desires is difficult; represented beliefs have expressiveness restrictions; participants share the practice's state rather than maintaining potentially divergent understandings of it. A dominating practice can suppress too much: discovering a body should not suppress grieving along with unrelated flirtation. These are admitted limitations, not solved features. [V1, section 13]

The conversation account separately describes topical continuity, turn-taking, interruptible norms and evaluations supported by remembered reasons. It distinguishes an utterance from the different interpretations characters may choose. Violating a norm remains possible and can itself receive a response. The article also notes that permitting several salient topics produced more fluid conversations than forcing one topic at a time. [V2]

## The strongest transfer: coordinate opportunities, not compulsory responses

OpenLegend needs a way for shared activity to remain coherent without making everyone a puppet of the activity. A meal, outing or game can supply common context and feasible next steps. It should not decide that a person accepts an invitation, forgives an insult or wants to continue.

The distinction also reduces a false choice between an entirely scripted conversation and a completely unstructured stream of generated text. Some structure can preserve who was addressed, what was asked, which terms were offered and which actions actually occurred. Generative interpretation can remain open where it adds value.

The danger is turning every social situation into another large authored subsystem. A narrow shared agreement and actual participant evidence may be sufficient. Reuse existing communication, action and memory owners before introducing an all-encompassing social ontology. Research inspiration is not a mandate to reproduce Versu's language or utility model.

## A complete hypothetical episode

Three people agree to share a meal after work. One arrives late and offers an explanation. The others know the arrival time and what was said; they do not automatically know whether the explanation is true. One may accept it, another may remember an earlier missed appointment, and a third may prefer to enjoy the meal without investigating.

Native execution can carry the chosen meal preparation and serving forward. The late arrival need not cancel every physical task. But the reply, revised expectation and decision to wait are personal choices. Food consumed and possessions exchanged become actual consequences; private interpretations do not silently overwrite those facts.

Later, the late participant follows through on another agreement. That experience may change how the earlier incident is remembered. It should not erase the earlier delay or force identical forgiveness across participants. A routine can resume without requiring either a dramatic rupture or a generated argument at every encounter.

## What not to import unchanged

**Do not assume a shared social model means shared knowledge.** Two people can disagree about what was promised or whose turn it is. The engine can retain the actual utterance and agreement while their beliefs diverge. A globally correct social record should not be passed into every mind as personal certainty.

**Do not rank all norms as physical prohibitions.** A rude interruption may be possible; an impossible reach is a different kind of failure. A person's preference for courtesy can influence choice without making discourtesy mechanically unavailable to everyone.

**Do not use universal crisis suppression.** A dramatic event may change which opportunities deserve attention, but sadness, practical help, disbelief or even inappropriate behavior can remain meaningful possibilities. An emergency category should not prescribe one emotional response.

**Do not simulate hypothetical outcomes by mutating the live world.** Reversible local evaluation can be useful in a suitable deterministic sandbox. External calls, disclosure, spending and actual committed history must not be accidentally exercised by a planner exploring a possibility. The transfer is to investigate bounded consequence estimation, not to add a rollback mechanism across every subsystem.

## Evaluation and source boundary

A useful future comparison would ask whether shared structure improves continuity and reduces repeated interpretation without reducing independent refusals or divergent beliefs. Inspect what happens after an interruption, a changed agreement and a quiet successful gathering. Authoring and debugging time belong beside runtime cost; fewer model calls alone may hide a large rules-maintenance burden.

**V1.** Richard Evans and Emily Short, [The AI Architecture of Versu](https://versu.com/wp-content/uploads/2014/05/versu.pdf), author-hosted paper. Architecture, action selection, social practices and limitations reviewed; PDF pages 8 and 34 inspected visually. The separate 100-page Praxis slide deck was not used as if fully reviewed.

**V2.** Emily Short and Richard Evans, [Versu: Conversation Implementation](https://emshort.blog/2013/02/26/versu-conversation-implementation/), February 26, 2013. Main technical article reviewed, not its entire comment discussion.

No code audit, playtest, controlled player study, throughput measurement or full-game completion is claimed. These findings authorize no change to OpenLegend's social rules.

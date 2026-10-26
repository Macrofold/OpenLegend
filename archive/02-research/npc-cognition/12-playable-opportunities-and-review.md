# NPC cognition and worthwhile play

**October 20, 2026 — research hypotheses, not selected features or measured player outcomes.** [Gameplay priorities](../../../docs/repertoires/gameplay-priorities.md) and [compelling characters](../../../docs/projects/compelling-characters-feature-spec.md) own the game goals. This research asks how cognition can support them; [evaluation](11-evaluation-and-research-gates.md) owns comparison methods.

OpenLegend's opportunity is more than unlimited dialogue: freely expressed intentions, independent people and practical invention can have understandable, lasting consequences in a physical world. Technical reliability supports that promise but does not establish enjoyment. Pleasant company, humor and a beautiful shared experience can also matter without a mechanical reward.

<a id="2-positive-opportunities-to-carry-forward"></a>

## Opportunities to investigate

These are hypothetical experience families, not scripted outcomes or additions to first-playable scope. Use supported mechanics for early studies and identify missing dependencies explicitly.

| Opportunity                     | Potential value                                                                               | Player's meaningful role                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| An expedition companion         | Useful observations, competent voluntary help, disagreement about risk and later recollection | Choose a destination, prepare, contribute and decide whose advice to trust.           |
| Negotiation with stakes         | Another person's interests enable a different outcome, including refusal                      | Offer, concede, reveal, risk or pursue another route.                                 |
| Inventing and learning together | A new supported tool or method earns a practical response and another use                     | Propose, experiment and evaluate tradeoffs rather than watch an NPC solve everything. |
| Shared history                  | A past outing, rescue or jointly useful object matters in a later encounter                   | Revisit, repair a relationship, try again or move on without compulsory upkeep.       |
| Humor and quiet company         | Characterful timing and performance make ordinary activity enjoyable                          | Choose attention, conversation or solitude.                                           |
| Local social consequences       | Witnessed events and attributed retellings affect later independent judgments                 | Influence a world without controlling every relationship or becoming its sole focus.  |
| Differing expertise             | People notice different possibilities and admit uncertainty                                   | Investigate and interpret rather than receive universal hints.                        |

A small connected activity can test several of these benefits without a new framework. It remains a partial study, not acceptance of the complete first-playable game.

## Principles for applying the research

**Author opportunities and motives, not successful decision scripts.** Useful resources, attainable ambitions, contrasting interests and things worth noticing matter as much as model capacity. Supply relevant positive experiences and ordinary interests, not only threats and failures. Event-driven cognition need not mean speech-only or danger-only cognition. Preserve the [character-authorship boundary](../../../docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality).

**Keep invention distinct from option selection.** A scorer can only choose supplied alternatives; accurate selection does not demonstrate a useful new idea. Compare discovering known capabilities, choosing an action and proposing a novel supported method through the existing invention path. Do not force novelty or let a novel sentence create an unauthorized effect.

**Let competence enrich the player's role.** Fluid follow-through can support cooperation; perfect foreknowledge, automatic victories and universal agreement can remove mastery and choice. Use authored ability, limited knowledge and actual world rules for fallibility—not model errors or network delay. Delegation should be an option, not an agent playing while the human watches.

**Separate reality, knowledge, belief and speech.** A mistaken belief can fit limited evidence, and a character may knowingly lie. Neither permits native history to invent a completed action. A false utterance alone does not establish whether the cause was deception, stale information or model error; do not invent deceptive intent afterward to excuse a failure. Likewise, experience-supported growth and compromise differ from unexplained personality drift.

**Make freedom usable and expression worthwhile.** Natural language should not require elaborate prompt-writing for ordinary play. Familiar controls, readable consequences and intelligible alternatives can coexist with open speech. Brief exchanges suit danger; sought-out stories can be longer. Voice, humor and comfortable silence have value independent of reasoning quality. Isolate components for diagnosis, then judge the whole encounter, retaining useful text-only play.

**Make surprises intelligible without forcing drama.** Initiative is valuable when it reveals an interest, changes an activity or broadens a choice the player can respond to. Random obstruction and effect-free novelty are not durable depth. Success and peace need not trigger manufactured setbacks. Consider repeat value after the player learns an efficient approach, not only the first surprising exchange.

<a id="4-additional-primary-evidence-opportunities-as-well-as-warnings"></a>

## Primary evidence and limits

These sources motivate questions rather than establish a universally best NPC architecture. None was reproduced here.

| Source                                                                                                                                            | Relevant evidence                                                                                                                                       | Limits of this reading                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Comme il Faut](https://ojs.aaai.org/index.php/AIIDE/article/view/12454) and [Prom Week](https://ojs.aaai.org/index.php/AIIDE/article/view/12662) | Social knowledge and relationships can produce playable choices and consequences, not just dialogue flavor.                                             | Primary abstracts; not a code audit. Authored norms remain world-specific.                                                                                      |
| [Versu](https://ieeexplore.ieee.org/document/6648395/)                                                                                            | Social practices offer possibilities while autonomous agents choose actions.                                                                            | Primary abstract; online 2013, journal issue 2014. A precedent for authored situations, not a proposal to replace OpenLegend's agency.                          |
| [Open-Ended NPC Dialogue Favors Casual Players](https://ieeexplore.ieee.org/abstract/document/11114150), CoG 2025                                 | A 64-participant pilot comparing static, rephrased, hybrid and open dialogue reports engagement benefits, especially for casual players.                | Publisher abstract. Conversation length is not proof of lasting enjoyment or better physical gameplay.                                                          |
| [The Double-Edged Sword of Open-Ended Interaction](https://arxiv.org/abs/2604.10107), 2026                                                        | A 130-participant prototype study reports greater autonomy and cognitive load, usability/trust costs and no significant overall-experience improvement. | Primary abstract. Different prototypes, participants and measures prevent pooling it with the preceding study as one verdict.                                   |
| [Symbolically Scaffolded Play](https://arxiv.org/html/2510.25820v1), 2025                                                                         | A small human pilot found no reliable experience difference; separate synthetic evaluation suggests role-specific effects of constraints.               | HTML framing/study descriptions; manuscript contains template placeholders. Tentative evidence, not human proof that JSON or retrieval helps or harms all NPCs. |

## Applying the evidence

The [current model inventory's application guide](../../../research/ai-models/README.md#choose-candidates-for-a-worthwhile-encounter) connects these opportunities to contemporary candidates and existing production owners. Its small panel narrows a selected question without requiring every interesting checkpoint to be tried.

Choose an activity and ask what the player can now do, understand, enjoy or care about. Compare the candidate with the current experience and an adequate simple/authored diagnostic baseline where useful; label scripted baselines honestly, since they cannot qualify independent behavior. Engineering checks, character reviewers and actual players answer different questions.

Observe recognizable individual differences, useful contributions, understandable consequences, enjoyable exchanges, person-specific recall, wording effort, frustration and voluntary preference to interact again. Include repeat play after novelty fades. Session length, output volume and emotional dependence are not substitutes for value.

A concrete new opportunity can justify a scoped exploratory study even when no deployed feature is broken. That does not waive existing adoption or external-player release requirements. A narrow play study can accompany model screening when its real prerequisites allow it; neither requires trying every checkpoint or building a perfect voice platform first. Use the [existing playtest plan](../../../docs/projects/first-playable-playtest-plan.md) and [needs-design map](../../../docs/maintainers/npc-cognition-research-needs-design.md), not a separate roadmap.

# From capable NPCs to a game worth playing

**October 20, 2026. Status: critical research synthesis and proposed player-experience investigations; no new gameplay policy, implementation or measured player result.** Mike asked whether the complete architecture/model research serves a compelling, unique and fun OpenLegend, not merely avoidance of technical mistakes. This document records the resulting perspective and supporting research. The [source-request record](../../00-source/npc-cognition-research-followup.md) preserves the conversation; [needs-design](../../../docs/maintainers/npc-cognition-research-needs-design.md) owns outstanding preparation.

## 1. Review verdict

The existing packet is a useful technical foundation: the Kevin source reconstruction, Mantella context analysis, broad model panel, low-refusal distinctions and source qualifications should be retained. Its weakness was emphasis. It devoted more attention to preventing hallucinations, leakage, refusals and wasted inference than to the experiences those protections should make possible. Reliable infrastructure is necessary, but a resident who passes every correctness check can still be dull, unhelpful or exhausting to play with.

The governing goal already exists in [gameplay priorities](../../../docs/repertoires/gameplay-priorities.md): a rewarding survival-adventure with practical invention, independent people, useful cooperation, danger, a worthwhile home and remembered consequences. [Compelling characters](../../../docs/projects/compelling-characters-feature-spec.md) adds ordinary pleasure, initiative, humor, disagreement and lives alongside the player's. This review applies those goals; it does not replace them with a conversational-agent benchmark or a mandatory social-drama game.

**Proposed research thesis:** OpenLegend's distinguishing opportunity is not unlimited NPC dialogue. It is that freely expressed intentions, independent people and practical invention can produce understandable, lasting consequences in a shared physical world. Conversation can help the player do, discover, decide, create or care about something. Pleasant company and a funny exchange can also be worthwhile without an equipment reward.

The demos show attractive combinations of responsiveness, expressiveness and contextual interaction. They do not establish production robustness. Both observations matter: preserve the aspiration rather than reducing an inspiring demonstration to its bugs.

## 2. Positive opportunities to carry forward

The following are hypothetical experience families, not scripted acceptance answers or claims of delivered features. Early studies should use supported actions and identify any missing dependency. A selected capability may require design; the entire family does not become first-playable scope.

| Opportunity | What could make it rewarding | Cognitive/technical contribution | What the player still owns |
| --- | --- | --- | --- |
| A companion during a real expedition | Someone notices a useful detail, disagrees about a risk, contributes competently and remembers how the trip went | Permitted perception, timely voluntary intervention, finite native work and later recall | Destination, preparation, their own execution, whether to trust advice or continue together |
| Negotiation with actual stakes | Understanding a person's interests opens a different route through a dispute, trade or request; persuasion may also fail | Distinct motives, evidence-sensitive judgment and actual admitted consequences | What to offer, concede, reveal, risk or refuse; another viable route need not be another conversation |
| Inventing and learning together | A resident can engage with a genuinely new supported tool or method, notice its use and respond differently afterward | Creative proposal plus native feasibility, preserved invention knowledge and experience | The idea, experiment, tradeoff and meaningful participation; NPC competence must not solve every challenge automatically |
| Shared history attached to people, places and things | A previous rescue, failed outing or jointly useful object changes a later encounter in a way the player recognizes | Relevant episodic recall, source attribution and independent interpretation | Whether to revisit, repair a relationship, try again or move on; no compulsory nostalgia or upkeep |
| Humor, warmth, friction and quiet company | Brief, well-timed exchanges and recognizable performances make ordinary work pleasant; silence can be comfortable | Character voice, attention, expression and optional lawful audio | Attention and boundaries; the player is not obliged to entertain or reassure a constantly needy companion |
| Local social consequences beyond the current speaker | An actual witnessed event or attributed retelling affects a later person's judgment and creates new choices | Individual knowledge and genuine communication, not an omniscient shared prompt | Influence rather than control; the player need not be the center of every relationship |
| Discovery through differing expertise and beliefs | A knowledgeable maker and an uncertain newcomer notice different possibilities, including an idea absent from a fixed menu | Authored/learned knowledge, uncertainty, useful questions and supported novel proposals | Investigation and interpretation; neither universal hints nor arbitrary ignorance should replace discovery |

These opportunities can combine without a new framework. A short journey involving a useful invention, one companion and a consequential disagreement may reveal more than a large town full of eloquent NPCs. That is a proposed study shape, not a reduction of the accepted whole-game target.

## 3. Design perspectives that prevent technically correct but weak play

### Author possibilities and motives, not successful decision scripts

A world needs things worth noticing, meaningful resources, attainable ambitions, contrasting people and opportunities to act. More capable models cannot make an empty action catalogue interesting. Conversely, prescribing that a particular character always helps, betrays or proposes the next quest would defeat the independent choice we are trying to investigate. Reuse the [authorship boundary](../../../docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality).

The positive use of context is to give a person reasons, understanding and opportunities, not merely to constrain errors. Relevant skill, a remembered shared success, an unfinished interest or a pleasant place can matter as much as a threat or failed task. Event-driven cognition must not be misread as speech-only or danger-only cognition: existing opportunities for changing interests and self-initiated consideration need their own qualification.

### Bounded selection is not the ceiling on creativity

A decision scorer can only choose among the supplied alternatives. Excellent selection accuracy cannot establish that the character can think of a useful alternative the catalogue omitted. Retain the distinction between discovering known capabilities, choosing an offered action and proposing a novel supported method through the existing invention path. A novel sentence does not itself authorize a new effect.

Investigate a genuinely useful proposal alongside the cheapest adequate ordinary route. Do not force novelty, hide a viable known method or add another generative call before every routine choice. The valuable question is whether the player gains an interesting option, not how many new recipes or thoughts were generated.

### Competence should create room for play, not remove it

Fluid movement and competent follow-through can make cooperation satisfying. Perfect aim, perfect foreknowledge, automatic task completion and universal agreement can instead remove risk, mastery and the player's role. Model failure and network delay are not good substitutes for intentional game difficulty. Character ability, imperfect knowledge and the world's actual rules should explain fallibility.

A useful NPC can execute something they chose while the player still supplies direction, judgment, craftsmanship or a consequential contribution. Delegation should be an option, not the only sensible way to play. Distinguish assistance from an agent playing the game while the human watches. Existing combat and activity authority remains unchanged.

### Coherence is not omniscience, honesty or immutability

Keep four things separate: what actually happened, what this person could know, what they believe, and what they choose to say. A mistaken belief can be coherent with limited evidence. A character may knowingly lie. An internal record that falsely treats an uncompleted delivery as completed is a different failure.

The Skyrim character denying an ongoing attack is therefore a diagnostic example, not sufficient proof of one specific cause. Without the actual context and evidence of intended deception, it could reflect missing or stale information, model error, or an intentional lie. Do not reward a hallucination by inventing deceptive intent afterward; do not penalize established deliberate deception as a grounding failure merely because the utterance is false. Evaluate the available evidence, the character's conduct and subsequent consequences separately.

Stable characterization also permits growth, compromise and surprise supported by experience. Maximizing consistency with the initial seed could erase the project's ambition for people who develop. Tests should distinguish unexplained drift from meaningful change, without inventing a new personality-transformation system.

### Make freedom usable without requiring prompt-writing skill

Natural language should let a player express a meaningful intention, not require elaborate instructions to perform an ordinary action. Concrete opportunities, familiar controls and readable consequences can coexist with open speech. A failed negotiation should leave intelligible possibilities, not a loop of guessing the magic wording. The appropriate amount of conversation varies by activity and player.

Preserve both constructive resistance and practical pacing. Someone can decline for understandable reasons without every exchange becoming an argument. Brevity is useful under danger; an unhurried story or elaborate performance can be enjoyable when sought. Neither shortest output nor longest engagement is a universal quality target.

### Expression is real product value

Text-only comparisons isolate reasoning and grounding; they are not a verdict that vocal performance, timing or style is superficial. A well-timed joke or expressive voice can be part of what makes a person enjoyable. Evaluate the integrated encounter after the isolated comparisons. Keep text-only play useful and do not require an additional media system before testing character value.

### Surprise needs consequences and room to respond

A surprising initiative is valuable when the player can understand enough of its cause and meaning to respond. Novel dialogue without consequence may be entertaining once; random obstruction may just be friction. Track whether a proposed surprise broadens a choice, reveals an interest, changes an activity or creates a memorable moment. Success and peace may remain successful and peaceful; do not manufacture setbacks to keep a drama engine busy.

## 4. Additional primary evidence: opportunities as well as warnings

These sources sharpen the product questions. They do not establish that their mechanisms should be imported wholesale, that their characters are independent LLM minds, or that their results generalize to OpenLegend.

**Playable relationships.** [Comme il Faut](https://ojs.aaai.org/index.php/AIIDE/article/view/12454) describes reusable representations of social knowledge and interactions; [Prom Week](https://ojs.aaai.org/index.php/AIIDE/article/view/12662) makes social relationships playable. Our inference is to investigate relationships that change available choices and consequences, rather than only generate flavorful dialogue. Authored social norms would remain world-specific. Reading depth: primary abstracts, not a code or full-paper audit.

**Coordinated situations without controlling every person.** [Versu](https://ieeexplore.ieee.org/document/6648395/) describes social practices offering possibilities while autonomous agents choose how to act. Our inference is that authoring a situation can support coherent group play without scripting each resident's response. This is a historical architecture precedent, not a proposal to replace existing OpenLegend agency with its utility system. Reading depth: primary abstract; online publication October 2013, journal issue June 2014.

**Positive player evidence.** [Open-Ended NPC Dialogue Favors Casual Players](https://ieeexplore.ieee.org/abstract/document/11114150), CoG 2025, reports a 64-participant pilot comparing static, rephrased, hybrid and open dialogue. Its reported engagement advantages, particularly for casual players, support testing natural conversation as a real benefit. Longer conversation alone is not proof of lasting enjoyment or better physical gameplay. Reading depth: publisher abstract; not independently reproduced.

**A contrary result matters too.** [The Double-Edged Sword of Open-Ended Interaction](https://arxiv.org/abs/2604.10107), 2026, reports a 130-participant prototype study with increased cognitive load and perceived autonomy but no statistically significant overall-experience improvement, plus usability/trust costs. Different prototypes, participants and measures prevent pooling this with the previous study as one verdict. Reading depth: primary abstract; no independent replication. The practical question is which activities benefit from free dialogue and which should remain straightforward.

**Constraints have role-specific costs.** [Symbolically Scaffolded Play](https://arxiv.org/html/2510.25820v1), October 2025, reports a small human pilot without reliable experience differences, followed by a separate synthetic evaluation suggesting different effects for a quest-giver and suspects. It is not human proof that JSON or retrieval makes all NPCs better or worse. The inspected manuscript also contains publication-template placeholders. Use it as a tentative prompt to test improvisation and clarity by situation, never as grounds to weaken privacy, native authority or service policy. Reading depth: primary HTML framing and study descriptions; no replication.

The enduring lesson across old social simulation and newer language systems is an opportunity, not a mandatory architecture: give people meaningful possibilities, let their differences matter, and let players act on the results.

## 5. Add player-value evidence to the technical comparison

The [evaluation brief](11-evaluation-and-research-gates.md) owns methodology and the model panel. Add an experience question before choosing models: what can the player now do, understand, enjoy or care about that was previously missing? A prototype can investigate a positive opportunity even when no current implementation is broken.

For a selected short encounter, observe whether players recognize meaningful differences between residents; understand a consequential response; use an NPC contribution in their own plan; try an idea the game genuinely supports; enjoy an exchange or quiet companionship; and later recall a person-specific event. Ask what felt frustrating, what required unnecessary wording, and whether they would choose that person or activity again. These are proposed observations, not numerical release gates or proof from one enthusiastic tester.

Compare a candidate to the current implementation and a strong simple or authored baseline where feasible. When practical, separate free-form wording from consequential action by comparing equivalent scene opportunities. An authored or replayed diagnostic baseline must be labeled as such; it cannot certify autonomous NPC behavior. Use independent scenarios and actual native outcomes for that question.

Use complementary evidence: engineering checks protect truth and authority; blinded reviewers assess character coherence; players assess agency, enjoyment and usability in an actual activity. No one score substitutes for the others. Include experienced players who learn an effective tactic, not only first-time novelty. Look for repeat value in mastery, expression, changing circumstances and relationships, not compulsory session length or emotional dependence.

A narrow early play study and an offline model comparison can proceed in parallel when their actual prerequisites allow it. Do not wait for a universal benchmark, a perfect mind or a complete voice platform before learning whether a promising interaction is worth building. Equally, diagnostic enthusiasm cannot bypass the existing external-player release requirements.

## 6. Research selection and useful stopping points

Choose the smallest experiment that can change a decision. A specific broken behavior is one reason; a concrete new player opportunity is another. More expensive memory, image, audio or training mechanisms should have a stated expected benefit, an adequate simpler comparator and bounded scope, but need not wait for a production incident before exploratory study.

Keep the large model catalogue as a source of alternatives. It is not an obligation to run every checkpoint or implement every architecture. Screen a small set appropriate to the experience, retain current and stock-parent controls, then examine the promising candidates in depth. Same-parent comparisons reduce confounding; training data, templates and other changes still prevent attributing every improvement specifically to refusal reduction.

Preserve independent character interpretation and actual effects as architectural constraints. Do not add a shared omniscient director, automatic retaliation, compulsory narration or a new memory database merely because another system uses one. A better implementation might use fewer model calls and more carefully authored opportunities, or a more capable model where it materially improves a player's choices.

## 7. What this review changes and keeps

**Keep:** all eleven prior dossiers, their source qualifications, the broad stock/creative/low-refusal panel, actor-scoped perception, native execution, exact outcomes, and separately measured speech and cognition. No evidence-based model winner exists yet.

**Change the emphasis:** evaluate the positive experience alongside failures; treat expression as genuine value; distinguish intentional deception and evidence-based growth from technical mistakes; keep creative invention and player agency visible; and permit opportunity-led exploration rather than requiring a defect before every experiment.

**Remove from the recommendations, not from the evidence:** the implication that another amusing exchange is inherently low-value, that all spoken claims must be true, or that technical qualification alone selects the most fun game. Retain historical source findings and useful limitations. A watchlist is not a priority list, a current-design boundary is not a permanent ban on a separately selected extension, and caveats should guide decisions rather than extinguish ambition.

The [needs-design map](../../../docs/maintainers/npc-cognition-research-needs-design.md) identifies what still requires preparation, implementation or testing through existing owners. This review does not create full feature/technical designs, run experiments, change release policy or claim that hypothetical scenes already work.

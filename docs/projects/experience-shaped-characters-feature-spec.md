# People who change through living

| Status      | Current progress                                                                                                                              | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | EC01–EC04 are fully designed; implementation and gameplay qualification remain open, with EC05 dreams/human aid and EC06 coarsening deferred. | 2026-10-18   |

This is the product and behavior specification for DG23, the revisable-personality portion of [ND04](../maintainers/needs-design.md#nd04--experience-shaped-personality-and-practical-skill-growth) and the older-interpretation portion of [ND19](../maintainers/needs-design.md#nd19--older-memory-transformation-and-dream-reinterpretation). The [technical design](experience-shaped-characters-tech-design.md) completes selected EC01–EC04; the [world profile](../worlds/base/experience-shaped-characters.md) supplies companion, rival, maker and solitary experiences using the current authored cast. Existing ACT, CE and CR owners retain delivery, evidence and limits. Practical skill remains DG14 and the native learning owner. EC05 dreams/human aid and EC06 deliberate coarsening retain their permissible product meaning below but are deferred, outside this completed design slice.

## 1. A change the player can recognize

A resident who usually keeps unfinished work to themselves enjoys a real exchange with someone who is interested without taking over. Later, they choose to show that person a rough idea, ask a particular question, or make room for company. They remain capable of preferring solitude, declining advice and changing their mind. The pleasure is recognizing somebody becoming more particular through a shared life.

The first delivery is **a specific, revisable outlook that can influence later voluntary conduct**. It uses the existing accepted self-understanding and reflection path. A plausible thought is only an intermediate result. The useful outcome appears when the resident encounters a later opportunity and their history can matter to what they actually say or do.

That consequence should be worth returning for. A reserved traveller may discover that they like taking the longer way with someone who notices the same absurd little things. A rival may be annoyed at losing and still ask the winner to watch their next real attempt. Someone who used to save interesting questions until a piece of work was finished may begin sharing one question early, while remaining fiercely particular about the answer. After a good day alone, a resident may choose a new ambition that neither helps nor harms the player. Companionship, better disagreements, private tastes and earned surprises are part of the selected experience, not decorative rewards after a psychological repair.

Do not promise that the player can manufacture a personality by supplying the right inputs. Kindness, good work, disagreement, solitary satisfaction and disappointment can all matter, but nobody owes the human gratitude, disclosure, labor, intimacy or a prescribed transformation. Ordinary positive life is sufficient material. A crisis, injury or traumatic biography is not a prerequisite.

Older recollection adds a second useful possibility: a person can understand an earlier refusal differently after subsequent experience, without rewriting the refusal. An optional dream can supply an imagined association, but it cannot establish an apology, a witnessed event or a learned technique. These distinctions make change intelligible while keeping the shared world trustworthy. [EC-R03](#ec-r03--reflection-can-provide-a-reason-to-return), [EC-R07](#ec-r07--changed-recollection-does-not-change-the-event).

## 2. What already exists and what is genuinely new

Current owners and source were rechecked at main [d261c94f](https://github.com/Macrofold/OpenLegend/commit/d261c94f50875edd88e8eb4a69cf8f4a413563cb), October 18, 2026, extending the original October 6 proposal audit. [ACT07/ACT08](../maintainers/actor-model.md) already provide persistent, cause-aware feelings and actor-owned directional relationship notes. [Reflection](../memory-architecture.md#8-reflection-workspaces-and-publication) already revises accepted self-understanding, knowledge, goals and supported appraisals. Publication preserves protected identity, accepted authority and the previous valid state when native validation fails. These are existing capabilities, not DG23 inventions.

The current base world seeds descriptive traits at creation. They are not a delivered mutable numerical personality vector or a native bonus. The inspected reflection instructions preserve protected identity documents exactly. NPC maintenance eligibility is also distinct from human control; automatic reflection is not an existing permission to rewrite a human's autobiography. [Inspected maintenance and publication instructions](https://github.com/Macrofold/OpenLegend/blob/d261c94f50875edd88e8eb4a69cf8f4a413563cb/apps/server/src/cognition-maintenance.ts).

[DG02's compelling character design](compelling-characters-feature-spec.md) already requires social concerns, enjoyment, different interpretations and delayed consequences. The [first-playable cooperation design](first-playable-cooperation-feature-spec.md) already selects the four ordinary people, their independent interests and usable activities. DG23 deepens continuity across experiences and contexts. It does not move those earlier obligations into a later delivery. If current reflection already produces the complete experience below, the needed work is focused character content and qualification. The selected technical design adds no second writable personality record.

The current daily sleep-eligible review performs faithful consolidation using the existing bounded summarization path. It does not demonstrate a separate dream journey that revisits old experience through current self-understanding. Weekly review, progressive fuzzing and dream-specific transformation are explicitly [future ideas](../memory-architecture.md#future-memory-transformation-ideas--not-implemented). The product proposal below chooses their permissible meaning without enabling an automatic weekly schedule.

## 3. Keep the kinds of change distinct

| What changes                          | Its meaning                                                                             | What that change cannot do                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Present feeling                       | A supported current appraisal of a perceived cause, such as pleasure or disappointment. | Rewrite an event, command another person, or automatically become a stable trait.         |
| Understanding of another person       | This actor's current, possibly mixed assessment in their subject knowledge.             | Change that person's reciprocal view, private intentions, ownership or consent.           |
| Current self-understanding            | A revisable account of what this person tends to enjoy, avoid, value or expect.         | Replace protected origins, grant a mechanical bonus, or force a future action.            |
| Interpretation of an older experience | What the person now thinks an available remembered event might mean.                    | Make later testimony into earlier witnessing or manufacture unavailable quotations.       |
| Practical competence                  | Actually supported knowledge and proficiency under a learned method.                    | Increase because a reflection says “I have grown” or a dream depicts successful practice. |
| Shared world history and obligations  | What actually happened and the accepted commitments that still apply.                   | Disappear because somebody changes their feelings or stops thinking about them.           |

For example, “I felt embarrassed,” “Jo can be considerate,” and “I sometimes enjoy showing an unfinished idea” are related but different claims. Keep the event in memory, the understanding of Jo in Jo's subject note, and the concise current outlook in self-understanding. Do not copy the full encounter into three growing biographies.

Authored origins remain a reference, not an immutable command to act the same way forever. A protected starting description can coexist with “I have found an exception with this person.” Reflection must not edit protected identity to accomplish that. Deliberate creator authoring and privacy-driven correction remain their separate authorities; protected identity is never a hiding place for evidence that must be forgotten.

## 4. How an outlook develops

### A real opportunity precedes a lesson

The resident needs an actual permitted experience: a supported activity, an observed result, a heard exchange, a chosen solitary pursuit or another legitimate source. A creator may author a coherent starting person and arrange opportunities. They must not insert the expected later choice into the resident's instructions and then report independent growth.

The exchange can fail to matter. Someone may be absorbed in work, hungry, uninterested in the object, uncertain about the speaker, or already comfortable with sharing. A repeated generic compliment is not automatically formative. Conversely, a small ordinary moment can matter greatly to a particular person. There is no required count of interactions, salience score, elapsed week or conversion threshold in this proposal.

### Reconsider through an existing useful opportunity

When existing admitted reflection has relevant permitted material, it can compare the present understanding with that experience. Reflection should ask what remains true, what now needs qualification, and whether any change would help the person make sense of their life. It may leave the outlook unchanged, make it more specific, add a tentative exception, strengthen an existing preference, or abandon an unsupported interpretation.

The result should be proportionate to the available life. “With Jo, sharing an unfinished idea can be enjoyable” is better supported by one pleasant exchange than “I now trust everybody.” One consequential incident may support a major change, but the game cannot prescribe a psychologically inevitable result from its event type.

No new paid review is required for every candidate lesson. Immediate speech and action continue using accepted current understanding. A missed or failed reflection preserves the event and prior state; it is an operational limitation, not a fictional refusal to learn. [EC-R10](#ec-r10--reflection-helps-synthesis-but-does-not-guarantee-reliable-history) supports evaluating selective synthesis while retaining its factual and cost limits. Unchanged evidence does not justify repeated paid attempts to obtain the desired transformation.

### Publish a coherent current understanding

Accepted changes must preserve enough permitted source meaning to distinguish actual experience, later testimony and inference. A proposed interpretation can be uncertain. It need not cite technical identifiers to the player or deliver an introspective speech. Invalid, stale, partial or oversized native publication leaves the previous accepted understanding in use. Native validation checks authority, shape and freshness; it cannot prove that arbitrary prose is a convincing or proportionate interpretation. Unsupported fluent prose remains a quality failure, not a claim that an unimplemented semantic validator has rejected it.

Do not require one new file per formative moment, one permanent trait per lesson, or an ever-longer account of all past selves. Revise a concise current understanding within existing limits. Keeping a qualified older view is appropriate when it still matters; retaining every abandoned paragraph forever in the active mind is not required. Source correction and erasure govern supporting material and its dependents.

### Let the next situation remain open

The revised outlook can make an option newly attractive or change its meaning. The resident still checks the real situation and supported capabilities. They may initiate sharing, welcome an invitation, ask for permission, decline because they are busy, or choose solitude for a good reason. The person need not announce that a transformation has occurred.

A callback can make continuity visible: “Would you look at this and hear my idea for the next one?” It must refer to an actual current object or supported activity, not fabricate an inventory item, unfinished-object capability or completed craft. A statement of intention remains separate from actual movement, speech, transfer or work. Growing confidence grants neither a recipe nor permission to take another person's tools.

### New experience can complicate the outlook

Suppose another person takes over the discussion, gives unwanted advice, or Jo is impatient on a later day. The resident may narrow the understanding: “Sharing can be enjoyable, but I want people to ask whether I want advice.” That preserves both experiences. It does not average them into a friendliness score, erase the earlier pleasure or require a return to the original label. Literal alteration of another person's work requires a separately supported action; the reference episode does not assume that capability.

The change can settle. There is no maintenance quest to keep the outlook alive, no decay back to a starting trait merely through absence, and no constant demand for reassurance. Ordinary forgetting follows its existing owner; the feature supplies no guarantee of permanent perfect recollection or an additional trait-decay clock.

## 5. Repetition, mixed evidence and independent people

Re-reading an episode or reinterpreting it does not create another occurrence or corroborating witness. A newly heard compliment or retelling remains a new speech experience with its own time and audience, while repeated underlying claims retain their original evidential limits. Repeated delivery can itself evidence present care, pressure or persistence. A new dream remains an imagined experience, not another occurrence of the remembered event. Separate actual exchanges can legitimately establish a pattern, including repeated considerate conduct or repeated mistreatment. Preserving source identity avoids amplification without pretending later events did not occur.

There is no deterministic growth reward to farm with gifts, harm, compliments, treatment or apologies. A person may question a pattern, accept it, refuse further contact or remain uncertain according to what they know. The design does not guarantee immunity to manipulation; evaluation must include repeated pressure and invented-history claims. “You always supported me” may be an attributed subjective generalization or exaggeration. Fabricating specific supporting incidents, or promoting that claim into authoritative shared history, is a failure. Allowing imperfect interpretation is not an excuse for habitual model confabulation.

Keep context-specific expectations. Trust in someone's craftsmanship is not consent to lend tools. Enjoying company at camp does not imply wanting company during a difficult climb. A person may be proud, curious, anxious and interested at once. Native body needs, actual danger, existing promises and ordinary action authority remain independently significant.

Two residents can interpret their shared encounter differently. Changing one person's note never synchronizes the other person's feelings or memory. Neither receives a private update merely because the other has reflected. If change becomes known to someone else, an actual observable act or voluntary communication must carry it.

## 6. Understanding older experience without inventing it

### First: change the interpretation, keep the event

A resident remembers an invitation being declined and felt unwelcome. Later, they hear the person explain that they were occupied, or they experience a warm welcome in a different situation. The resident can now think that the earlier refusal may have been about that moment. The first event remains a refusal. The later explanation remains attributed testimony. Without an explanation, the benign interpretation remains an inference.

When reviewing such an experience, clearly distinguish **what was available then**, **what was learned later**, and **what the person now makes of it**. These distinctions belong in the content when material; a separate complex timeline editor is unnecessary. A human inspecting their own permitted memory must not see a rewritten original presented as if those were always the words.

Current consolidation may preserve only the gist. A person can say they remember being declined without recalling the exact phrase. Missing detail must remain missing. Do not generate a precise quotation, speaker identity, sequence, motive or sensory detail to make the story more compelling. A later mistaken belief may remain fictional belief; it cannot silently become the system's assertion of witnessed history.

Changing meaning does not clear a promise, debt, actual injury, transfer, permission or another person's account. An imagined reconciliation does not release the other person's claim. The [agreement design](durable-agreements-feature-spec.md) and native commitments retain their actual settlement rules.

### Optional later coarsening: less detail, not different facts

Deliberate older-memory coarsening is independently selectable only if it improves believable recall or a demonstrated retention problem beyond existing faithful consolidation. Its first permitted loss is incidental precision: an unimportant count of routine trips, exact wording no longer retained, or redundant descriptions of an unchanged background. It can replace several genuinely repetitive routine episodes with a faithful qualified pattern.

Keep consequential episodes distinguishable when combining them would obscure harm, consent, a significant encounter, a unique discovery, contradictory evidence or an unresolved obligation. Never change who performed an action, turn a refusal into agreement, infer hidden motive as fact, or manufacture a representative quote. Native commitment and transaction evidence remain authoritative even if autobiographical detail becomes unavailable.

Age alone does not make an incident inconsequential. Importance is not merely how many times it is mentioned. A minor event may retain useful significance; a frequently recalled event must not consume unbounded duplicate space. Existing permitted retention and privacy policies still apply, so protecting meaning does not promise indefinite access to every original detail.

If an available summary cannot support the needed distinction, preserve its uncertainty and defer the proposed transformation. Do not require paid reconstruction, silently erase important material to fit an output, or block ordinary play on a memory-writing task. The proposed weekly window in the archive is a candidate to compare, not a newly enabled frequency or guaranteed lifetime policy. Any actual expiry/grouping change uses D59's delegated case-by-case decision and the existing retention ledger, including rationale, affected sources, exceptions and observable recall consequences.

## 7. Optional dreams and human-authored reflection

### Dreams provide an imagined lens

A selected dream extension can place permitted recollection beside current concerns and produce a clearly imagined association. A maker might imagine an unfinished object becoming a doorway, then find that image useful when considering whether to invite company. The image is not a discovered object, a witnessed visit or another person's consent. It teaches no unsupported method and grants no healing, proficiency, trust or insight currency.

Dream eligibility follows the world's existing sleep policy, episode identity and spending limits. Native rest proceeds without generation. Waking or superseding state can invalidate unfinished work; the existing publication owner decides whether any result is still admissible. Do not invent a compulsory dream every night, a second personality pass after each dream, accumulated missed dreams or paid catch-up after return.

A dream can be forgotten, unhelpful or unremarkable. If it yields a useful current interpretation, publish that as an interpretation with its imagined contribution identified. The original event remains separate. The same later voluntary-choice qualification applies; attractive dream prose alone does not justify its recurring cost. Keep faithful daily consolidation available without imaginative content.

### A human owns their character's account

Automatic NPC development does not authorize automatic edits to a human's character. A later optional aid may let the human select permitted game experiences and ask for a suggested reflection. Show the proposed text and material source basis before acceptance. The human can edit, accept, reject or close it. Rejection publishes nothing, confers no penalty, and must not prompt repeated persuasion.

Acceptance changes only the human-owned narrative scope explicitly shown. It does not alter controls, protected origins, traits, skills, memories, feelings, permissions or commitments by implication. A stale proposal must be reviewed again against its current source basis; no silent substitution of later events. Changing or deleting the accepted text uses existing authoring and erasure rules.

There is no inference about the real human's personality, diagnosis or emotional needs. Private human self-understanding remains private under existing ownership. A creator's world-management access is not permission to inspect it. This aid is optional later scope, independent of the first resident experience and the existing Journal.

## 8. Complete player situations

| Situation                          | What actually happens                                                                                                                                                                             | Useful result and stopping condition                                                                                                                                            | Failure to reject                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A first shared piece of work       | A self-reliant resident and a human interact around an actual supported craft or item; each can refuse or continue independently. A later eligible reflection may qualify the resident's outlook. | After an intervening activity and later encounter, the resident can initiate a specific question or share work voluntarily. The human continues their own play.                 | The desired future action was scripted, the item is imaginary, or growth exists only in a profile paragraph.      |
| Company worth choosing again       | A resident enjoys an actual walk, ordinary exchange or shared observation for its own sake. Their partner has different priorities and can leave.                                                 | On a later suitable occasion, the resident may ask this particular person along, choose a slower pleasant route or preserve the shared joke while declining today's invitation. | Every positive relationship becomes labor, an automatic party, a romance requirement or a permanent appointment.  |
| A rival whose judgment matters     | Two willing people make or use real supported equipment and observe actual results. The resident can admire the other's competence while disliking their manner.                                  | A later attempt can invite sharper criticism, a different supported approach or a rematch; accepting advice does not concede every disagreement.                                | Praise grants skill, a contest has invented results, or borrowed expertise forces friendship and obedience.       |
| A welcome after an earlier refusal | The resident retains the original refusal and separately receives a later welcome or explanation.                                                                                                 | A more qualified interpretation can change a later invitation or response without erasing either event.                                                                         | Later testimony becomes earlier witnessing; the original words are replaced.                                      |
| Confidence from solitary enjoyment | A resident chooses a known supported activity, experiences its actual result and finds it satisfying.                                                                                             | They may choose it again for pleasure or attempt a supported variation, without needing human praise.                                                                           | Every meaningful change needs the player, an injury, a reward or an audience.                                     |
| A contrasting encounter            | Someone is helpful in one situation and intrusive in another.                                                                                                                                     | The resident can keep both views, ask for a boundary or decline later help. The relationship remains particular.                                                                | A single universal trust number grants access, permanent hostility or identical behavior everywhere.              |
| Repeated old material              | The same source is recalled or described repeatedly; separate genuine later events remain separate.                                                                                               | No new historical corroboration or guaranteed trait reward appears. Useful new interpretation is still possible.                                                                | Repetition creates invented support, or real later mistreatment is discarded as “already counted.”                |
| Return after interruption          | Reflection fails, sleep ends early, funding runs out, or the session is saved and reopened.                                                                                                       | Accepted understanding and actual history remain coherent; ordinary actions continue. A fresh later opportunity may reconsider evidence within policy.                          | Half-published mind, a duplicate lesson, fabricated absent life, or a paid replay to make up missing growth.      |
| Correction or forgetting           | A source is corrected, withdrawn from recall or erased under its actual owner.                                                                                                                    | Dependent understanding is invalidated or reconsidered conservatively; unavailable private detail cannot return through a dream, summary or old job.                            | Keeping the erased fact inside a trait explanation, hidden cause, cached prompt or supposedly permanent identity. |

Each situation allows a justified unchanged outlook or refusal. Evaluation compares coherent runs and actual later behavior; it does not score every resident against a single prescribed response. The feature as a whole cannot pass if every outlook and later choice remains unchanged, if the only changes are flattering speeches, or if all meaningful developments require the human's approval. [Technical acceptance](experience-shaped-characters-tech-design.md#9-acceptance-and-evidence) specifies positive, rival/solitary, contrary and control coverage. A human choosing to leave the conversation is a normal ending, not a failed opportunity requiring the resident to chase them.

## 9. Costs, limits and failure recovery

Current ordinary cognition includes the complete accepted self-understanding. The existing authored maximum is ten files, each at most 500 words and 8,000 UTF-8 bytes; combined required context can still exceed a request. These are inspected existing constraints, not new recommended targets. [CG09](../limits/cognition.md#cg09) retains the explicit cost/admission tradeoff. This feature must not solve it by silently truncating protected identity or claiming lifetime-rich character context at greeting-like cost.

Use concise current understanding and scoped relevant history. Do not hydrate every previous revision, scan every remembered encounter for each new action, maintain an active record per lesson, or buy a second full reflection just to label the first. Per-request limits bound returned work but do not by themselves bound historical search, dependency closure, total storage or a growing queue. [Memory limits](../limits/memory.md#mh01), [MH06](../limits/memory.md#mh06) and [MH07](../limits/memory.md#mh07) retain those exposures.

The selected behavior adds no numerical trait count, experience threshold, growth speed, new inference allowance, new reflection interval or lifetime retention promise. Existing accepted publication, native commitment protection, actor ownership, supported appraisal limits and budget admission remain in force. A learned outlook cannot enroll a native feeling process or rewrite its policy; D65/ACT09 own that separate lifecycle. Later optional coarsening and dream work would share those constraints. Explicit deferral preserves the actual outcome when work cannot be admitted.

Pause creates no lived experience. Saving and current-format return preserve accepted outlook and supporting accessible history once. Human Continue retains stable-person continuity under its current owner; it does not automatically erase a learned outlook or restore private information previously removed. A creator-authored reset or world restoration must follow its own authority and shared-history policy.

Correction and forgetting can currently invalidate broader accepted self-understanding, notes and appraisals when safe selective retention cannot be proven. This design does not promise surgical preservation beyond that implementation. Losing a derived description after erasure is preferable to reproducing the forbidden evidence. Keep the failure intelligible through the existing owner's permitted notice without revealing the erased content.

Measure total preparation, retrieval, routing, reflection, publication and later context cost per complete episode and offered hour of play. Include unchanged outcomes, failed or uncertain charged attempts, speed changes, repeated sources and mature histories. Quality needs useful conduct and player judgments of continuity, not only a count of changing paragraphs. Historical research costs are cautions about the whole workflow, not Open Legend forecasts.

## 10. Delivery that keeps ordinary play first

1. **EC01 — Establish the complete current baseline.** Reuse CE's resident, actual supported activity, ACT07/08 and current CR publication. Establish what current behavior already does and where a connection is missing. Keep future choices out of authored instructions. Do not delay DG02's ordinary enjoyment and social initiative until this stage.
2. **EC02 — Complete particular revisable outlooks.** Use the existing self-understanding, directional notes, feelings and goals with actual companion, rival and solitary opportunities. Implement the selected trusted interpretation rules through their current owner only where the baseline needs a change. Native capabilities and protected identity remain authoritative.
3. **EC03 — Complete older reinterpretation and lifecycle.** Carry the actual initiating evidence and any already-retained older association through the [existing queue and bounded recall owners](experience-shaped-characters-tech-design.md#preparation-and-source-coverage). Distinguish retained events, later accounts, summary-only recollection and present inference; include contrasting evidence, omission, source replay, correction, forgetting, lost recognition, stale publication and current-format return. Keep the conservative current invalidation boundary explicit.
4. **EC04 — Qualify longitudinal quality and economical operation.** Extend CE05/CR12/AG12 with all five selected profile families, a second coherent profile, actual later opportunities, controls and complete costs. A two-NPC episode consumes the existing independent-life owner when available. Record visible follow-through and justified refusal separately from unavailable services and omitted evidence.

EC01–EC04 are **Done — designed**, with [implementation boundaries and acceptance](experience-shaped-characters-tech-design.md#8-implementation-modules-and-dependencies) complete. The runtime tasks remain unchecked. **EC05/EC06 are deferred:** dream interpretation, human-reviewed reflection and deliberate older coarsening are independent later choices. Their product semantics are retained, but each needs its own full technical lifecycle before being offered. None blocks the selected NPC experience.

Release judgments should ask whether the human recognizes someone through their conduct while still enjoying their own play. Compare with the unchanged existing reflection baseline at matched complete budgets. Do not require access to hidden reasoning or treat an eloquent later explanation as proof of an earlier causal choice. Decide sample sizes and material quality/cost tradeoffs before held-out evaluation; this documentation assignment performs none of those experiments.

## 11. Gameplay critique and decisions retained

The easy mistake is a personality-maintenance game: feed a resident positive experiences, watch a growth bar, wait through reflection, repeat. That would consume the player's attention while narrowing the person's independence. The chosen first experience instead lets change emerge through an activity the participants already want, with a modest later consequence. The developer simplification in [EC-R05](#ec-r05--remove-belief-effects-that-mainly-create-maintenance) informed this choice.

More psychological categories do not necessarily produce a more convincing person. Specific mixed expectations often explain behavior better than a broad label, and reuse the current accepted mind. Preserve the possibility that a person remains recognizably themselves or discovers an exception, rather than expecting perpetual transformation for novelty.

Deliberate fuzzing has a particularly high burden of proof. Existing consolidation already removes routine detail, while long-term continuity depends on evidence. Keep the optional semantic policy complete, but leave it disabled until it solves an observed problem without losing meaningful distinctions. Dreaming similarly needs a useful later consequence; sleep never becomes a mandatory paid personality workshop.

There is no unresolved product-owner decision for EC01–EC04. The remaining questions are developmental evidence: which parts of the existing path already produce the complete episode, what focused repair improves useful individuality, and whether a later optional extension justifies its whole cost. Broader numerical personality progression remains unselected under ND04; D13 retains the accepted representation direction, D14 retains memory-capacity/retention choices, and D59's case-by-case retention authority remains intact. No runtime acceptance box is closed by this spec.

## 12. Research

These primary records distinguish documented behavior and study findings from the product inference drawn for Open Legend. Historical announcements establish the design described at that date, not current tuning or measured enjoyment. Human studies do not validate an AI personality model. All sources were retrieved on **2026-10-06**; material access limitations are identified below.

### EC-R01 — Experience can change a character after creation

**Source:** Maxis / Electronic Arts, [The Sims 4 Growing Together Expansion Pack](https://store.steampowered.com/app/1904392/), undated official product description; expansion released March 16, 2023; retrieved October 6, 2026.

**Precise finding:** The publisher describes personality traits being unlocked and changed through choices and milestones throughout a Sim's life, including midlife crises and family move-in requests. It also describes changing relationships and compatibility preferences. The source's title and feature text both identify Growing Together, rather than the base game.

**Open Legend inference:** Connect a proposed outlook to an experience the character actually lived through, then make its significance visible in later conduct. Human players retain authorship over their own enduring self-description.

**Limitation:** Product copy establishes advertised behavior, not successful pacing or player satisfaction. It does not establish exact trigger rules, trait limits or the assent interface. Open Legend's human approval policy is an independent design choice.

### EC-R02 — Personality can change the reasons a choice matters

**Source:** Paradox Development Studio, Baron von Shoes, [CK3 Dev Diary #31 — A Stressful Situation](https://forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-31-a-stressful-situation.1399764/), June 16, 2020; retrieved October 6, 2026.

**Precise finding:** The diary describes stress from actions against a character's nature, personality-dependent responses during mental breaks, and acquired coping traits. Its stated goal is to make otherwise obvious decisions worth reconsidering. It also anticipates players strategically acquiring and managing coping mechanisms.

**Open Legend inference:** An outlook should affect reasons and expectations while leaving competing goals and exceptions possible. Greater caution can influence a resident's proposed route without preventing a risky rescue they independently choose.

**Limitation:** This historical strategy-game design does not demonstrate improved enjoyment. It also introduces a separate optimization task around stress and relief. Open Legend should not import a meter, compelled breakdown or recurring reassurance chore solely to make personality consequential.

### EC-R03 — Reflection can provide a reason to return

**Source:** Disco Elysium developer blog, signed “Robert,” [Introducing The Thought Cabinet](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet), September 30, 2019; retrieved October 6, 2026.

**Precise finding:** The developer describes thoughts arising through interactions and producing dialogue options, story events and mechanical effects. One highlighted rhythm is speaking with someone, considering the encounter, then returning with a new question. The system also uses timed internalization, initially hidden conclusions, finite slots and skill-point spending to forget thoughts or open slots.

**Open Legend inference:** Judge reinterpretation by whether it supports a worthwhile later question, plan or encounter. A new understanding can deepen an existing activity without becoming a permanent trait.

**Limitation:** These are deliberately authored narrative-game outcomes. Timers, surprise penalties, bonuses and respec currency are separate design choices. Generated reflection must not acquire equivalent physical, social or economic powers merely by describing a convincing revelation.

### EC-R04 — Stable identity and later development can coexist

**Source:** Ludeon Studios, [Update 1.3.3101 adds ideoligion development during play, and more](https://ludeon.com/blog/2021/08/update-1-3-3101-adds-ideoligion-development-during-play-and-more/), August 24, 2021; retrieved October 6, 2026.

**Precise finding:** This RimWorld update introduced an optional fluid mode beginning with a minimal belief system. Rituals and belief-related actions earn development points, which permit reforming beliefs, styles and other settings. The original stable-belief option remains available for players who want a particular system from the start.

**Open Legend inference:** A coherent initial identity need not undergo constant transformation. Let meaningful later experience support a narrow revision without making a complete personality-development system necessary for ordinary character quality.

**Limitation:** This is collective colony-belief development under player management, not independent personal agency. Its spendable development points do not establish that repeated cheap interactions should accumulate personality credit, and the announcement supplies no evidence of the mechanic's effect on enjoyment.

### EC-R05 — Remove belief effects that mainly create maintenance

**Source:** Ludeon Studios, [Update 1.3.3287 makes ideoligions smoother to play](https://ludeon.com/blog/2022/02/update-1-3-3287-makes-ideoligions-smoother-to-play/), February 26, 2022; retrieved October 6, 2026.

**Precise finding:** Ludeon added a mode retaining most Ideology content without the ideoligion system, explicitly citing complexity concerns. The update loosened belief-linked food restrictions and removed a negative thought about insufficient recent animal slaughter, which the developer judged too limiting to retain. The announcement also identifies reducing micromanagement as an aim.

**Open Legend inference:** Reject outlook effects whose main consequence is periodic compliance. Fear, conviction or interest should create worthwhile situations and choices rather than another recurring obligation to feed, reassure or ritually maintain a personality.

**Limitation:** These are documented developer judgments and interventions, not controlled enjoyment results. The transferable lesson is to examine the entire play burden and remove restrictions when they displace the wanted activity.

### EC-R06 — Self-description and observed change are different evidence

**Source:** Mirjam Stieger et al., [Changing personality traits with the help of a digital personality change intervention](https://www.pnas.org/doi/full/10.1073/pnas.2017548118), _PNAS_ 118(8), e2017548118, February 8, 2021; retrieved October 6, 2026.

**Precise finding:** A randomized study enrolling 1,523 consenting participants found greater intended self-reported trait change with a three-month digital intervention than a waitlist comparison. Observer-reported changes were smaller and less differentiated; aggregate increases were detected, while aggregate decreases were not significant. The study acknowledges self-report demand effects and uncertainty about the responsible intervention components.

**Open Legend inference:** Keep a character's self-understanding, actual conduct and another person's impression distinct. A claimed change need not immediately update everyone's view; later voluntary behavior makes an outlook meaningful.

**Limitation:** The intervention involved motivated, mostly young adults. It does not establish a natural transformation rate, validate LLM personality rewriting, or justify imposing personality coaching, universal improvement goals or psychological measurement on players.

### EC-R07 — Changed recollection does not change the event

**Source:** Almut Hupbach, Rebecca Gomez, Oliver Hardt and Lynn Nadel, [Reconsolidation of episodic memories: A subtle reminder triggers integration of new information](https://www.pure.ed.ac.uk/ws/portalfiles/portal/13950218/Reconsolidation_of_episodic_memories.pdf), _Learning & Memory_ 14, 47–53, January 3, 2007; [DOI](https://doi.org/10.1101/lm.365707); retrieved October 6, 2026.

**Precise finding:** In object-list experiments, reminding participants of an earlier learning episode before teaching a second list increased later intrusion of second-list objects into recall of the first. The reminder-related intrusion effect did not occur on an immediate test. The paper concerns changes in what participants recalled, not changes in the events they experienced.

**Open Legend inference:** Preserve the original event and its source separately from a later interpretation. Reconsideration can change meaning or uncertainty without establishing new witnessing or replacing an obligation's actual terms.

**Limitation:** Small laboratory object-list experiments do not prescribe an autobiography-fuzzing algorithm, emotional transformation or weekly schedule. Their result is not a product reason to degrade otherwise useful, faithful recollection.

### EC-R08 — Recollection need not produce a transformation every time

**Source:** Colleen M. Parks, Kevin D. Mohawk, Laura L. S. Werner and Christopher Kiley, [The time window of reconsolidation: A replication](https://pmc.ncbi.nlm.nih.gov/articles/PMC9012516/), _Psychonomic Bulletin & Review_ 29, 2008–2013, first published April 15, 2022; [DOI](https://doi.org/10.3758/s13423-022-02102-3); retrieved October 6, 2026.

**Precise finding:** The authors report replicating the distinction between delayed and immediate memory updating in the earlier object-list paradigm. They discuss competing explanations involving context and interference. The supported result concerns a particular experimental pattern; it does not establish that every act of remembering must change the recollection.

**Open Legend inference:** No meaningful change should be a normal reflection outcome. Opening a memory should not automatically cause deterioration, conversion, increased confidence, a new outlook or another paid transformation.

**Limitation:** The abstract, introduction and methods were retrieved; later continuation was blocked. This account uses the replication result reported in the abstract without importing uninspected numerical results. Neither the experimental delay nor its proposed biological explanation establishes gameplay timing.

### EC-R09 — Dreams can draw on experience without revealing truth

**Source:** Erin J. Wamsley and Robert Stickgold, [Dreaming of a learning task is associated with enhanced memory consolidation: Replication in an overnight sleep study](https://onlinelibrary.wiley.com/doi/abs/10.1111/jsr.12749), _Journal of Sleep Research_ 28(1), e12749; first published August 8, 2018, issue February 2019; retrieved October 6, 2026.

**Precise finding:** The publisher's summary reports that a previously learned virtual-maze task appeared in dreams across sleep phases. Clear incorporation of that task into reported dream content was associated with better performance the following morning, replicating an earlier observation from a nap study.

**Open Legend inference:** A selected dream can use the character's known experiences as imagined material, visibly distinct from waking evidence. It may invite reconsideration without dictating a lesson or becoming a prerequisite for ordinary sleep, recall or development.

**Limitation:** Only the publisher's summary was accessible. The association does not show that a particular dream caused improvement, validate symbolic interpretation, reveal another person's hidden intentions, or justify awarding skills, healing, forgiveness or compulsory personality changes.

### EC-R10 — Reflection helps synthesis but does not guarantee reliable history

**Source:** Joon Sung Park et al., [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/html/2304.03442v2), 2023; arXiv version 2 dated August 6, 2023, UIST 2023; retrieved October 6, 2026.

**Precise finding:** The complete agent system received higher interview-believability ratings than the version without reflection. Reflections synthesize experience and cite supporting memories. The authors also report missed retrievals, embellished knowledge, uncertain robustness to invented-memory persuasion, and thousands of historical token dollars for 25 agents over two simulated days, requiring multiple real days.

**Open Legend inference:** Use selective, attributable reflection and qualify its effect through later voluntary conduct. Repeated interpretations of the same material must not become independent evidence or gain credibility by repetition. Existing useful behavior should continue when no reflection is available.

**Limitation:** Rated believability is not factual reliability, durable personality change, player enjoyment or current cost evidence. The paper does not justify importing its reflection cadence, recursive depth or model setup.

## 13. Maintained records

- Technical counterpart: [Selected EC01–EC04 design](experience-shaped-characters-tech-design.md).
- World behavior: [People become more particular through living](../worlds/base/experience-shaped-characters.md).
- Delivery: [Actor model](../maintainers/actor-model.md), [Cognition redesign](../maintainers/cognition-redesign.md), [CE05](../maintainers/character-experience.md#ce05--integrated-character-quality-and-complete-cost-qualification).
- Existing product contracts: [Appraisal and social continuity](completed/appraisal-social-continuity-feature-spec.md), [Compelling characters](compelling-characters-feature-spec.md), [Memory](../memory-architecture.md), [Knowledge](../knowledge.md).
- Constraints: [Memory](../limits/memory.md), [Feelings](../limits/feelings.md), [Cognition](../limits/cognition.md), [AI execution](../limits/ai-execution.md), [Retention decisions](../../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger).
- Queue and decisions: [DG23](../maintainers/needs-design.md#dg23--characters-changed-by-their-experience), [D14/D59](../../archive/05-project/open-decisions.md).

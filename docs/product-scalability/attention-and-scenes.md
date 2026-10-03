# Attention, ongoing agency, and structured scenes

**Status: accepted direction with proposed cognitive and sensory extensions.** [Memory](../memory-architecture.md), [agency](../agent-agency.md), [perception/reactions](../events-perception-and-reactions.md), [hearing](../hearing-and-speech.md), and [conversation](../narration-and-conversations.md) remain the semantic owners of their runtime behavior. This page defines the cross-cutting product contract; it does not claim existing evidence may already be discarded or regrouped arbitrarily.

**October 3 product proposal:** the [detailed attention, crowds and scenes specification](../projects/attention-and-scenes-feature-spec.md) supplies initial scope, player/NPC journeys, research, economic boundaries and acceptance. It proposes stable focus and aggregate activity under current exact-speech rules before a distinct timed-speech stage. These detailed recommendations do not change current hearing or close PS04/PS-D02.

## 1. The cognitive work boundary

Separate a world occurrence, evidence a character can acquire, what it distinguishes, what it attends to, and whether a new decision is needed. None is synonymous with a paid model call or a permanent autobiographical record.

The preferred flow is world activity, sensory grouping and distinguishable sources, limited stable attention, permitted individual/aggregate experience, and bounded reaction opportunities. Scope comes before relevance. Do not let importance, a high model tier, or an urgent campaign bypass privacy or reveal facts the character could not know.

Native continuation and protection can use supported deterministic policies. Existing action selection can still have provider costs even when no generative model is used. Budget complete workflows rather than counting only visible dialogue. Neither a cheap classifier nor a larger language model is an authority over world effects.

## 2. Bounded attention as a world rule

A crowd can remain physically present without becoming hundreds of independent conscious descriptions. A character might follow one nearby conversation, notice a sudden scream, and perceive the surrounding voices as indistinct commotion. The ignored people still emit sound, occupy space, collide, and take actual actions.

Do not implement this as generating detailed context for every object, paying to rank it all, and then retaining a small prefix. Group and reject unnecessary work before expensive per-character processing. Shared spatial groups and sensory fields may help, but a shared source descriptor is not a shared personal interpretation.

The attention policy can consider distinguishability, distance, novelty, goals, current focus, permitted recognition, and observable salience. There is no accepted universal top-X count. An approximate crowd estimate should not turn into an exact census or a roster of hidden enemies. No actor gains knowledge of a private alliance merely because server-side grouping knows its members.

### Stable focus and interruptions

Retain focus long enough to make conversation intelligible. Nearly equal ranking changes should not cause constant switching. Explicitly focusing on a speaker can improve access within the world's actual sensory limits, but cannot hear through an unsupported wall or recover words never perceived.

Urgent effects use supported interruption paths. Being hit is evidence; an unseen attacker deciding to attack is not. Detectable danger can displace optional attention without requiring omniscient preclassification. Attention capacity does not limit physical authority: an unnoticed arrow still hits, a neglected fire still spreads under its rules, and an unconsidered body still blocks a route.

Focus may change what is learned prospectively. Historical partial or unintelligible speech remains partial or unintelligible after attention shifts. Current sensory permission is not a retrospective transcript grant.

## 3. Acoustic grouping

Keep detection, localization, speaker recognition, and linguistic understanding separate. In a room of overlapping voices, the character can hear crowd noise while understanding only selected nearby or distinguishable streams. An aggregate such as "many people are shouting; most words are unintelligible" is legitimate evidence, not a false assertion that ninety speakers made no sound.

Model competing sources through an explicit acoustic policy. Physical overlap needs utterance durations or another deliberately authored overlap rule. Caption reading timers are not acoustic durations. The existing hearing design's uniform background and instantaneous speech must not be advertised as an already implemented dynamic crowd mixer.

Where supported, competing sound energy is aggregated in an appropriate physical representation, not by arithmetically adding decibel numbers. The evaluated foreground source must not count itself as competing noise. The hearing owner retains the exact model, thresholds, and evidence publication; this page does not choose clinical hearing limits or universal human attention capacities.

Do not generate complete hidden transcripts for every ambient NPC just to reduce them to chatter. A world may establish background vocal activity and selected meaningful scene beats without first generating every word. Human messages and foreground accepted NPC utterances still require the applicable current speech/evidence behavior.

## 4. Visual and multimodal grouping

A character might see "a dense crowd approaching the gate; several visible people are armed; Mara is near the front." This combines a group, an observable property, and one recognized individual. Group extent, uncertainty, motion, and distinguished members may be meaningful; exact count, allegiance, motives, and private attributes usually are not automatically available.

Use observer-permitted similarities such as nearby position, shared movement, formation, or visible appearance. A recognized friend can remain individually salient within a crowd. A group splitting, reversing direction, or producing a new threat can create a new meaningful episode without generating one reaction per moving limb.

Different senses can reinforce a conclusion only when their evidence can actually be associated. Seeing lips move does not automatically supply unheard words or recognize an unknown voice. Do not collapse conflicting or uncertain observations into a falsely certain description.

Aggregate evidence must remain traceable enough for correction, revocation, and restoration without requiring permanent detailed memory for every contributing stimulus. Bounded source references and semantic retention must be designed through the memory/perception owners; optimization cannot leave forbidden private details in summaries after access is revoked.

## 5. Crowd behavior without shared personality

Shared movement, listening, applause, and escape behavior can use supported coordinated routines. Individuals keep their own commitments and exceptions. A guard may hold position, someone may distrust the speaker, and another may notice a personal opportunity. Crowd membership is not consent to adopt a collective belief.

Avoid reflexively triggering every listener after every sentence. A queen's speech can have one generated source, relevant heard evidence, a shared ongoing listening situation, and a small number of justified immediate replies. Other listeners may later reflect on what they actually understood. Delayed optional interpretation must not erase a previously accepted obligation or block urgent physical response.

Crowd mode is a declared policy rather than a secret degradation applied when a paying character would otherwise be too expensive. A world can allow attention to become naturally more aggregate as sensory competition increases; arbitrary load-based loss of understood evidence is not the same rule.

## 6. Continuing choices in low-power mode

Retain identity, authored self-understanding, sparse directional relationships, known methods, active intentions, and accepted obligations through the existing owners. Reduced initiative cannot manufacture a new operational goal or overwrite a belief merely to generate an inexpensive routine.

Meaningful changes can still trigger reconsideration. Continuing a supported chosen response may be enough; an unfamiliar dilemma may need generation. A deferred required judgment must remain distinguishable from a deliberate decision to do nothing. Optional reflection is not a prerequisite to a prompt greeting or a native physical action.

Shared model infrastructure does not mean shared memories. Do not allocate a permanently resident heavyweight process per character by semantic necessity, and do not expose other characters' private context just because execution shares resources. Hardware placement is outside this product contract.

## 7. Scenes as bounded interactions

A scene is an actual bounded interaction organized around something being resolved: negotiating a debt, planning a journey, undertaking shared work, or defending a gate. It identifies participants, current evidence, intentions, completed beats, unresolved choices, and the operations it may propose.

Recognize scenes using structural relationships and meaningful changes rather than a continuously paid whole-world bucketing call. One encounter can have linked subscenes; the arrival of a crowd must not turn the entire city into an unbounded prompt. Splitting or merging scenes preserves prior participants, knowledge, commitments, and completed outcomes.

One call may economically resolve a bounded beat. It is not a universal promise. Sensitive independent decisions can require actor-scoped calls; larger conflicts may require several stages. Count validation, memory handling, and continuation in the total cost, not only the apparent single resolution call.

### Independent agency versus authorial direction

Character-led resolution uses legitimately supplied intentions and each actor's permitted knowledge. A joint resolver primarily receives common facts and disclosed choices. Giving it all participants' secrets and instructing it not to leak is not sufficient evidence of independent private agency.

An authorial world may permit a scene director to propose a joint story development. That mode needs explicit authority and characterization limits, including what choices it may author and how private information remains protected. It is not silently equivalent to separate characters each deliberating. Shared scenes involving a human cannot invent that human's consent, intimate actions, spending, or private thoughts.

### Completed beats, not an invented future

An ongoing debt negotiation can commit a request and a response without committing a later agreement. When a player enters, continue from the completed portion. A scene must not have already decided an entire hour of future conversation that the newcomer is now allowed to interrupt.

Every beat passes normal world admission. Prose cannot create goods, spend the same coin twice, assume ownership permission, teach unsupported skills, or treat a proposal as successful execution. Structured obligations, work, resource transfers, and their memories are coupled through the existing semantic owners.

## 8. Precise speech, gist, and later retelling

| Historical evidence                                                                         | Later behavior                                                                                             |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Exact words were generated and retained under applicable recall rules                       | Quote only the words this character may legitimately recall or access                                      |
| A coarse scene established only meaning                                                     | State the gist; a request for verbatim wording can receive an honest admission of imperfect recall         |
| A reconstruction is generated later                                                         | Present it as approximate retelling, not a newly discovered exact transcript                               |
| A recording, oath, passphrase, contract, or perfect-recall mechanic requires exact language | Generate and persist the required words at the relevant occurrence, including in an otherwise coarse scene |

For example: "I do not remember every word. I told him I would give him until Friday if he delivered the timber." This is consistent with gist-only evidence. A plausible newly generated transcript is not stronger historical proof.

Store pivotal exact lines alongside summary beats when useful, without requiring a transcript of all ambient conversation. Memory may include interpretation, uncertainty, or a later changed opinion, but these do not rewrite the original agreement. Character lies remain possible speech, not authoritative historical corrections.

## 9. Quality tiers and socially important characters

Heavily scrutinized characters can have a higher default model-quality tier even for short interactions. A queen's greeting can depend on etiquette, prior promises, political context, personal attitudes, and what the listener knows. Apparent brevity does not prove low consequence.

Combine a character's evaluated baseline with task-specific escalation for complexity or stakes. Role, responsibility, relationship relevance, and available budget may inform this policy. Do not collapse it into one universal importance score that also determines survival protection or permission.

Price and parameter count are not guarantees of consistent characterization. Qualify model changes against voice, instruction adherence, memory use, uncertainty, and actual decisions. Maintain the same authoritative identity and admission rules across model tiers. A more capable provider does not replace checks on effects, privacy, or resources.

An institution can support officials through records, reports, and delegated staff. Distinguish "my steward briefed me" from a personal memory. Officials can have audience queues without depriving ordinary residents of accessible relationships and meaningful interaction.

## 10. Budget, fairness, and failure

Playtime alone cannot cap inference: NPCs can initiate chains, many actors can react, and players can deliberately produce salient noise. Bound admitted scenes, concurrent decisions, reaction propagation, optional initiative, and spending using the existing work/budget owners. Prevent a noisy player from consuming the entire community's meaningful cognition.

On budget exhaustion, preserve necessary evidence and commitments, continue valid native work where possible, and expose unavailable/deferred AI behavior honestly. Do not fabricate a reply, infer deliberate silence, or make a consequential NPC abandon its responsibilities merely because optional reflection was delayed. Any policy that slows new activity is explicit; already-accepted effects retain their rules.

## 11. Qualification examples

Test a noisy room with a focused speaker and an unrelated scream; a moving crowd containing a known friend; an unseen attacker; a real hit outside focus; repeated near-equal salience without attention thrashing; and later recall after a focus change. Verify no hidden names or speech appear in summaries.

Test a gist-only negotiation, an exact oath inside a coarse scene, a human joining midbeat, conflicting participant beliefs, and a secret known to only one character. Test stable characterization across quality tiers and paid-cost accounting through the complete workflow. These are future delivery gates, not claims established by this document.

## Maintained records

- Implementation: [PS01–PS08 delivery tracker](../maintainers/product-scalability.md).
- Limits and constraints: [Product-scalability inventory](../limits/product-scalability.md).
- Related design: [Feature specification](../projects/product-scalability-feature-spec.md) and [technical design](../projects/product-scalability-tech-design.md).
- Unresolved product choices: [Central decision register](../../archive/05-project/open-decisions.md#product-scalability-integration-choices).

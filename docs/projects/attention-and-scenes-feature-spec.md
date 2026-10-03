# Attention, crowds and scenes — product and behavior specification

**Status: proposed detailed behavior, October 3, 2026.** This extends the accepted PS04 direction. Existing hearing evidence and caption behavior remain authoritative until an explicitly scoped new policy is approved and delivered. Technical design, voice-media delivery and implementation are outside this product-only assignment.

## 1. Purpose and recommended experience

A player enters a lively gathering. They can follow a nearby conversation, recognize a friend, notice a sudden disturbance and understand enough of the surroundings to act. They should not receive fifty equally prominent captions or a secret list of every person's intentions. The NPCs need the same distinction between actual surroundings and useful attention. The town should also remain affordable when most of its conversations are peripheral to the current player.

The recommendation is **stable, perspective-correct focus within a continuing environment, with bounded social exchanges that preserve actual completed consequences**. Group sensory activity before expensive interpretation. Keep individually meaningful exceptions. Let ordinary people participate without making every spectator a separate paid commentator. Resolve new choices through each character's permitted knowledge; a shared scene is not permission to merge private minds.

The first useful setting is a busy camp or common room: one foreground conversation, several genuinely active background groups, a known person moving through the gathering, and an interrupting call. The first social scene is a small discussion about a supported shared task or promise. It can progress when unobserved and become interactive when someone joins.

This should improve everyday play, not merely a stress benchmark. The test is whether a player can say what they were following, why an interruption mattered, what they missed and what they can do next. For NPCs, the corresponding test is coherent action and recollection from permitted evidence at a sustainable complete cost.

## 2. Existing commitments and the new proposal

The [attention-and-scene contract](../product-scalability/attention-and-scenes.md) already separates limited attention, aggregate surroundings, independent agency, completed scene exchanges, exact speech and gist. [Hearing](../hearing-and-speech.md) owns actual linguistic evidence; [timed UI](../timed-ui.md) owns reading time; [conversations](../narration-and-conversations.md) owns conversation identity and narration. PS04 is still proposed runtime work.

The current speech occurrence is instantaneous. A lingering caption is not an ongoing sound. This proposal recommends a staged cutover: first stable focus, aggregate nonverbatim background activity and supported scene meaning under existing exact-speech rules; then a separately qualified timed-speech mode for real overlap, late listening and interruption. It never retroactively removes words already perceived under the current contract.

The second mode is described fully in section 7 so its product choices are reviewable now. It is not silently included in the first delivery stage. The current clock continues to govern simulation; changing caption preferences never changes fictional hearing. A future separate conversational clock would require the existing time-policy decision and is not assumed here.

## 3. Distinguish the layers of an event

| Layer                  | Example                                                     | Product consequence                                                       |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Physical occurrence    | A person speaks, a body blocks a doorway, an arrow flies    | Real effects continue even if nobody attends to them                      |
| Detectable evidence    | A listener hears voices through an open entrance            | Detection does not guarantee names, exact location or words               |
| Distinguishable source | A familiar visible speaker can be associated with one voice | Association depends on actual evidence, not server identity               |
| Current focus          | The character follows that speaker                          | Focus favors permitted detail and continuation, not impossible senses     |
| Interpretation         | The character believes the speaker sounds worried           | Interpretation can be mistaken and belongs to that character              |
| New choice             | The character interrupts work to investigate                | A choice needs a reason; observation is not automatically a paid decision |

Human camera position, selected object, keyboard focus and a character's attention are different. Panning the camera is not hearing through a wall. Selecting a caption must not accidentally walk the character. Turning down audio, hiding captions or reading a transcript changes presentation, not the evidence the character acquired.

## 4. Stable attention

### 4.1 What remains in focus

The default is to preserve the current meaningful activity or conversation while it remains distinguishable and relevant. Near-equal changes in distance or salience should not make attention jump between speakers. A recognized friend entering view can be noticed as an additional fact without automatically abandoning the current speaker.

When no deliberate focus exists, use supported evidence, the current activity and meaningful novelty to choose a useful foreground. A character preparing a meal may attend to that work and to someone addressing them. Someone keeping watch may attend to an approach. Authored senses and unusual minds may differ; this is a recommended human-like default, not a universal cognitive law.

Do not choose a universal maximum number of things a mind can notice. The product needs bounded work and intelligible presentation, but a single count would conflate a conversation, a moving crowd, a recognized person and a bodily injury. Qualification should establish supported situations and meaningful limits without pretending that a scientific paper supplies a game-wide attention number.

### 4.2 Explicit player focus

Provide an understandable **Listen to** or equivalent action on a currently distinguishable speaker or conversation. Show the selected subject through the existing interaction language. Provide an equally discoverable way to stop or change focus by keyboard and pointer. A player should not need continuous precise aiming to remain in a conversation.

Focus requests apply prospectively. They cannot reconstruct missed words, identify an unrecognized voice, bypass a supported sensory obstruction or cross an explicit disclosure boundary. Merely intending an otherwise perceptible conversation to be secret does not suppress its evidence: ordinary eavesdropping remains possible under the hearing rules. A wall's visual opacity does not automatically make it an acoustic barrier. If the target becomes unavailable, retain a clear indication that it was lost and permit a sensible new choice. Do not silently switch to a nearby stranger with a similar name.

Attention is not a compulsory emotion or decision for the human player. A danger cue can draw attention and explain an interruption, but does not write the player's speech, choose whom they trust, move them or consent to a shared action. Immediate authored bodily reactions remain their separate supported rules.

### 4.3 When an interruption deserves priority

An actual hit, a nearby intelligible cry for help, a direct address, a relevant change to current work or an urgent permitted alarm can interrupt optional attention. The response depends on supported evidence and the actor's choice. A hidden enemy deciding to attack does not announce itself. An unheard name is not a privileged trigger because the server knows whose name it is.

Use different interruption outcomes. A brief noticed event may leave focus intact. A direct question may invite a turn. A genuine emergency may suspend the current conversation or work. Repeated equivalent alarms become one continuing disturbance; they do not buy unlimited fresh attention or automatically silence all other people forever.

### 4.4 Regaining focus

After an interruption, preserve enough permitted context to resume the original activity if it is still available. A conversation may have moved on, someone may have left, or the character may no longer want to continue. Show the current situation rather than pretending no time passed.

For a human, offer permitted history and a simple way to resume listening. For an NPC, existing memory and activity owners preserve what they actually heard and intended. Neither needs a generated full replay of the missing interval.

## 5. Crowds as observable groups with individual exceptions

### 5.1 Group only what the observer can support

A legitimate impression might be: a dense group moving toward the gate, several visible tools held aloft, and one recognized friend near the front. It must not become an exact census, hidden faction membership, a list of weapons inside clothing or a shared private motive.

Grouping can use permitted proximity, visible motion, formation, common audible activity and actual participation in a known scene. Preserve uncertainty about edges, number and identity. A group splitting or changing direction can be a meaningful new observation without treating every step by every member as a new event.

An aggregate remains related to actual people. Recognizing one person does not reveal the rest. Losing their visibility does not keep tracking their exact position through the crowd. A change in apparent group composition should not rewrite an earlier uncertain account into a retrospectively exact one.

### 5.2 Individuals still act and matter

People in a crowd keep their bodies, possessions, commitments, beliefs and exceptions. A guard can remain at a post; a tired person can sit down; a dissenter can refuse applause. Shared movement or listening supplies a routine, not a collective personality or automatic consent.

Attention cannot suppress collision, damage, theft, resource use or other admitted effects. A person outside conscious focus still occupies the doorway. A fire beyond focus still follows its material rules. The product should make relevant consequences discoverable when they become perceptible, without promising that every hazard will be noticed in advance.

### 5.3 Crowd activity needs an actual cause

Background chatter may be an admitted social activity with participants and a beginning/end, without pre-generating every word. A gathering can therefore produce indistinct vocal activity economically. It cannot sound like a cheering crowd when nobody is cheering, or persist indefinitely after everyone has left.

The same principle applies to visible shared activity. A crowd impression is a compact account of actual supported behavior, not a decoration that secretly changes crowd membership or the world's history. Ambient presentation may be artistically simplified, but knowledge-bearing details must agree with admitted facts.

## 6. Hearing within a crowded environment

### 6.1 Detection, recognition and understanding

A listener may detect a voice without locating it precisely, locate it without identifying the speaker, or identify a speaker without understanding the words. Captions and memory preserve those differences. A label such as unintelligible speech communicates detected sound; inaudible means no sound detected.

Distance, obstruction, authored source behavior, competing activity and current focus may affect understanding where the hearing family supports them. Focusing can help separate a distinguishable stream, but does not create sound or remove a wall. The same encounter must give different listeners appropriately different evidence.

### 6.2 Initial crowd-noise rule

The proposed first stage adds ongoing nonverbatim vocal activity from actual supported background scenes and evaluates exact committed foreground speech against that situation through the hearing owner. Existing exact speech still uses its current event-time contract. Its caption lifetime never contributes to competition.

This is explicitly an authored aggregate-noise model, not a claim that instantaneous text messages now physically overlap. An ambient group must have a supported vocal activity before contributing. A foreground source must not count itself twice, once as individual speech and again as its own competing group. Private group membership cannot leak through an aggregate label.

When a player brings a particular participant into foreground interaction, stop using an incompatible generic vocal contribution for that same person's exact utterance. Preserve already completed gist and the actual shared situation. This change in descriptive detail must not award new words or a different history.

### 6.3 Speech that matters remains exact

Human-authored speech and already committed exact NPC utterances remain exact at their source, subject to each listener's actual fragment. Background speech may retain only meaning where the world did not require exact wording. Do not generate full transcripts merely to discard them.

An oath, passphrase, exact contract, recording or perfect-recall mechanic can require exact source language. The supported family must provide and retain the necessary words when the event occurs. Exact source words do not mean every listener heard them; recognized identity and permitted fragments remain separate.

## 7. Target behavior for timed and interrupted speech

### 7.1 Why this is a separate stage

True overlap and joining halfway through a sentence require a speaking process, which the current instantaneous-speech feature intentionally does not provide. The recommended later stage emits speech in short meaningful phrases over an authored simulation-time interval. It does not simulate a waveform or phoneme-level hearing merely to decide who learned a sentence.

The authoring policy defines the relation between utterance length and speaking duration, supported expressive differences, and how movement or interruption affects delivery. Those are world rules whose exact tuning needs a playable qualification. The underlying simulation clock and speed controls apply consistently to speakers and listeners. Caption reading speed remains a separate real-time presentation preference.

### 7.2 Intended words, spoken words and heard words

A submitted utterance is an intention to speak the admitted content. Only delivered phrases become spoken history. A listener gains only the phrases and fragments they could perceive when delivered. An interruption stops future delivery; it does not erase earlier words. A late listener receives the remaining permitted phrases without an automatically reconstructed beginning.

For the speaker, a sent message can be shown immediately as their submitted utterance, with a clear, restrained indication if delivery was interrupted. Other listeners must not receive unspoken future words as an authoritative transcript. A reply preview or a model's draft is neither speech nor evidence.

If the source's words are changed before delivery, preserve the distinction between a cancelled intention and a new utterance. Once heard, correction is a new speech event under the current correction policy. This does not introduce historical speech editing.

### 7.3 Movement and simultaneous speech

Moving within range changes future phrases only. A speaker crossing behind a supported obstruction may become partial or unintelligible. A listener returning does not recover missed phrases merely because the caption remains visible. Two simultaneous speakers can compete under the actual authored overlap rule; stable focus prevents tiny fluctuations from constantly switching the understood stream.

For humans, pressing Send does not imply another person's turn or consent. Conversation conventions can encourage turn-taking and mark interruption, but cannot prevent an admitted shout merely to preserve a tidy dialogue script. An impatient player can interrupt socially where the world's speech rules allow it; the consequences come from actual heard behavior.

### 7.4 Fast simulation and accessibility

Increasing game speed can create more speech events per real second. Preserve the actual hearing result and use readable captions and history rather than accelerating text beyond the player's reading settings. Do not accumulate an unlimited caption queue. If the offered speed/activity combination cannot remain usable or sustainable, disclose and restrict that combination through the existing time and capacity owners before offering it as supported.

Do not infer that a fast calendar requires more speech, or that pausing captions pauses speakers. The first timed-speech release must explicitly qualify ordinary, fast, paused, hidden-tab and reconnect cases. More elaborate separate dialogue clocks remain a later time-policy choice, not an invisible accessibility side effect.

## 8. Scenes that preserve agency

### 8.1 What a scene is for

A scene is a bounded actual interaction organized around a current matter: discussing a shared task, negotiating a supported obligation, hearing an announcement or responding to a local problem. It gives participants relevant opportunities and preserves completed exchanges. It does not decide the town's next hour in advance.

The first recommended family is discussion of one supported task or existing promise, with a small set of actually present participants. The meaningful outcomes are further questions, a disclosed intention, refusal, a supported accepted commitment, continued discussion or departure. Barter settlement, combat, coercion and new legal institutions require their own supported families; descriptive scene prose does not implement them.

### 8.2 Common situation and private decisions

Characters can share public facts and deliberately disclosed choices while keeping different knowledge, beliefs and aims. A common resolver may coordinate an exchange using those inputs. When a participant must decide using private information, that decision remains scoped to that participant. Telling a shared model everyone's secrets and asking it not to leak is not the default independence policy.

The recommended default is character-led scenes. An explicitly authored dramatic mode may allow a director to propose joint developments within declared characterization and disclosure limits. It must be visibly a different world policy. It still cannot invent human consent, expose ungranted human-private information or execute unsupported effects.

### 8.3 Completed exchanges, not a prewritten ending

A request can be spoken, heard and answered without a final agreement. Each completed exchange becomes part of the actual history. Unresolved choices remain open. If a player enters, the scene continues from that point; it does not reveal a preselected outcome and then pretend the player can change it.

A proposal to carry supplies is not the delivery. An agreed plan is not proof that everyone arrived. A scene may establish a promise through the existing supported acceptance behavior, but work, transfers and consequences still need their actual participants, resources and conditions. An NPC can misunderstand, lie or break a promise without changing what was actually committed.

### 8.4 Human participation

Joining a conversation gives the human an opportunity to speak, inspect permitted context and take supported actions. Silence is not assent. A timeout is not consent. Leaving a panel is not a fictional departure unless the player actually leaves the interaction. A disconnect follows existing participation rules; the scene cannot continue by inventing the missing player's answer.

NPCs may continue their own discussion while a human is silent if their knowledge and norms allow it. They may ask again, change the topic or leave. They cannot turn a human's silence into a purchase, oath, intimate act or resource commitment. Existing accepted commitments remain meaningful without new human action.

### 8.5 Splitting, merging and interruption

Two groups can become one conversation only through actual interaction and permitted membership. Merging does not disclose earlier private conversation. A subgroup can leave with its own remembered experience, while remaining participants continue. Someone addressing a particular person need not pull the whole crowd into one scene.

A physical emergency can suspend or end a scene. Preserve completed statements, heard fragments, actual obligations and unfinished choices. When the matter resumes, use the current participants and situation rather than replaying an obsolete script. New arrivals do not inherit private scene knowledge merely by entering the same place.

## 9. Meaning, exact language and memory

### 9.1 A scene can have an honest incomplete record

For an ordinary background exchange, retain the meaning that was actually communicated, the participants who could learn it, the completed decision or consequence, and uncertainty where appropriate. A person may remember that Ada asked for help carrying wood and that they declined. The system need not manufacture the precise wording of that exchange.

When asked later, the character can recount the meaning in their present voice while making clear that it is a retelling. A plausible new sentence must not be promoted to exact historical evidence. If only one participant understood a detail, the common scene account must not distribute it to everyone.

### 9.2 Exact exceptions are identified before they matter

Some mechanics depend on words: an oath with specific terms, a password, a recording, a disputed quotation, or a rule that grants perfect recall. The family must establish the exact relevant content when it occurs and retain the permitted evidence needed by its consumers. It cannot wait for a dispute and then generate whichever wording would make the current story convenient.

In the timed-speech stage, a promise, instruction, oath or other speech-triggered effect must satisfy its complete supported wording and acceptance conditions using actually delivered content. Submitted or generated intentions cannot supply an unspoken ending. If “I agree, provided you return the tools first” is interrupted, the incomplete condition must not be simplified into unconditional assent. Preserve the delivered evidence and leave the unsupported commitment unresolved.

| Available history                                   | Permitted later answer                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Exact words heard and still legitimately accessible | Quote those words with the actual source and uncertainty about anything not heard |
| Partial phrase heard                                | Preserve the fragment; do not complete it as remembered fact                      |
| Gist-only background exchange                       | Retell the meaning and identify it as an approximate account                      |
| Testimony from another resident                     | Attribute the report; do not claim personal witnessing                            |
| Unknown or unavailable source                       | Admit the gap; ask or investigate through ordinary permitted actions              |
| A later correction or changed interpretation        | Preserve the original occurrence and the correction as distinct facts             |

Memory selection may combine repetitive circumstances without converting them into a detailed diary. Active commitments and actual resource effects remain owned facts even when a resident forgets the exact conversation. A character can misunderstand an agreement; that belief does not rewrite its accepted terms.

### 9.3 Perspective-safe return and narration

A returning player can learn the important permitted consequences through observation, testimony and current records. They do not inherit an omniscient summary of the community. A narrator can make a concise, engaging account of available evidence, but dramatic quality does not grant access to private thoughts or distant unperceived scenes.

If a scene is interrupted by arrival, completed gist remains gist. Subsequent foreground words can be exact. The transition does not require reconstructing the earlier conversation, and does not make all participants agree about what it meant.

## 10. Presentation and accessible control

### 10.1 Show what supports the next decision

Keep the world visible and the foreground conversation readable. Use the existing Talk, caption and World Events surfaces for their established purposes. A small focus indication should identify whom the character is following and whether they remain distinguishable. Aggregate surroundings can use concise descriptions or supported ambient cues; they should not occupy the same prominence as a direct request.

If a scene offers a real consequential choice, show the actual subject, terms and next action. Ordinary dialogue need not become a series of cards. A proposed agreement may require structured confirmation of its actual terms through the existing agreement owner; a fluent sentence is not sufficient evidence of a completed transaction.

When focus is lost, say so in ordinary terms. Do not display hidden relevance scores, exact enemy positions or an inferred private motive to explain it. Technical model unavailability follows the restrained existing message treatment and preserves drafts; it is not an NPC's fictional refusal.

### 10.2 Accessibility must preserve information equivalence

Essential permitted cues need a usable non-audio route. Captions should distinguish speech from meaningful nonspeech events and identify a speaker or direction only when the character is allowed to know it. A scream may be important even when its source is unknown. Color alone, precise spatial hearing or a fleeting animation must not be the only way to access that information.

Let players adjust readable size, contrast, background, placement and relevant caption categories through the existing preferences. Preserve keyboard navigation, focus visibility, a non-hover route to explanations and an untimed history of already permitted evidence. Do not turn every ambient murmur into an assertive screen-reader announcement. Prioritize meaningful new information while allowing deliberate inspection.

Changing presentation volume, caption pace, text size or pause must not change the character's sensory capabilities. Equally, a presentation preference cannot reveal a hidden speaker's name or omitted phrase. The source of truth is what the character perceived, not what the audio device happened to render.

### 10.3 Backlogs, hidden tabs and reconnect

Keep transient presentation bounded and provide a clear route to permitted history when captions could not be shown. Do not replay an avalanche of old background speech after a hidden tab returns. Preserve reading position and indicate new relevant messages without forcing the reader to the bottom.

Reconnect restores the current conversation and actual history; it does not resend a committed line, replay a scene decision or grant words missed during absence. Timed speech, once supported, distinguishes a currently speaking source from a historical caption. A source can stop speaking while its permitted text remains available to read.

### 10.4 Devices and future voice

This feature should be usable with text alone. Future audible NPC speech or human proximity voice must consume the same listener permissions and interruption semantics through ND15. Audio mixing may omit or simplify rendering for device performance; that cannot rewrite the world's hearing evidence. Conversely, a voice service must not transmit a full private utterance merely because the recipient can hear an aggregate sound from its direction.

## 11. Economics, performance and abuse

### 11.1 Spend effort on distinctions that affect play

The expensive path should begin after basic scope, grouping and distinguishability have reduced unnecessary candidates. It is wasteful to generate a full description or model judgment for every person and then choose a few to show. Group cheap shared sensory circumstances, retain permitted individual exceptions, and obtain fresh interpretation only when a meaningful choice or experience needs it.

A speech can be generated once at its source, then yield different permitted fragments for its listeners. A group-level description can be reused where the actual observable facts coincide. Private recognition, interpretation, personal history and consent must remain individual. Shared computation does not justify shared secrets.

The number of potential speaker/listener relationships grows with both speakers and listeners. For illustration, 100 sources and 100 listeners create 10,000 possible relationships before locality and relevance reduce them; this is arithmetic, not a performance measurement. Limiting a final caption count does not by itself bound source scanning, history preparation or model work.

### 11.2 A shared scene is not automatically cheaper

One bounded exchange can sometimes be resolved with less work than many independent full conversations. However, privacy, conflicting beliefs and consequential decisions can require separate participant deliberation. Count those decisions, effect validation, memory and delivery in the total cost. A single large omniscient prompt is not the economic target.

The recommended default is common coordination plus individually owned consequential choices, with economical native continuation for already chosen participation. Apply higher evaluated model quality to actual difficult decisions and important character consistency, not every nearby body. A more expensive model is not evidence that its story is correct.

If a supported scene cannot obtain a required decision, preserve the unresolved matter and any completed exchanges. Optional continuation can wait or the participants can use already supported choices. If service failure would otherwise determine an imminent consequential outcome, use the coherent failure boundary in the continuing-lives specification. Do not silently assign defeat or assent to the unavailable participant.

### 11.3 Prevent attention monopolies

Repeated shouting, following, emote spam or deliberately generated commotion should not trigger a fresh full reconsideration in every observer each time. Treat equivalent repetition as a continuing circumstance, with meaningful changes still eligible for attention. A character might ignore it, leave, confront it or seek help according to their knowledge and choices.

The product must also preserve real new danger inside a noisy situation. A system that simply ignores all subsequent events from a source could miss an actual attack. Physical effects continue, and a newly relevant consequence can warrant an interruption even when optional interpretation of repeated noise is restricted.

Admission limits should cover the activity a source can impose on others and the community's aggregate capacity, not only per-message text length. Explain a refused new action or unavailable optional response without exposing private thresholds. Existing reporting and participant-control policies remain ND37; this feature does not invent operator access to private conversations.

### 11.4 Overload should not change the fictional rules secretly

Reduce discretionary new ambience, repeated interpretation and optional scenes before compromising admitted effects. Use visible capacity admission where the offered interaction cannot be sustained. Do not silently make an opponent deaf, omit a damaging projectile, delete a known obligation or downgrade an already engaged character's judgment to fit the bill.

A crowd's authored attention rule applies because of its actual situation. A server under pressure is a different condition. The user should not have to infer hidden load from suddenly inconsistent hearing. Scene, attention, caption and operating limits need separate descriptions and measurements.

### 11.5 Bound retained work as well as visible output

| Growth                          | Required product boundary                                                                                                                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| More physical sources           | Local supported sensory groups and actual capacity admission; do not generate exhaustive ambient speech merely to rank or filter it. Independently admitted exact activities still establish their required source content within their funded limits |
| More simultaneous exact speech  | Explicit supported speech policy and hearing qualification; no caption-lifetime shortcut                                                                                                                                                              |
| More scene participants         | Split into actual subinteractions or decline unsupported scope; do not silently erase people or merge minds                                                                                                                                           |
| More unfinished scene decisions | Bound pending optional work and explain waiting; do not require infinite continuation                                                                                                                                                                 |
| More history                    | Retrieve relevant permitted evidence and preserve exact exceptions; avoid formatting every past scene for every turn                                                                                                                                  |
| More caption output             | Existing bounded transient presentation and permitted history; no loss of already acquired evidence                                                                                                                                                   |
| More repeated disturbances      | Recognize continuing causes, preserve new physical danger and limit optional reaction cascades                                                                                                                                                        |

Exact counts and thresholds remain qualified tuning rather than a universal attention law. The [PS limits inventory](../limits/product-scalability.md) owns attention/scene restrictions; the [hearing inventory](../limits/hearing-and-speech.md) retains current acoustic and caption settings. This proposal does not replace those numbers with unrelated research-study capacities.

## 12. Concrete journeys and failure cases

### AS-J01 — Follow a conversation in a busy room

The human chooses a distinguishable speaker. Nearby chatter remains present but secondary. Small movements do not continually replace the focus. A question directed to the human is presented through their permitted evidence, with a usable way to reply. Changing caption size or audio volume changes presentation only.

### AS-J02 — Notice a friend in a crowd

A familiar person enters visible range within a moving group. The character can recognize them if current evidence supports it. The group remains approximate. The friend is not continuously tracked through an obstruction, and recognizing them does not identify everyone traveling nearby.

### AS-J03 — A scream interrupts, an unseen intention does not

An audible scream can draw attention according to the supported hearing rules. An enemy's private decision cannot. If an arrow hits while the character follows a speaker, the physical damage still occurs and becomes relevant bodily evidence. Focus is a limit on understanding, not armor.

### AS-J04 — Nearly equal sources remain stable

Two speakers move slightly relative to the listener. Focus remains stable while the selected source remains distinguishable. A materially changed obstruction or direct address can legitimately alter the situation. The player can explain why focus changed without needing a hidden numeric ranking.

### AS-J05 — Read slowly during fast play

The player uses longer caption reading time while the world runs faster. Actual hearing and NPC behavior use the world rule. Captions remain readable, obsolete transient output is handled through the established backlog policy, and permitted history stays available. Presentation pause does not suspend a danger.

### AS-J06 — Arrive during a background agreement

Two NPCs have discussed a task and one has asked a question. The human arrives before the answer. The completed exchange remains true; the answer and final commitment remain open. The human can participate through ordinary actions. Earlier gist is explained as meaning, not reconstructed verbatim speech.

### AS-J07 — One participant has a secret

A participant knows why a delivery is late; another does not. Common coordination sees disclosed facts and choices. The informed character may reveal, conceal or lie according to actual agency. The uninformed person does not act on the secret merely because a shared process could have read it.

### AS-J08 — Silence does not sign an agreement

A human is asked to contribute materials. They read the message, hide the panel and later disconnect. None of those actions supplies assent. The NPCs can react to what they actually observed, but the materials remain where the supported ownership rules put them. An existing separately accepted promise is not erased.

### AS-J09 — Exact words matter later

An oath is made in an otherwise coarse scene. Its exact required wording is established at the occurrence. One listener hears only part. A later dispute retrieves the actual allowed words and preserves the partial listener's uncertainty. The system does not invent an oath after the fact.

### AS-J10 — Speech is interrupted or heard late

In the future timed-speech stage, a listener arrives halfway through an utterance and the speaker is then interrupted. Only the delivered, perceptible phrases enter that listener's evidence. The speaker's sent text distinguishes intended content from the actually delivered portion. This case does not pass under the initial instantaneous-speech stage.

### AS-J11 — A noisy player tries to consume everyone's attention

Repeated equivalent disturbance is handled as a continuing situation, not unlimited model work. A new real attack remains effective and perceptible under the rules. Other ordinary conversations retain service within the supported envelope. Any refused new activity is communicated honestly.

### AS-J12 — Two audiences hear different things

One player stands beside the speaker, another behind a supported obstruction and a third is absent. Their captions, knowledge and later recollections differ. A common source or scene record never becomes a shared full transcript. Reconnect and opening history do not expand what was heard.

### AS-J13 — A scene splits during an emergency

Some people evacuate, a guard stays, and two others continue a permitted private discussion. Existing participants and completed consequences remain; new groups do not receive one another's earlier private exchanges. Returning later does not replay the emergency or duplicate a promise.

### AS-J14 — An unusual world changes the sense

A supported touch-based participant receives contact evidence rather than sound-based names and captions. The same distinction between occurrence, permitted observation, attention and choice remains useful. A new telepathic or shared-mind mechanic needs its separately supported disclosure policy; changing a label does not create access to private minds.

## 13. Proposed delivery stages

**Stage 1: stable focus and a truthful busy scene.** Keep current exact-speech semantics. Add the supported aggregate vocal/visual activity, individual exceptions, deliberate focus, interruption and accessible presentation. Qualify AS-J01–05, AS-J11–12 and physical effects outside focus. This must be useful in ordinary play before it is advertised as crowd scalability.

**Stage 2: a bounded character-led social scene.** Add one task/promise discussion family with completed exchanges, independently owned decisions, gist and exact exceptions. Qualify midscene arrival, secrets, silence, actual participation and scene split/merge. Its first unattended consumer is the continuing-lives feature; neither feature grants unsupported barter or coercion.

**Stage 3: actual timed speech.** Introduce phrase delivery, authored speaking intervals, meaningful overlap, interruption and late-listening rules as an explicit change through hearing/time owners. Qualify all AS-J10 cases, movement, fast speeds, draft cancellation and accessibility. Current committed histories remain valid under their original evidence contract.

**Stage 4: measured crowded operation.** Expand supported scene and crowd families only after mixed human/NPC, long-history, mass-arrival, noise-abuse and funding tests. Assess legibility, continuity, meaningful participation and complete cost, not just the number of rendered bodies. Broader combat crowds, concerts, media voice and special senses retain their own consumer requirements.

## 14. Acceptance and evaluation

Observe whether players can follow a conversation, understand the basis for an interruption, discover missed permitted information, identify what remains unknown and make a meaningful next choice. Assess text-only, keyboard, enlarged text, varied reading pace and non-audio use. Do not equate a guideline checklist with actual accessibility qualification.

For NPCs, review the source evidence, choices, effects and later accounts. Require no secret leakage, no invented human participation, coherent exact/gist distinctions, stable attention and preserved bodily effects. A pleasant generated conversation is insufficient if the participants were elsewhere or the promised goods do not exist.

Measure complete work for dispersed listeners, a crowded room, one public speaker, many competing sources, a noisy adversary, midscene arrival and old histories. Separate source preparation, required hearing/effect processing, new model decisions, memory work, delivery and presentation. Published capacity must identify the actual permitted activities and hardware/service conditions. Do not report a voice-rendering limit or an idle-crowd demo as a social simulation capacity.

Compare stable focus against a deliberately naive frequently switching baseline for player comprehension and missed important events. Compare individually generated ambient dialogue against supported gist/aggregate activity for complete cost and perceived continuity. These are proposed experiments; no saving or quality result is claimed before they run.

## 15. Research and the choices it informs

Research accessed October 3, 2026. The studies and developer accounts below support design directions and identify failure modes; they do not validate this proposed product. Laboratory attention tasks are especially poor sources for universal game limits. The recommendations in this document are our inferences, constrained by Open Legend's existing contracts.

| Reference and primary source                                                                                                                                                                       | Evidence and limitation                                                                                                                                                                                                      | Consequence for this proposal                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| AS-R01 — [Mesgarani and Chang, selective representation of attended speech](https://hearingbrain.org/docs/mesgarani_chang_nature_2012.pdf), Nature, 2012                                           | Cortical recordings in a constrained two-speaker clinical task differed with attended speech. This does not establish a universal attention-slot count or eliminate processing of unattended sound.                          | Separate source occurrence, intelligibility and focus. Give listening value without removing the room.                                        |
| AS-R02 — [Best et al., object continuity and auditory attention](https://www.cmu.edu/dietrich/psychology/shinn/publications/pdfs/2008/2008pnas_best.pdf), PNAS, 2008                               | Small digit-listening experiments benefited from a stable target location and voice. They do not supply a universal switching delay.                                                                                         | Preserve a selected speaker through small changes; do not impose a research-derived punishment for changing focus.                            |
| AS-R03 — [Li et al., attention capture by one's own name](https://link.springer.com/article/10.1186/s41235-024-00555-9), 2024                                                                      | Own-name distraction appeared in a visual categorization task and weakened under some repetition/compression conditions. Competing conversational speech was not tested, and the study was not preregistered.                | Recognizable personal cues can matter; never guarantee that an unheard name penetrates any crowd or that repetition buys unlimited attention. |
| AS-R04 — [Simons and Chabris, inattentional blindness](https://chabris.com/Simons1999.pdf), 1999                                                                                                   | Observers monitoring passes sometimes missed an unexpected event; noticing varied with task conditions. This is not evidence that unattended bodies cease to matter.                                                         | Retain real crowd bodies and effects while reducing individual conscious detail.                                                              |
| AS-R05 — [Rensink, O'Regan and Clark, scene-change detection](https://www.cs.ubc.ca/~rensink/publications/download/PsychSci.rr.pdf), 1997                                                          | Alternating pictures with blanks made change detection difficult; valid cues helped. The artificial interruption of visual change cues limits generalization.                                                                | Make deliberate inspection useful and meaningful state changes discoverable. Do not use inattention to excuse missing feedback.               |
| AS-R06 — [Microsoft XAG 104: subtitles and captions](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/104), updated March 4, 2026                                | Guidance distinguishes speech subtitles and broader sound captions, with readable configurable presentation and useful context. Its full-transcript recommendation concerns full-motion video.                               | Provide equivalent permitted information in text; do not interpret the guideline as a requirement for an omniscient live-world transcript.    |
| AS-R07 — [Microsoft XAG 103: additional cue channels](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103), updated March 4, 2026                               | Critical information should have additional presentation channels; color alone is insufficient. Simulation filters do not replace actual player testing.                                                                     | Offer usable non-audio and non-color cues while preserving the character's information boundary.                                              |
| AS-R08 — [Concordia](https://arxiv.org/html/2312.03664v1), Vezhnevets et al., December 6, 2023                                                                                                     | Common events can yield different agent observations; agents need not act after every observation. The report warns that concurrent turns can introduce inconsistencies. This is no confidentiality or throughput guarantee. | Share appropriate common work while preserving causal order, separate observations and individually owned decisions.                          |
| AS-R09 — [Versu: A Simulationist Storytelling System](https://cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf), Evans and Short, June 2014                                                    | Social practices organize opportunities while agents choose. The system also uses broad common world/practice knowledge and limited false-belief handling; tuning competing desires was difficult.                           | Borrow coordinated opportunities and interruptible continuity. Reject common omniscience as Open Legend's default scene policy.               |
| AS-R10 — [Versu: Conversation Implementation](https://emshort.blog/2013/02/26/versu-conversation-implementation/), Short and Evans, February 26, 2013                                              | Conversation coexists with other activities and supports chosen responses and interruptions. The creators describe an early single-topic restriction as too mechanical.                                                      | Keep useful conversational continuity without one rigid thread, automatic answers or forced participation.                                    |
| AS-R11 — [Structuring Content in Façade](https://eis.ucsc.edu/papers/MateasSternAIIDE05.pdf), Mateas and Stern, AIIDE 2005                                                                         | Reactive exchanges can revise future material in response to the player. The experience also required substantial specifically authored dialogue behavior.                                                                   | Preserve completed exchanges and leave future choices revisable; do not infer effortless arbitrary-world coverage from a focused drama.       |
| AS-R12 — [Comme il Faut](https://ojs.aaai.org/index.php/AIIDE/article/download/12454/12313/15982), McCoy et al., AIIDE 2011                                                                        | Authored reusable social exchanges distinguish initiator and responder considerations, including rejection. Large rule sets remain difficult to tune.                                                                        | Make refusal meaningful and social expectations world-authored; propagate consequences through actual evidence.                               |
| AS-R13 — [Crowds in Hitman: Absolution](https://media.gdcvault.com/gdceurope2012/Presentations/Programming/Kasper_Fauerby_Programming_CrowdsInHitman.pdf), Fauerby/IO Interactive, GDC Europe 2012 | Lightweight crowd behavior can become individually detailed when relevant. Movement needed substantial tuning, and the game made deliberate player-movement concessions.                                                     | Preserve individual engagement without adopting universal collision exemptions or copying the demo's crowd counts as a capacity promise.      |
| AS-R14 — [Wwise virtual voices](https://www.audiokinetic.com/en/library/edge/?id=concept_virtualvoices.html&source=SDK), indexed SDK 2024.1.9 documentation                                        | Virtual sounds can restart, resume or follow elapsed time, with different costs. Virtualization still has management overhead. Relevant primary text was retrieved through search; direct page opens failed.                 | Rendering fewer voices does not establish free continuation, correct hearing or correct re-entry timing.                                      |
| AS-R15 — [The Sound of The Outer Worlds, Part 1](https://www.audiokinetic.com/zh/blog/the-sound-of-the-outer-worlds-part-1/), Obsidian, October 29, 2019                                           | The audio team describes prioritized chatter and excessive processing from maintained virtual voices, leading to tighter control. The substantive primary article was retrieved through search; direct opens failed.         | Prefer stable useful speech and bounded ambient work. A cheaper representation still needs a measured total operating cost.                   |
| AS-R16 — [MassGameplay overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-gameplay-in-unreal-engine), Epic Games, accessed October 3, 2026                     | Documentation separates representation, simulation and viewer relevance. It is a capability description, not a measurement of Open Legend's social simulation.                                                               | Let viewers receive different useful detail while agreeing on the same world events.                                                          |

The strongest common lesson is that selective detail must be intentional. The attention evidence favors useful continuity; the game accounts show that ambient work can remain expensive even after it is made less visible; the social systems show both the value of coordinated scenes and the danger of assumptions about shared understanding. These support the staged choice in sections 2 and 13. They do not establish one optimal scene size, exact cost saving, flawless privacy or player comprehension.

## 16. Alternatives, tradeoffs and recommended decisions

**Exhaustive exact background dialogue** makes every later quote possible, but purchases and retains speech that may never matter, exposes players to reading overload and invites all-to-all interpretation. Use admitted exact exceptions and ordinary gist/ambient activity instead. A world centered on recorded debate can request a more exact supported profile; the cost must follow that declared experience.

**A single omniscient crowd narrator** can produce fluent summaries cheaply but cannot supply independent choices, legitimate disagreement or correct secrets by itself. Use common coordination for common facts and scoped decisions for private reasons. This costs more than pretending one prompt can decide everyone; it protects the game's core claim that its inhabitants have actual perspectives.

**Continuously choosing the loudest or nearest source** is simple to describe but gives a noisy stranger control over attention. Preserve deliberate focus, meaningful interruptions and actual source-loss behavior. The tradeoff is occasionally asking the player whether to switch instead of automatically maximizing momentary salience.

**Introducing fully timed speech immediately** would resolve overlapping-message semantics but expands timing, interruption, movement, histories and effectful-language risks together. Begin with a useful aggregate scene under the existing instantaneous contract. Review the timed behavior now and deliver it as its own stage. Do not market late listening until that stage passes.

**Silently discarding sensory consequences during overload** makes a performance problem appear to be a fictional rule and enables unfair outcomes. Bound optional source creation and new scenes, then use the continuing-lives service boundary if required work cannot be supported. Capacity qualification must include actual consequences and multiple audiences.

Adopt the recommended first setting, stable focus, character-led task/promise scene, exact-language exceptions and staged speech cutover as a coherent proposal. Before implementation, the existing owners must approve the authored aggregate-noise rule, the initial scene's exact acceptance behavior, the treatment of supported fictional senses and the later timed-phrase policy. Measured population, participant, source, pending-work and cost allowances remain unselected. Those unresolved numbers do not mean unlimited service.

## Maintained records

- Product scope and order: [five-specification package](five-product-feature-specs.md).
- Existing implementation owner: [PS04 and PS-D02](../maintainers/product-scalability.md); the [parent product specification](product-scalability-feature-spec.md) and [attention/scene contract](../product-scalability/attention-and-scenes.md) retain accepted policy.
- Current effect and presentation owners: [hearing and speech](../hearing-and-speech.md), [narration and conversations](../narration-and-conversations.md), [timed UI](../timed-ui.md), [world interaction](../ui-ux/world-interaction.md) and [chat and invention](../ui-ux/chat-and-invention.md).
- Limits: [product scalability](../limits/product-scalability.md) and [hearing and speech](../limits/hearing-and-speech.md). New scope restrictions are proposed; existing captions and acoustic limits remain current until separately changed.
- Related work: [continuing NPC lives](continuing-lives-feature-spec.md) supplies unattended consumers and the funded-service boundary; ND15 retains future audio-media presentation; ND37 retains reporting and control policy.
- Technical design is intentionally deferred. This document does not implement crowd capacity, change current speech evidence, close PS04 or approve a new time policy.

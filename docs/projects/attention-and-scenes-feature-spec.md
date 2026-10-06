# Attention, crowds and scenes — product and behavior specification

| Status      | Current progress                                                                                                                                         | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG18 prepares a useful exact gathering, shared reading and prospective gist/crowd profiles; adoption, technical design and runtime delivery remain open. | 2026-10-06   |

**Status: proposed detailed behavior, expanded October 6, 2026.** This extends the accepted PS04 direction. Existing hearing evidence and caption behavior remain authoritative until an explicitly scoped new policy is approved and delivered. Technical design, voice-media delivery and implementation are outside this product-only assignment.

## 1. Purpose and recommended experience

A player should be able to enjoy a conversation and stay involved in the surrounding world without managing an attention system. With one resident, that means readable, responsive talk and meaningful interruptions. In a later lively gathering, they can follow a conversation, recognize a friend, notice a disturbance and choose where to become involved. They should not receive fifty equally prominent captions or a secret list of every person's intentions. NPCs need the same distinction between actual surroundings and useful attention, at a sustainable complete cost.

The recommendation is **stable, perspective-correct focus within a continuing environment, with bounded social exchanges that preserve actual completed consequences**. Group sensory activity before expensive interpretation. Keep individually meaningful exceptions. Let ordinary people participate without making every spectator a separate paid commentator. Resolve new choices through each character's permitted knowledge; a shared scene is not permission to merge private minds.

The first playable contribution supports the accepted [one-map, one-live-NPC creative loop](../../archive/05-project/first-playable-mvp.md). A player can discuss an idea, pursue the real invention-and-hunting sequence and return to a relevant conversation without needing crowd machinery or timed phrases. That wider loop includes the genuinely generated sling and another supported invention; a convincing conversation alone does not replace it. Build on existing delivered conversation and hearing behavior rather than restarting them.

A later useful setting is a busy camp or common room: one foreground conversation, genuinely active background groups, a known person moving through the gathering and an interrupting call. The first coordinated social scene concerns a supported task or promise whose outcome gives someone a reason to care. It can progress when unobserved and become interactive on arrival. The [package delivery sequence](five-product-feature-specs.md#game-first-delivery-sequence) makes these expansions conditional on useful play; neither a crowded room nor fully timed speech is a prerequisite for the first personal session.

This should improve everyday play, not merely a stress benchmark. The test is whether a player can say what they were following, why an interruption mattered, what they missed and what they can do next. For NPCs, the corresponding test is coherent action and recollection from permitted evidence at a sustainable complete cost.

The positive promise is social possibility: company, humor, discovery, persuasion, an awkward disagreement, a warning worth following or a secret worth investigating. Listening can change the player's next choice; it should also be pleasant when no task results. The system does not owe a quest after every conversation. These are design aims to test through the [playability gates](five-product-feature-specs.md#playability-gates), not effects established by attention research alone.

## 2. Existing commitments and the new proposal

The [attention-and-scene contract](../product-scalability/attention-and-scenes.md) already separates limited attention, aggregate surroundings, independent agency, completed scene exchanges, exact speech and gist. [Hearing](../hearing-and-speech.md) owns actual linguistic evidence; [timed UI](../timed-ui.md) owns reading time; [conversations](../narration-and-conversations.md) owns conversation identity and narration. PS04 is still proposed runtime work.

The current speech occurrence is instantaneous. A lingering caption is not an ongoing sound. DG18 now makes the staging more precise: first a useful attended gathering and readable shared conversation under current exact-speech rules, without added vocal masking; next the selected prospective gist and nonverbatim vocal families; then a separately qualified timed-speech mode when real overlap, late listening and interruption justify it. This refines the earlier first-stage grouping so acoustic expansion cannot become a hidden prerequisite for useful conversation. It never retroactively removes words already perceived under the current contract.

The later timed-speech mode is described fully in section 7 so its product choices are reviewable now. It is not silently included in the first delivery stage. The current clock continues to govern simulation; changing caption preferences never changes fictional hearing. A future separate conversational clock would require the existing time-policy decision and is not assumed here.

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

Ordinary conversation should work with sensible focus already in place. Engaging a currently distinguishable resident through the existing Talk interaction expresses an intention to follow that conversation; it should not require a second listening-mode action or repeated reselection after each turn. Perceptible direct address and important cues use the ordinary hearing rules whether or not the player has operated an attention control. In the one-resident opening, the player should rarely need to think about focus at all.

Provide an understandable **Listen to** or equivalent action on a currently distinguishable speaker or conversation. Show the selected subject through the existing interaction language. Provide an equally discoverable way to stop or change focus by keyboard and pointer. A player should not need continuous precise aiming to remain in a conversation.

Use that explicit choice when competing conversations, deliberate eavesdropping or a changed interest make selection useful. It is not an attention meter to replenish, a minigame between replies or a routine confirmation before hearing someone. If the same conversation repeatedly requires manual recovery despite remaining distinguishable, simplify the default behavior before adding controls.

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

The proposed later crowd stage adds ongoing nonverbatim vocal activity from actual supported background scenes and evaluates exact committed foreground speech against that situation through the hearing owner. The first attended gathering in [§17](#17-dg18--something-worth-showing-and-a-gathering-worth-joining) introduces no such masking. Existing exact speech still uses its current event-time contract. Its caption lifetime never contributes to competition.

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

The original recommended family is discussion of one supported task or existing promise, with a small set of actually present participants. DG18 selects a useful made-object/current-activity exchange as its first concrete member and narrows its initial gist contribution to communicated meaning and expressed intention; new mechanically binding agreements are not supplied by this family. The meaningful outcomes are further questions, a disclosed intention, refusal, a supported accepted commitment, continued discussion or departure. Barter settlement, combat, coercion and new legal institutions require their own supported families; descriptive scene prose does not implement them.

The matter should offer an actual choice, not merely make the player approve a series of mechanically correct statements. Two people may want different uses for available supplies, disagree about a danger or have reasons to withhold help. The player can ask, suggest an alternative invention, take a side, offer a supported contribution or leave. Refusal and misunderstanding can change what happens next. The first scene needs only the capabilities its particular matter uses; a general negotiation system is not a prerequisite for an engaging exchange.

Privacy and human control preserve the conditions for intrigue. They do not require polite or cooperative characters. A resident can lie about what they know; a player can listen from a genuinely perceptible position and risk being noticed through actual evidence; a public accusation may affect later choices. Supported consequences and each person's knowledge still govern the result. Quiet companionship and inconsequential talk remain valid alongside conflict, without forcing every encounter into either a dispute or a transaction.

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

Two groups can become one conversation only through actual interaction and permitted membership. Merging does not disclose earlier private conversation. People who leave retain only their own remembered experience, while remaining participants continue. Addressing one person names the next recipient, not everyone's assent. If that engagement triggers the current native merge, it moves all active participants, including silent ones, under that rule; earlier audiences and privacy remain unchanged. A more selective group split requires its own supported operation.

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

Let the player stay oriented to the person and the situation. Routine conversation should not expose a scene-management dashboard, repeated permission prompts or a requirement to inspect a transcript after every interruption. Use a short permitted recap when requested, preserve the current subject and offer the next useful action. During normal reading and composition at the offered play speed, the initial experience must remain usable; repeated emergency pausing to finish each message is a failed pacing result. Existing explicit pause/speed controls remain available, and any required time-policy revision belongs to its owner. Caption settings never silently change the world's clock or grant immunity.

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

If a supported scene cannot obtain a required decision, preserve the unresolved matter and any completed exchanges. Optional continuation can wait or the participants can use already supported choices. If service failure would otherwise determine an imminent consequential outcome, use the applicable operational policy. DG17's proposed whole-community hold applies only to its selected isolated continuing-world profile; a public/shared deployment needs its own qualified failure policy. Do not silently assign defeat or assent to the unavailable participant.

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

Two NPCs have discussed a task and one has asked a question. The human arrives before the answer. The completed exchange remains true; the answer and final commitment remain open. The human can participate through ordinary actions. For example, the residents may disagree about using a limited supply, and the player can suggest a supported alternative, favor one proposal or leave the disagreement to them. The point is a live opportunity to influence the situation, not a prepared ending revealed on arrival. Earlier gist is explained as meaning, not reconstructed verbatim speech.

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

**Stage 1: effortless personal conversation and useful interruptions.** Keep current exact-speech semantics and first qualify the existing one-live-NPC encounter within the accepted creative loop. Ordinary Talk provides sensible focus; the player can read, reply and continue their own activity without routinely managing attention. Add a simple competing source or meaningful interruption only as needed to prove the behavior. Then qualify the busy-setting cases AS-J01–05, AS-J11–12 and physical effects outside focus when that setting is actually introduced. Its new aggregate vocal/visual activity and individual exceptions are later qualifications, not prerequisites for the first exact attended encounter. A personal playtest does not need all crowd cases first, and existing delivered behavior is not reset by this sequence.

**Stage 2: a bounded character-led social scene worth joining.** Use the [selected DG18 gathering](#17-dg18--something-worth-showing-and-a-gathering-worth-joining) to prove a useful exact attended exchange, then its new informal gist family with completed contributions, independently owned decisions and exact exceptions. The participants want something intelligible, their preferences can differ and the player's involvement can affect an unresolved matter. Qualify midscene arrival, secrets, silence, actual participation and scene split/merge. Include ordinary enjoyment and a credible disagreement without prescribing either as every scene's tone. Its first unattended consumer is the continuing-lives feature; neither feature grants unsupported barter or coercion. If the scene is mainly administrative dialogue, simplify the subject and interaction before adding more participants.

**Stage 3: actual timed speech when the experience needs it.** Introduce phrase delivery, authored speaking intervals, meaningful overlap, interruption and late-listening rules as an explicit change through hearing/time owners. Proceed when a desired playable situation genuinely depends on those distinctions and a prototype improves participation or tension enough to justify its reading, timing and operating cost. Qualify all AS-J10 cases, movement, fast speeds, draft cancellation and accessibility. Current committed histories remain valid under their original evidence contract. Defer this mode if it mainly makes players miss words or manage delivery; current exact speech remains a valid way to deliver useful social play.

**Stage 4: measured crowded operation.** Expand supported scene and crowd families when a gathering offers worthwhile additional encounters, choices or atmosphere, then qualify mixed human/NPC, long-history, mass-arrival, noise-abuse and funding cases. Assess legibility, continuity, meaningful participation and complete cost, not just the number of rendered bodies. This expansion can use the current exact-speech contract and does not require stage 3 first. Broader combat crowds, concerts, media voice and special senses retain their own consumer requirements. If more participants mostly create noise, shrink or separate the gathering rather than treating density as progress.

## 14. Acceptance and evaluation

Observe whether players can follow a conversation, understand the basis for an interruption, discover missed permitted information, identify what remains unknown and make a meaningful next choice. Assess text-only, keyboard, enlarged text, varied reading pace and non-audio use. Do not equate a guideline checklist with actual accessibility qualification.

Also observe whether the interaction is worth having. In the first personal session, can the player discuss and try an idea, recognize something about the resident and return to the world without fighting focus controls? In a later group scene, can they identify why people care, choose how to participate and point to an exchange that affected their next action? Enjoying company without receiving a task is a valid success. Merely recalling a transcript or clicking the correct control is insufficient evidence of that value.

Record avoidable reselection, repeated pauses needed to read, lost drafts or subjects, compulsory history searches, low-value interruptions and dialogue that repeats facts without changing understanding or inviting a choice. Use those observations to simplify focus, shorten ambient presentation, improve the scene's motives or revise authored pacing through its owner. If one-to-one conversation remains frustrating, defer crowd growth. If gist makes an exchange bland or important participation unclear, choose exact interaction for subsequent supported exchanges where it adds value; never reconstruct missing historical words. If exact background speech overwhelms play, reduce optional sources. Preserve privacy and actual consequences throughout. No enjoyment, comprehension or cost improvement is claimed until tested.

For NPCs, review the source evidence, choices, effects and later accounts. Require no secret leakage, no invented human participation, coherent exact/gist distinctions, stable attention and preserved bodily effects. A pleasant generated conversation is insufficient if the participants were elsewhere or the promised goods do not exist.

Measure complete work for dispersed listeners, a crowded room, one public speaker, many competing sources, a noisy adversary, midscene arrival and old histories. Separate source preparation, required hearing/effect processing, new model decisions, memory work, delivery and presentation. Published capacity must identify the actual permitted activities and hardware/service conditions. Do not report a voice-rendering limit or an idle-crowd demo as a social simulation capacity.

Compare stable focus against a deliberately naive frequently switching baseline for player comprehension and missed important events. Compare individually generated ambient dialogue against supported gist/aggregate activity for complete cost and perceived continuity. These are proposed experiments; no saving or quality result is claimed before they run.

## 15. Research and the choices it informs

Initial research accessed October 3, 2026; supplemental DG18 sources AS-R17–22 checked October 6, 2026. The studies and developer accounts below support design directions and identify failure modes; they do not validate this proposed product. Laboratory attention tasks are especially poor sources for universal game limits. The recommendations in this document are our inferences, constrained by Open Legend's existing contracts.

| Reference and primary source                                                                                                                                                                                                                                                    | Evidence and limitation                                                                                                                                                                                                      | Consequence for this proposal                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS-R01 — [Mesgarani and Chang, selective representation of attended speech](https://hearingbrain.org/docs/mesgarani_chang_nature_2012.pdf), Nature, 2012                                                                                                                        | Cortical recordings in a constrained two-speaker clinical task differed with attended speech. This does not establish a universal attention-slot count or eliminate processing of unattended sound.                          | Separate source occurrence, intelligibility and focus. Give listening value without removing the room.                                                                                  |
| AS-R02 — [Best et al., object continuity and auditory attention](https://www.cmu.edu/dietrich/psychology/shinn/publications/pdfs/2008/2008pnas_best.pdf), PNAS, 2008                                                                                                            | Small digit-listening experiments benefited from a stable target location and voice. They do not supply a universal switching delay.                                                                                         | Preserve a selected speaker through small changes; do not impose a research-derived punishment for changing focus.                                                                      |
| AS-R03 — [Li et al., attention capture by one's own name](https://link.springer.com/article/10.1186/s41235-024-00555-9), 2024                                                                                                                                                   | Own-name distraction appeared in a visual categorization task and weakened under some repetition/compression conditions. Competing conversational speech was not tested, and the study was not preregistered.                | Recognizable personal cues can matter; never guarantee that an unheard name penetrates any crowd or that repetition buys unlimited attention.                                           |
| AS-R04 — [Simons and Chabris, inattentional blindness](https://chabris.com/Simons1999.pdf), 1999                                                                                                                                                                                | Observers monitoring passes sometimes missed an unexpected event; noticing varied with task conditions. This is not evidence that unattended bodies cease to matter.                                                         | Retain real crowd bodies and effects while reducing individual conscious detail.                                                                                                        |
| AS-R05 — [Rensink, O'Regan and Clark, scene-change detection](https://www.cs.ubc.ca/~rensink/publications/download/PsychSci.rr.pdf), 1997                                                                                                                                       | Alternating pictures with blanks made change detection difficult; valid cues helped. The artificial interruption of visual change cues limits generalization.                                                                | Make deliberate inspection useful and meaningful state changes discoverable. Do not use inattention to excuse missing feedback.                                                         |
| AS-R06 — [Microsoft XAG 104: subtitles and captions](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/104), updated March 4, 2026                                                                                                             | Guidance distinguishes speech subtitles and broader sound captions, with readable configurable presentation and useful context. Its full-transcript recommendation concerns full-motion video.                               | Provide equivalent permitted information in text; do not interpret the guideline as a requirement for an omniscient live-world transcript.                                              |
| AS-R07 — [Microsoft XAG 103: additional cue channels](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103), updated March 4, 2026                                                                                                            | Critical information should have additional presentation channels; color alone is insufficient. Simulation filters do not replace actual player testing.                                                                     | Offer usable non-audio and non-color cues while preserving the character's information boundary.                                                                                        |
| AS-R08 — [Concordia](https://arxiv.org/html/2312.03664v1), Vezhnevets et al., December 6, 2023                                                                                                                                                                                  | Common events can yield different agent observations; agents need not act after every observation. The report warns that concurrent turns can introduce inconsistencies. This is no confidentiality or throughput guarantee. | Share appropriate common work while preserving causal order, separate observations and individually owned decisions.                                                                    |
| AS-R09 — [Versu: A Simulationist Storytelling System](https://cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf), Evans and Short, June 2014                                                                                                                                 | Social practices organize opportunities while agents choose. The system also uses broad common world/practice knowledge and limited false-belief handling; tuning competing desires was difficult.                           | Borrow coordinated opportunities and interruptible continuity. Reject common omniscience as Open Legend's default scene policy.                                                         |
| AS-R10 — [Versu: Conversation Implementation](https://emshort.blog/2013/02/26/versu-conversation-implementation/), Short and Evans, February 26, 2013                                                                                                                           | Conversation coexists with other activities and supports chosen responses and interruptions. The creators describe an early single-topic restriction as too mechanical.                                                      | Keep useful conversational continuity without one rigid thread, automatic answers or forced participation.                                                                              |
| AS-R11 — [Structuring Content in Façade](https://eis.ucsc.edu/papers/MateasSternAIIDE05.pdf), Mateas and Stern, AIIDE 2005                                                                                                                                                      | Reactive exchanges can revise future material in response to the player. The experience also required substantial specifically authored dialogue behavior.                                                                   | Preserve completed exchanges and leave future choices revisable; do not infer effortless arbitrary-world coverage from a focused drama.                                                 |
| AS-R12 — [Comme il Faut](https://ojs.aaai.org/index.php/AIIDE/article/download/12454/12313/15982), McCoy et al., AIIDE 2011                                                                                                                                                     | Authored reusable social exchanges distinguish initiator and responder considerations, including rejection. Large rule sets remain difficult to tune.                                                                        | Make refusal meaningful and social expectations world-authored; propagate consequences through actual evidence.                                                                         |
| AS-R13 — [Crowds in Hitman: Absolution](https://media.gdcvault.com/gdceurope2012/Presentations/Programming/Kasper_Fauerby_Programming_CrowdsInHitman.pdf), Fauerby/IO Interactive, GDC Europe 2012                                                                              | Lightweight crowd behavior can become individually detailed when relevant. Movement needed substantial tuning, and the game made deliberate player-movement concessions.                                                     | Preserve individual engagement without adopting universal collision exemptions or copying the demo's crowd counts as a capacity promise.                                                |
| AS-R14 — [Wwise virtual voices](https://www.audiokinetic.com/en/library/edge/?id=concept_virtualvoices.html&source=SDK), indexed SDK 2024.1.9 documentation                                                                                                                     | Virtual sounds can restart, resume or follow elapsed time, with different costs. Virtualization still has management overhead. Relevant primary text was retrieved through search; direct page opens failed.                 | Rendering fewer voices does not establish free continuation, correct hearing or correct re-entry timing.                                                                                |
| AS-R15 — [The Sound of The Outer Worlds, Part 1](https://www.audiokinetic.com/zh/blog/the-sound-of-the-outer-worlds-part-1/), Obsidian, October 29, 2019                                                                                                                        | The audio team describes prioritized chatter and excessive processing from maintained virtual voices, leading to tighter control. The substantive primary article was retrieved through search; direct opens failed.         | Prefer stable useful speech and bounded ambient work. A cheaper representation still needs a measured total operating cost.                                                             |
| AS-R16 — [MassGameplay overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-gameplay-in-unreal-engine), Epic Games, accessed October 3, 2026                                                                                                  | Documentation separates representation, simulation and viewer relevance. It is a capability description, not a measurement of Open Legend's social simulation.                                                               | Let viewers receive different useful detail while agreeing on the same world events.                                                                                                    |
| AS-R17 — [Palia Patch 0.200](https://www.palia.com/news/patch-200), Singularity 6, February 3, 2026                                                                                                                                                                             | The developer reports efficient Hot Pot play removing decisions and sometimes pressuring other players, then describes a feedback-seeking rule experiment. No measured result is reported.                                   | Evaluate experienced-player incentives. Do not reward repetitive attendance or make a casual participant an obstacle to somebody else's optimal earnings.                               |
| AS-R18 — [Sky Shared Spaces and Shared Memories](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/521-what-are-message-shrines-message-candles-message-boats-shared-spaces-and-shared-memories/), thatgamecompany support, accessed October 6, 2026 | Shared Spaces arrange props into a named place others may encounter; recorded Shared Memories have deliberate creation/publication steps. This describes features, not measured social benefit.                              | Let a place and real object supply an occasion. Presence, participation and publication remain different choices; no new prop editor or recording feature is required here.             |
| AS-R19 — [Baldur's Gate 3 Community Update 22](https://baldursgate3.game/news/community-update-22-wield-the-power-of-a-mind-flayer_75), July 31, 2023, and [Hotfix 1](https://baldursgate3.game/news/hotfix-1-now-live_80), August 4, 2023, Larian                              | Dialogue listening/advice is separate from the host's choice. Launch fixes included an alternate private-dialogue entry path and concurrent-dialogue joining failures. These are dated feature/fix accounts.                 | Keep hearing, participation, decision authority and private access separate through every join/read route. Do not import remote cinematic hearing or claim the historical bug persists. |
| AS-R20 — [Xbox Accessibility Guideline 116](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/116) and [117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117), Microsoft, updated March 4, 2026         | Guidance supports adequate UI reading time and control of distracting moving/auto-updating presentation; essential gameplay time has explicit distinctions. It supplies no crowd-capacity number.                            | Preserve readable history, stable focus and restrained motion. Caption preferences do not create sound, hearing permissions or a shared-world pause.                                    |
| AS-R21 — [Massive Crowd on Assassin's Creed Unity](https://media.gdcvault.com/gdc2015/presentations/Cournoyer_Francois_Massive_Crowd_On_ACU.pdf), Cournoyer and Fortier, GDC 2015                                                                                               | Original slides distinguish cheaper crowd reactions from autonomous character behavior, discuss conversion between representations and report workload-specific costs. These are historical measurements for that game.      | Qualify actual activities and interaction transitions. Rendered population is not an equivalent number of independent social residents; do not transplant capacity claims.              |
| AS-R22 — [Cyberpunk 2077 Patch 1.5](https://www.cyberpunk.net/en/news/41435/patch-1-5-next-generation-update-list-of-changes), CD Projekt Red, February 15, 2022                                                                                                                | The developer documented platform limits on added crowd reactions and loading/detail tradeoffs. The notes do not measure a universal cost for a reacting person.                                                             | Publish supported behavior together with service conditions. Reduce optional density before silently changing an already engaged person's competence or evidence.                       |

The strongest common lesson is that selective detail must be intentional. The attention evidence favors useful continuity; the game accounts show that ambient work can remain expensive even after it is made less visible; the social systems show both the value of coordinated scenes and the danger of assumptions about shared understanding. These support the staged choice in sections 2 and 13. They do not establish one optimal scene size, exact cost saving, flawless privacy or player comprehension.

## 16. Alternatives, tradeoffs and recommended decisions

**Exhaustive exact background dialogue** makes every later quote possible, but purchases and retains speech that may never matter, exposes players to reading overload and invites all-to-all interpretation. Use admitted exact exceptions and ordinary gist/ambient activity instead. A world centered on recorded debate can request a more exact supported profile; the cost must follow that declared experience.

**A single omniscient crowd narrator** can produce fluent summaries cheaply but cannot supply independent choices, legitimate disagreement or correct secrets by itself. Use common coordination for common facts and scoped decisions for private reasons. This costs more than pretending one prompt can decide everyone; it protects the game's core claim that its inhabitants have actual perspectives.

**Continuously choosing the loudest or nearest source** is simple to describe but gives a noisy stranger control over attention. Preserve deliberate focus, meaningful interruptions and actual source-loss behavior. The tradeoff is occasionally asking the player whether to switch instead of automatically maximizing momentary salience.

**Introducing fully timed speech immediately** would resolve overlapping-message semantics but expands timing, interruption, movement, histories and effectful-language risks together. Begin with the useful exact attended gathering, then add the selected aggregate scene under the existing instantaneous contract. Review the timed behavior now and deliver it as its own stage. Do not market late listening until that stage passes.

**Silently discarding sensory consequences during overload** makes a performance problem appear to be a fictional rule and enables unfair outcomes. Bound optional source creation and new scenes, then use the applicable operational policy if required work cannot be supported. DG17's proposed whole-community hold is limited to its selected isolated continuing-world profile, not a general promise to pause public/shared competition. Capacity qualification must include actual consequences, multiple audiences and that deployment's failure policy.

Adopt easy personal conversation as the first contribution, followed by stable focus in genuinely competing situations and a character-led task/promise scene with a reason to participate. Preserve exact-language exceptions. Larger gatherings and the timed-speech cutover are separately earned expansions under the playability and cost evidence above; they do not block the accepted creative loop or the other useful features in the package. [DG18 below](#17-dg18--something-worth-showing-and-a-gathering-worth-joining) and its [world profile](../worlds/base/social-gatherings.md) now select concrete proposed attendance, gist, vocal activity and intervention behavior. Adoption and technical qualification remain separate. Broader fictional senses, actual timed phrases and larger or unattended populations retain their owners' later decisions. Measured complete-cost and performance allowances remain unselected; the authored workload is a proposal to qualify, not a capacity claim or unlimited service.

## 17. DG18 — Something worth showing, and a gathering worth joining

**Proposed product selection, October 6, 2026.** Start with a useful attended exchange about a real made object or a practical experience, using the current residents and current instantaneous speech. The [authored gathering profile](../worlds/base/social-gatherings.md) owns the selected attendance, setting, example interests and later crowd workload. This section supplies the common behavior. It selects reviewable proposals for PS04/PS-D02; it does not enable a new hearing law or make a successful small conversation evidence of crowd capacity.

The player has something to bring into the encounter: an invention they used, a result they are unsure about, an observation from a journey, or curiosity about what another person made. The residents have their own interests. They may offer a practical suggestion, take pleasure in the object, joke, doubt a claim, ask to see something, decline involvement or return to their previous activity. An exchange is worthwhile when it changes understanding, creates a freely chosen next possibility or makes these particular people enjoyable to know. A formal assignment, communal vote, reward token and compulsory agreement are unnecessary. Sky's Shared Spaces show a concrete product built around a place and arranged props [AS-R18]; the relevant inference here is that an existing object and welcoming place can supply an occasion without a new minigame.

### 17.1 First prove the attended gathering

The first complete gathering retains current exact speech, ordinary bodily time, real objects and separately owned decisions. It adds no crowd-noise field. Several lingering captions remain several past speech occurrences, not voices that are still sounding. Everyone who is currently eligible to hear an exact utterance receives their actual permitted fragments, even when following somebody else. Stable presentation can make one conversation easier to read without confiscating that evidence.

The human approaches a currently perceptible resident and uses Talk. A nearby resident may hear, remain interested in their own work, independently respond or explicitly join through the supported conversation operation. The first resident's answer cannot include a second resident's consent or invented reaction. Selecting an addressee expresses whom the human addresses; it does not privately deliver the words or guarantee that person understands them. Whisper, Normal and Shout retain their existing meanings.

The subject should connect to play outside the conversation. A player who made and used a sling can describe the experience, show its actual visible form and decide whether to pursue a suggested alteration through the existing invention workflow. Someone with a carrying container can demonstrate a supported transfer using real contents. An NPC can be interested in the workmanship but unwilling to lend their knife. The human may continue with their own tool, ask another question, show a different object or leave. Unsupported tests remain proposals; a demonstration cannot invent a harmless target, completed shot, granted method or successful physical improvement.

The encounter does not assign the player a camp-management responsibility. Being nearby is sufficient to listen where hearing permits it; the player need not sign up, select a social role or wait for an agenda to finish. NPCs retain bodily concerns, projects, recreational interests and the complete accepted self-understanding required by [character integration](compelling-characters-feature-spec.md). A gathering that produces only work instructions has missed the intended experience.

### 17.2 One readable conversation and a clear next addressee

The current Talk composer addresses one resident, and its current person-oriented history is narrower than a complete gathering. A usable small group therefore needs a focused extension of that same reading surface. When the human participates in a shared conversation, show all speech and supported action entries from that conversation that the human actually perceived, in their authoritative order. Do not make the player alternate between separate personal transcripts to understand who answered whom. Existing actor-scoped conversation compaction remains context management over retained heard speech; it is neither this shared reading view nor the proposed new gist communication. Preserve the existing World Events route for other permitted nearby speech and earlier history.

The composer continues to name the person addressed by the next Send. Changing that selected person is an editable intention; it preserves the unsent draft and does not itself speak, join, merge, move the body or broadcast to the group. A destination label must remain visible while reading and writing. The player can deliberately address a different available resident; only committing the actual utterance applies the existing conversation engagement and merge rules. An unavailable recipient produces the current understandable availability result instead of silently substituting another listener.

Known speakers receive their permitted names. Unknown speech stays unknown; a member list is not permission to identify a hidden voice. A reply addressed to somebody else can still be readable when the human heard it. It should be understandable as that exchange, without turning the entire group into an implicit recipient of every command. Do not add an “everyone agrees” button or interpret a message mentioning several names as several separate dispatches.

Opening or hiding a panel, selecting a person and reading history do not create speech or assent. Explicit conversation departure, supported native joining, committed addressed engagement and the current merge rules remain distinct real transitions. A merger moves the source conversation's current active participants, including silent participants, under the existing native rule; it is not merely a transfer of the addressed person. It preserves the former conversations' source history and original audiences. It does not teach a newcomer what the old group said. Current native enrollment includes explicit joining and eligible addressed participants as well as committed speech; the design must consume that actual behavior instead of enforcing an inaccurate “only speaking can ever join” rule.

The current Talk close control hides its surface; it does not issue native leave. Provide a separately named Leave conversation action for that existing native operation. It ends the human's current participation without moving their body, withdrawing somebody else's consent or returning an object. Nearby speech can still be heard under ordinary rules. Leave is not a permanent mute or a promise never to be addressed again: a later actual directed utterance can enroll the eligible addressed human under current native engagement. That enrollment must not reopen a hidden panel, discard a draft, create a human answer or imply assent. A durable do-not-disturb or blocking policy remains with its existing participation/conduct owner. A conversation may also expire under current inactivity policy while the human reads. Preserve their permitted visible history and draft, and allow a new normal engagement without reviving old membership or replaying speech.

Keep the subject, draft and reading position through an interruption or a new participant's reply. A short new-message indication is preferable to dragging the reader to the bottom. The ordinary reply indicator, permitted private preview and failure treatment remain under [chat guidance](../ui-ux/chat-and-invention.md). The current direct-player preview retains its original recipient and eligibility: it never becomes a group preview, heard evidence, memory or a caption. Final committed turns reconcile through their real identities; another participant cannot read the private preview by opening the group view. Do not put scene processing, spending stages or a model's private reasoning between the characters' lines. If a group view cannot show a source under the human's current permission, it must not retrieve that source through an alternate participant or history route.

### 17.3 A prospective family for communicating gist

The next selected family is an **informal NPC exchange about a known object or current activity**. It can communicate an observation, opinion, question, preference or invitation to inspect or discuss. It may establish that a person expressed an intention. It does not, by itself, perform a transfer, teach an executable method, establish a new enforceable contract or accept a human's contribution.

A gist exchange is new communication admitted in that form when it occurs. It is not a summary that replaces an already spoken exact utterance. The speaking resident chooses what to communicate using their own context. The other resident receives only the actual permitted communication and independently chooses whether and how to answer. Coordination may connect those completed contributions; it cannot write both minds' private reasons or complete the answer in the requester's name.

For example, one resident may communicate interest in comparing a container with their own carrying method. The completed communication establishes that interest was expressed, not that comparison took place or that the other person agreed. The other can ask about weight, make a skeptical observation, decline or continue a different activity. A claim about the object's performance can be mistaken or dishonest. A scene record distinguishes the communicated claim from the object's native facts.

Each completed contribution has an occurrence, a speaker, its communicated meaning, an actual audience and any independently admitted consequences. These are product requirements, not a new database design. The meaning can be concise without erasing qualification or uncertainty. “Willing to help after eating” cannot become “agreed to help now.” A later explanation can report an earlier intention without claiming it was fulfilled.

The first family deliberately excludes the human from gist-authored speech or decisions. Human text remains exact. A human may overhear NPC gist through the new family's permitted evidence or address a participant, after which the subsequent interactive exchange uses current exact speech. The NPCs may continue their own gist exchange while a human is elsewhere; that does not give them authority to speak for an absent or silent human.

There is no universal scene director in this proposal. Shared preparation may use public circumstances and deliberately disclosed contributions. A participant's private thought, undisclosed invention, relationship interpretation or hidden knowledge stays in that participant's decision. The same person remains available through their normal identity and context; a cheap social persona is not substituted when a scene is unobserved. The earlier optional authorial-world alternative remains separate and is not selected for this wilderness profile.

### 17.4 Who learns meaning, and when

The [profile's first gist-hearing rule](../worlds/base/social-gatherings.md#gist-and-vocal-activity-selection) uses the installed acoustic evaluation at each completed communication. A listener with clear eligible exposure can acquire its communicated meaning. A listener who only detects sound or has partial exposure receives an indistinct-activity cue, without an invented quotation or a guessed partial proposition. This conservative rule is prospective and specific to this new family: there are no exact source words from which to retain a valid fragment. Current exact utterances keep their existing partial-word behavior.

Nonparticipants follow the same exposure rule as participants. A bystander who genuinely hears the meaning can later act on it or retell it; privacy cannot be manufactured from the group's wish that nobody overhear. Conversely, membership, nearby location or knowing a participant's name does not grant clear understanding. Sleeping, unavailable senses, geometry and delivery remain relevant. The first family introduces no familiar-voice recognition or hearing through a barrier that the current policy blocks. Larian's documented separation of dialogue listening, advice and the host's actual choice illustrates the distinction; its early alternate-entry privacy bug also makes every join/read path a necessary check [AS-R19]. Open Legend retains local hearing rather than importing remote cinematic access.

Recognition, location, attribution and communicated meaning remain separate. Someone may understand an opinion without recognizing its speaker. A claim can mention an unseen person or place; hearing that report does not establish the mentioned person's presence, exact position or private state. The listener's later model context, memories, captions and history must preserve those distinctions. Immediate gist presentation also uses attributed indirect meaning, never quotation marks or a reconstructed speech bubble: for example, Ada expressed interest in comparing the containers, only when that identity and meaning were actually learned. Mark the entry as heard meaning, and retain an unknown speaker where appropriate. This is formatting of the admitted evidence, not a new Narrator call or a claim to possess exact words.

A person arriving after a contribution does not receive it as fresh evidence. They may detect continuing vocal activity, hear a subsequent meaning, ask what they missed, or receive an actual retelling. A person who leaves retains what they already learned and misses later contributions when their senses no longer permit them. Opening a transcript, changing focus, reconnecting, changing caption settings or walking repeatedly across a boundary never rerolls or enlarges the old audience.

Later retelling uses the speaker's current permitted recollection. It is explicitly an approximate account when the source retained gist. If asked “What exactly did she say?”, an honest answer can acknowledge that the exact words are unavailable. A newly composed polished line is a new statement now, not a recovered historical quotation. Corrections and access revocation reach dependent scene summaries through the existing memory/history owners; a compact summary is not a permanent hiding place for revoked detail.

### 17.5 Exact speech where language or participation matters

Exact language is established before the relevant event, not generated after a dispute reveals a need for evidence. Human speech, already committed NPC speech and the first attended gathering remain exact at their source. If a supported action depends on a specific instruction, passphrase, oath, quotation, teaching act or accepted term, use that action's actual exact-language and acceptance requirements. This does not add those mechanics where they are absent.

The new gist family cannot settle a physical offer by saying “they exchanged tools.” An actual item offer names its native subject and quantity, retains independent acceptance and only transfers through the existing item owner. Likewise, a resident suggesting a new use for cord does not install a recipe in every listener. The [agency and invention contract](../agent-agency.md#6-actor-led-invention) preserves the difference between an idea, admitted method, personal knowledge and actual crafted object.

When a conversation moves toward a supported consequential agreement, subsequent contributions use the necessary exact interaction and native controls. Earlier gist remains what it was. If the essential terms were never established, the matter remains unresolved rather than being repaired with a convenient transcript. The same applies to a request to record or quote future speech: the requested capability must be supported and declared before the source is produced.

A player can influence an unfinished matter through actual speech, an offered alternative or a physical change. If someone already declined a request, arrival cannot turn that past refusal into an unmade choice. If the reply has not committed, the new information can affect a later decision through current attention and response rules. There is no precomputed favorable ending waiting behind the scene.

A borrowed, dropped, used or damaged object remains a real object throughout. A demonstration can consume material or move custody only through its actual command. Looking at a held item does not grant access to every private property or recipe. Returning an item requires a real transfer; friendly farewell prose cannot return it automatically. These boundaries give the social exchange stakes without adding a trading minigame or compulsory legal system.

### 17.6 A later busy camp with actual background activity

The later [busy-camp qualification](../worlds/base/social-gatherings.md#later-busy-camp-workload) introduces several independently motivated groups around nearby practical and recreational interests. This is an attended workload with actual bodies and individually authored residents. It is not an automatic expansion of DG17's prepared unattended community. The wider attendance must qualify its own full cost, behavior and human participation before any continued-absence offer.

An aggregate vocal source exists only while an admitted nonverbatim activity is genuinely occurring. The chosen participants, currently vocal member, source behavior, place and finite stopping condition matter. The activity can end because its period ends, a participant leaves, an incompatible action begins, attention changes through an actual choice, or the subject is no longer pursued. It does not run throughout a caption's lifetime, a provider wait or a saved conversation's inactivity grace merely because there is text on screen.

The selected ordinary vocal activity uses the installed source profile and hearing owner's supported combination of actual competing sound. No extra decibel system or mandatory physical waveform is specified. The evaluated speaker is excluded from their own competition. A generic group contribution cannot count a person's exact utterance twice. The first profile admits only its specifically selected vocal pattern, not simultaneous independent word streams inferred from overlapping message timestamps. Its finite activity ending creates no new communicated meaning, mandatory thought or paid restart. A new gist contribution requires that resident's independently chosen communication and its own actual admission; the activity timer never writes the next line.

**Changing observational focus does not silence people.** In this selected first profile, Listen to stabilizes presentation and current-interest priority; it adds no acoustic clarity bonus and does not change the listener evidence required by the installed source family. It grants neither a new sense nor control over another body's activity. An actual move into interactive exact exchange can replace that participant's incompatible generic vocal contribution at the real boundary. Until then, the existing activity continues or ends for its actual reason.

Where someone requests foreground interaction, subsequent speech can become exact without inventing prior words. Already admitted decisions and communicated meaning remain. No second copy of a resident appears to satisfy another observer. Multiple observers can receive different detail from the same history, but must agree on completed physical consequences. A visitor who cannot yet be supported receives honest technical waiting or admission feedback before entry under the existing participation policy; an already present person is not silently made deaf.

The baseline arrangement is not a fixed foreground-participant cap. If an existing group genuinely joins or merges into the human's conversation, the authored workload must also support its ordinary exact interaction and every eligible listener. Stop admitting optional background activity before promising a configuration that cannot be sustained. Never make the player guess that selecting a person will erase other participants or change already heard speech.

### 17.7 Work, money and attention remain bounded

The first gathering reuses delivered event-time evidence, coalesced reaction intake and bounded current-context preparation. These foundations already save work; they are not the proposed new crowd/grouping behavior. Current warm preparation improvements also do not make changing observers, cold reconstruction or a growing population free. [Performance](../performance.md), [hearing](../hearing-and-speech.md#11-performance-contract) and the [current intake](../events-perception-and-reactions.md#9-reaction-intake-and-scheduling) remain controlling.

Group eligible physical circumstances before preparing expensive individual descriptions or model judgments. A visible gathering can be described as a group with a recognized individual exception without first buying a complete monologue for every member. Shared facts may be prepared once where their actual scope matches. Private interpretation and decisions remain individual. Current exact utterances still require complete eligible listener evidence; no new top-count cutoff is introduced by attention focus or caption capacity.

Measure the complete path: source preparation, candidate/exposure work, required listener evidence, each participant's decision preparation and generation, admitted replies, memory processing, current presentation and later recall. Also measure failed or abandoned work and retained uncertain spending. A single shared summary call is not “one-call scene resolution” when it hides separate decisions, history preparation and delivery behind it. Historical Assassin's Creed Unity crowd work explicitly distinguished inexpensive crowd reactions from full autonomous behavior [AS-R21], while Cyberpunk 2077 documented platform-specific limits on added reactions [AS-R22]. These are reasons to name and measure the supported workload, not transferable population benchmarks.

An illustrative comparison clarifies the objective. If a hypothetical exchange uses one source decision and one responder decision, optional summaries and reactions are additional work. Adding several spectators must not automatically multiply that pair of decisions into a response from every spectator. Some may need a meaningful decision, and their actual permitted evidence still has a cost. The desired saving comes from avoiding unnecessary starts and repeated preparation, not omitting real listeners or merging independent minds. No current dollar price or universal cost reduction is claimed.

Admit a new optional exchange only within the measured complete-work allowance for the chosen profile, including a response it can legitimately invite and necessary current-state validation. A proposed question does not reserve unlimited future answers, memories or investigations. Each further voluntary exchange has its own supported admission; a conversation can naturally finish without consuming a configured quota. Existing actor budgets, outstanding paid reservations, interactive priority and permitted refresh/retry behavior remain their owners' policies.

Repeated equivalent shouting, repeated object showing and rapid join/leave or focus changes must not purchase a fresh cascade. Preserve real exact messages and permitted evidence, then coalesce optional reconsideration of an unchanged situation. A new attack, actual object transfer, intelligible urgent warning or materially changed request remains distinguishable. Do not suppress every later event from a noisy person, treat typing as speech, or grant them an automatic interruption by placing a target's name in unheard text.

When optional scene service is unavailable, the UI may explain that the optional reply or activity is unavailable through existing restrained status; it cannot claim the NPC refused. Current exact speech already committed and actual native work remain real. Required service failure uses the applicable current operational owner, and DG17's whole-community rule only in its selected isolated unattended mode. This scene proposal does not grant a new shared-world pause or automatically charge another participant. Already paid work remains accounted for; stale results cannot invent speech or effects after departure, cancellation or changed authority.

### 17.8 Attention and return should stay easy

In the first gathering, ordinary Talk supplies useful focus. Do not add a required listening stance before each message. The later Listen to control is useful only when genuine competing activity makes the choice meaningful. It can select a currently distinguishable speaker through the same world interaction language, show what is followed and provide a simple stop/change action. Camera aim and small incidental motion do not continually reset that choice.

If the speaker becomes unavailable, show the lost subject honestly and preserve the draft. Do not select the nearest replacement or keep revealing a hidden person. Meaningful direct address and danger can be noticed without stealing the player's physical control or rewriting their answer. Resume the previous subject when the player chooses and it remains available; another person may have moved on in the meantime.

Use captions, the readable conversation surface and permitted history together. Essential currently permitted information needs a non-audio route, while routine babble does not become an assertive announcement for every fluctuation. Existing caption lifetimes, overflow notice and reading preferences remain presentation controls. A longer reading duration changes neither which meaning occurred nor who learned it. The world need not replay a queue of old voices on return from a hidden tab. XAG116/117 support adjustable UI reading and reduced distracting presentation while distinguishing essential gameplay timing [AS-R20]; they do not authorize an acoustic source or shared-world pause based on caption preferences.

A returning human can see current people and objects, consult their own permitted record, or ask for an account. A resident can describe their own experience, including doubt, disappointment, humor or a changed preference. No automatic social summary grants the human unseen conversation content. The optional story-perspective proposal and Journal keep their own scopes; this family does not turn them into group surveillance.

The Narrator may describe eligible evidence through its current selection and permission rules. It cannot generate the missing scene itself. A failed request remains **“Narration failed.”** rather than a fabricated substitute account. Reading an old scene, opening the group view or restoring a save is a read, not permission to regenerate, rerun a decision or replay a transfer.

### 17.9 Complete journeys and release judgment

**AS-J15 — Show something useful, receive an unexpected preference.** The human brings an actual object or result from their own activity. One resident asks a relevant question; another can disagree, joke, decline or remain occupied through independent choice. The human can identify who spoke, whom the next Send addresses and a possible next activity. Success is not conditional on receiving praise, a quest or free equipment.

**AS-J16 — A conversation grows without losing the draft.** The player composes to one resident while another legitimately joins and speaks. The shared reading surface shows the human's actual heard contributions in order. Switching addressee preserves the draft but dispatches nothing. Sending uses the selected person and the real conversation rules. A participant who did not hear an earlier line does not acquire it through the new view.

**AS-J17 — Overhear meaning, arrive too late for its answer.** Two residents complete an ordinary gist request while the human can clearly hear it. The human then moves away before the reply. Later history contains the request meaning and no invented answer. Another listener with weaker exposure has only an indistinct cue. A current retelling can add knowledge through a new real exchange.

**AS-J18 — Join before the decision.** A resident has asked to compare a made object; the other has not answered. The human arrives and proposes another supported way to try it. Subsequent actual decisions may change. Preserve the completed request, any already spoken refusal and exact/gist boundaries. The scene cannot select a predetermined agreement simply because the player joined.

**AS-J19 — Exact terms and real custody.** An informal exchange turns toward borrowing an item or learning a method. Switch future handling to the applicable exact/native action. A refused offer leaves the item with its owner. A successful transfer happens once. Describing a recipe does not claim that the hearing/teaching requirements passed. Leaving and returning cannot duplicate either outcome.

**AS-J20 — The busy camp becomes one conversation.** Begin with the profile's actual independent groups, then allow a legitimate engagement or merge. Qualification includes readable exact interaction, complete listener evidence and retained old privacy. Focus changes do not extinguish unrelated vocal activity, and the disappearance of a caption does not quiet the camp. If the workload cannot support that intervention, it cannot advertise the baseline gathering as ready.

**AS-J21 — Noise and observer churn meet a real consequence.** Repeated equivalent commotion and repeated panel/focus changes do not cause an unbounded chain of decisions or descriptions. Then introduce a real supported physical consequence or intelligible new warning. Its effect and eligible evidence survive. Cost records distinguish coalesced optional work from required processing; the test is not passed by dropping the audience.

**AS-J22 — Service stops and a person returns.** Stop an optional exchange after one completed contribution or interrupt an applicable funded unattended period. Preserve completed meaning, actual work, human absence and spending. On return, no automatic answer, late transcript or missed social debt is manufactured. Ordinary attended play remains available under its existing authorization, and a later unanswered matter can be revisited through current independent choices.

Qualify the attended encounter first, then the new gist family with contrasting observers, then the actual busy workload and its intervention cases. The broader scene must earn its extra people and vocal activity by adding worthwhile possibilities without making reading, navigation or conversation administration dominate. A successful pair exchange is not evidence for a crowded festival, public conflict or voice-media service. Palia's developer account of efficient Hot Pot play removing decisions and pressuring other participants supplies a concrete incentive failure to watch for [AS-R17]. Optional company should not become a reward-maximizing attendance routine.

The [character flows](compelling-characters-feature-spec.md#complete-behavioral-flows), existing AS-J01–14 and current hearing/conversation acceptance remain applicable. These new journeys are proposed evaluation, not completed tests. Compare the experience and complete cost against the simpler exact gathering. If abstraction makes people interchangeable or their responses bland, retain exact interaction where it adds value and reduce optional sources. If more bodies only add noise, keep the smaller gathering. The game gains value from another enjoyable encounter, not from reaching a population number.

## Maintained records

- Product scope and order: [five-specification package](five-product-feature-specs.md).
- Existing implementation owner: [PS04 and PS-D02](../maintainers/product-scalability.md); the [parent product specification](product-scalability-feature-spec.md) and [attention/scene contract](../product-scalability/attention-and-scenes.md) retain accepted policy.
- Current effect and presentation owners: [hearing and speech](../hearing-and-speech.md), [narration and conversations](../narration-and-conversations.md), [timed UI](../timed-ui.md), [world interaction](../ui-ux/world-interaction.md) and [chat and invention](../ui-ux/chat-and-invention.md).
- Proposed authored profile: [Something worth showing](../worlds/base/social-gatherings.md), the single owner of selected attendance, initial matters, gist/vocal restrictions and the later busy-camp workload.
- Limits: [product scalability, especially PS-L28–33](../limits/product-scalability.md) and [hearing and speech](../limits/hearing-and-speech.md). New scope restrictions are proposed; existing captions and acoustic limits remain current until separately changed.
- Related work: [continuing NPC lives](continuing-lives-feature-spec.md) supplies unattended consumers and the funded-service boundary; ND15 retains future audio-media presentation; ND37 retains reporting and control policy.
- Technical design is intentionally deferred. This document does not implement crowd capacity, change current speech evidence, close PS04 or approve a new time policy.

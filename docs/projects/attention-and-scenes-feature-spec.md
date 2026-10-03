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

| Layer | Example | Product consequence |
| --- | --- | --- |
| Physical occurrence | A person speaks, a body blocks a doorway, an arrow flies | Real effects continue even if nobody attends to them |
| Detectable evidence | A listener hears voices through an open entrance | Detection does not guarantee names, exact location or words |
| Distinguishable source | A familiar visible speaker can be associated with one voice | Association depends on actual evidence, not server identity |
| Current focus | The character follows that speaker | Focus favors permitted detail and continuation, not impossible senses |
| Interpretation | The character believes the speaker sounds worried | Interpretation can be mistaken and belongs to that character |
| New choice | The character interrupts work to investigate | A choice needs a reason; observation is not automatically a paid decision |

Human camera position, selected object, keyboard focus and a character's attention are different. Panning the camera is not hearing through a wall. Selecting a caption must not accidentally walk the character. Turning down audio, hiding captions or reading a transcript changes presentation, not the evidence the character acquired.

## 4. Stable attention

### 4.1 What remains in focus

The default is to preserve the current meaningful activity or conversation while it remains distinguishable and relevant. Near-equal changes in distance or salience should not make attention jump between speakers. A recognized friend entering view can be noticed as an additional fact without automatically abandoning the current speaker.

When no deliberate focus exists, use supported evidence, the current activity and meaningful novelty to choose a useful foreground. A character preparing a meal may attend to that work and to someone addressing them. Someone keeping watch may attend to an approach. Authored senses and unusual minds may differ; this is a recommended human-like default, not a universal cognitive law.

Do not choose a universal maximum number of things a mind can notice. The product needs bounded work and intelligible presentation, but a single count would conflate a conversation, a moving crowd, a recognized person and a bodily injury. Qualification should establish supported situations and meaningful limits without pretending that a scientific paper supplies a game-wide attention number.

### 4.2 Explicit player focus

Provide an understandable **Listen to** or equivalent action on a currently distinguishable speaker or conversation. Show the selected subject through the existing interaction language. Provide an equally discoverable way to stop or change focus by keyboard and pointer. A player should not need continuous precise aiming to remain in a conversation.

Focus requests apply prospectively. They cannot reconstruct missed words, identify an unrecognized voice, defeat an opaque wall or disclose a private conversation. If the target becomes unavailable, retain a clear indication that it was lost and permit a sensible new choice. Do not silently switch to a nearby stranger with a similar name.

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

# Player-facing language

[Handbook](README.md) · [Required writing workflow](../../.agents/rules/player-facing-language.md) · [Supporting research](research.md#player-facing-language) · [Implementation follow-through](../maintainers/ui-ux.md#uiux20)

This is the shared writing standard for every player-facing surface, including text produced outside the client. It establishes requirements for authored and generated wording; it does not certify existing screens or model output. Subsystem contracts still determine what happened, what can happen and what each recipient may know.

## Core standard

**Speak to the player. Communicate what they need to understand, decide or do, in compact, natural language that fits their situation.**

The audience is a person playing the game. They understand people, places, possessions, danger, choices and consequences. They should not need to translate a description of the simulation's internal objects into an explanation of their own experience. A string can be mechanically accurate and still fail this standard.

### Why “this body” misses the audience

“Can kill this body” frames the player's life as an object under examination. The requested replacement, **“can result in death,”** communicates the relevant consequence in familiar terms. When a full sentence needs a subject, name the actual hazard. For example, **“Severe bleeding can result in death.”** That sentence is an illustrative wording pattern, not a new world rule.

Changing only “this” to “your” does not resolve unnecessary abstraction. Decide what the player needs to know, then express that meaning. “Body” remains appropriate when the physical body is the subject: an injury, a corpse, an anatomical description or a world mechanic in which bodies genuinely matter. “Your character” can be useful in character selection or an explanation that distinguishes a character's fate from account progress. Neither word is forbidden.

## General principles

### 1. Start with the player's question

Decide what the text helps the player understand: what this is, what happened, why an option is unavailable, what choosing it will do, or what they can do next. Put that information first. Do not display a technical field merely because the engine has it.

An ordinary action explanation should name a useful effect or consequence. Details about scheduling, storage or internal classification belong only where they help the user perform the actual task.

### 2. Use the right point of view and clear references

Use “you” and “your” naturally when speaking about the player's current character or actions. Use a person's name or an appropriate known description for someone else. In character selection, spectator views and multi-character contexts, identify whose situation is described instead of assuming “you” is unambiguous.

Direct address does not require a pronoun in every string. “Inventory,” “Open chest,” “Mara opens the gate” and “Can result in death” can all serve the player. Labels and reference descriptions can be impersonal; they must still use concepts the reader understands. Avoid “this,” “it” or “they” when the current display, event or spoken announcement does not make the referent clear.

### 3. Prefer familiar words over implementation language

Name people, objects, actions and results as the player understands them. Do not turn record names, enum values, entity categories, internal status codes or AI instructions into ordinary game prose. Replacing jargon with a polished abstraction is insufficient if the player still has to work out what it means.

World vocabulary and useful game terms are allowed. Introduce an unfamiliar term through context or a compact explanation when it is needed for a decision, and use it consistently afterward. A technical creator or diagnostics view may need technical terms; explain their meaning and practical effect to its human user. Technical detail is justified by the task, not by the developer's access to it.

### 4. Explain consequences without changing their meaning

State relevant risk, cost, scope and persistence plainly. Do not soften death, loss or irreversible changes into vague “negative outcomes.” Do not imply that a possibility is certain, or that a known outcome is merely possible. Preserve distinctions such as attempted/completed, stopped/paused, temporary/permanent and one item/the whole group.

Prefer an active construction when it clarifies who did what. Passive or impersonal wording is appropriate when the consequence matters more than the actor, as in “can result in death.” Do not manufacture an actor or cause merely to avoid passive voice. Warning copy explains an existing choice; it does not introduce a new confirmation requirement or change gameplay rules.

### 5. Keep truth and permission ahead of fluency

Present only information available to that surface and recipient. Use an unknown person's permitted description rather than a hidden name. An event report must not invent intent, feelings, causes or unseen results. A character's opinion can remain an opinion; it must not silently become the narrator's established fact.

The player's information needs and the character's knowledge are related but distinct. Connection errors, controls, settings and other genuine interface facts may be explained directly. World perception and narration still follow their existing disclosure rules. A privileged inspection view must identify its scope; its wider knowledge does not license ordinary event text to become omniscient.

### 6. Be compact without becoming cryptic

Remove filler, repetition and needless qualification. Keep the words needed to identify the subject, understand the consequence and choose the next step. Short labels can be fragments; explanations should use ordinary grammar. Brevity is measured by how readily the player understands the message, not by the lowest character count.

Put essential information in the relevant surface. Defer optional depth using existing help and disclosure patterns; do not hide a material risk in an optional tooltip. If truthful wording does not fit, adapt the presentation instead of dropping its meaning. Do not impose a universal word count or reading-grade target on all game writing.

### 7. Make labels and recovery useful

Label an action by what choosing it does, and a setting by what it changes. Keep recurring controls consistent with their actual behavior; “Close,” “Cancel,” “Stop” and “Delete” are not interchangeable. A disabled explanation states the relevant obstacle and a genuinely available remedy when known.

Errors identify the affected action or information, explain the known problem and offer a supported next step. Do not blame the player, leak private details, promise automatic recovery or offer “Try again” when repeating the operation could duplicate an unresolved action. Distinguish success from failed follow-up display: a refresh failure cannot justify saying a confirmed action failed. [System feedback](system-feedback.md) owns the interaction and recovery behavior.

### 8. Fit the speaker, situation and tone

System guidance is clear, direct and respectful. Urgent warnings remain calm and explicit. Avoid bureaucratic phrasing, forced cheerfulness, condescension and jokes that obscure loss or failure. Natural contractions are welcome when they suit the speaker and context; “human” does not mean chatty.

World descriptions may be vivid. Dialogue may be emotional, formal, terse, mistaken or unusual because of the speaker. Preserve atmosphere and character personality while keeping essential instructions understandable. A deliberately alien character may sound alien; ordinary interface copy should not do so by accident. Do not flatten all narrative writing into a help-desk voice or rewrite quoted player messages.

### 9. Give shared concepts consistent names

Use the same player-facing term for the same action or concept across menus, help, events and accessible labels. Keep meaningful distinctions when behavior differs. Do not add synonyms for variety where players need to recognize the same control.

The installed world owns its specific vocabulary and explanations; generic interface grammar does not make bundled-world rules universal. Fix recurring wording in its existing shared owner, preserving legitimate changes in person, tense and context. This standard does not create a second glossary or authorize a new localization framework.

### 10. Write for the actual reading and listening context

Check the words with their heading, selected subject, nearby controls and accessible name. Include enough context for an event read later or a control announced on its own. Avoid instructions that depend only on color, position or a mouse gesture. Refer to the actual control label and supported input when necessary.

Names, counts, units and translated word order can change a sentence's grammar. Prefer complete message structures over assembling unrelated English fragments. Keep a visible control's wording recognizable in its accessible name, adding the subject where needed. Essential information must remain understandable with enlarged text and screen narration; a well-written source string alone does not establish that.

## Match the surface and speaker

The examples in this chapter are illustrative copy, not claims of current mechanics, available controls, disclosure grants or completed accessibility support. Use each only when its stated facts match the implemented, permitted situation.

| Surface                       | Communication job                                          | Suitable illustrative wording                                                      |
| ----------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Menu or navigation            | Name a recognizable destination or subject.                | “Inventory”; “Settings”                                                            |
| Action control                | Name the available action and its object when needed.      | “Open chest”; “Stop resting”                                                       |
| Setting                       | Explain the effect of the selected choice.                 | “Pause the game when this tab is hidden”                                           |
| Personal condition            | Address the affected player naturally.                     | “You're bleeding.”                                                                 |
| Warning or mechanic help      | Explain the relevant condition and consequence.            | “Severe bleeding can result in death.”                                             |
| Object or general reference   | Describe the thing and relevant properties.                | “A cracked clay bowl.”                                                             |
| World event or caption        | Report the permitted event with an identifiable subject.   | “Mara opens the gate.”; “You hear footsteps nearby.”                               |
| Narration                     | Describe the scene from the permitted viewpoint.           | “Rain drums against the roof.”                                                     |
| Character dialogue            | Preserve who is speaking, their knowledge and personality. | “Keep your head down. They haven't seen us.”                                       |
| Failure or unavailable action | Explain the obstacle and a supported next step.            | “The chest is out of reach. Move closer to open it.”                               |
| Connection or loading notice  | Describe the actual interface condition.                   | “Connection lost. Reconnecting…” only while a reconnect is actually underway.      |
| Accessible control name       | Identify the same action with sufficient subject context.  | Visible “Inspect”; accessible “Inspect clay bowl.”                                 |
| Creator or operations view    | Explain a specialized choice or fact to its human user.    | “This change affects every wolf in this world.” only when that is its exact scope. |

A shared event can require different wording for different recipients. “You open the gate” and “Mara opens the gate” describe the same event when the first recipient is Mara and the second is someone who knows her name and may perceive it. Do not implement this by blindly replacing names: quoted dialogue, unknown identities, possession and multiple participants require their own context.

## Before and after

These are meaning-preserving rewrites only under the stated context. They are examples for judgment, not a list of banned words or canned fallback strings.

| Less useful wording                        | Player-facing alternative                 | Context that must be true                                                                                      |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| “Can kill this body.”                      | “Can result in death.”                    | The explanation concerns a possible fatal consequence.                                                         |
| “This actor is experiencing blood loss.”   | “You're bleeding.”                        | The affected person is the player's current character and the condition is known.                              |
| “Target entity exceeds interaction range.” | “The chest is out of reach.”              | The attempted target is that chest and reach is the actual blocker.                                            |
| “Action prerequisite unsatisfied.”         | “You need a hammer to build this.”        | That tool is the actual missing requirement, and the requirement is permitted information.                     |
| “Container transfer successful.”           | “You put three stones in the chest.”      | That quantity and destination are the confirmed result.                                                        |
| “Agent emitted an acoustic event.”         | “You hear a shout nearby.”                | A shout is audible and proximity is supported; the source's identity is not supplied.                          |
| “The agent canceled participation.”        | “Mara stopped helping.”                   | Mara deliberately stopped and that fact is permitted; expiry would need different wording.                     |
| “Response generation pending.”             | “Waiting for a reply…”                    | The interface is actually waiting; do not claim the character is thinking or composing.                        |
| “No entities returned.”                    | “No matching items.”                      | A filter returned no items. A truly empty container needs an empty-container message instead.                  |
| “Mutation failed.”                         | “Couldn't save your settings. Try again.” | Saving definitely failed and retry is safe; an unknown outcome needs uncertainty and recovery wording.         |
| “This body is deceased.”                   | “You died.”                               | The message addresses the death of the player's current character; an inspected corpse is a different subject. |

## Authored, generated and composed text

The same standard applies whether a person wrote the string, a template assembled it or a model generated it. Internal instructions can use technical language for their own task; their player-facing output must be written for the intended reader.

For generated-text work, the relevant instructions and examples must establish:

- The output's audience, surface and speaker, including whether it is interface guidance, narration or quoted character speech.
- The subject and perspective: who “you” means, which names/descriptions are permitted, and which people or objects the text concerns.
- The facts, uncertainty and disclosure limits already supplied by the owning contract. Good prose never grants more knowledge or changes an outcome.
- The information the player needs, appropriate tone and degree of detail, with representative natural examples and ordinary fallback wording.

Share common requirements through existing owners rather than copying divergent prompt rules. Keep world vocabulary and laws with their authored source. Follow the [AI workflow](../../.agents/skills/openlegend-ai/SKILL.md) when changing prompts or model behavior; this writing standard grants no extra generation calls, retries or new output filtering.

Review complete outputs, not just prompt intent or isolated string fragments. Include relevant successful, unavailable, failed and uncertain states; the current player and another person; unknown names; singular/plural quantities; and fallback text. Select cases by the changed surface instead of creating a universal test matrix. Preserve literal names, quoted speech, temporal meaning and accessible context during composition.

## Review the complete player experience

For each affected surface, ask:

1. **Audience:** What is the player trying to understand, choose or do here? Does the text answer that question?
2. **Naturalness:** Would someone naturally say this to a person playing the game, or does it sound like an explanation of an internal object to the engine? Read the complete sentence aloud.
3. **Perspective:** Who is speaking, who is addressed and who or what is described? Are “you,” names and pronouns unambiguous in this context?
4. **Truth:** Does the wording preserve the actual result, cause, quantity, risk, timing and certainty? Does it stay within this recipient's permitted knowledge?
5. **Usefulness:** Are the relevant consequence, obstacle and available next step clear? Are labels consistent with the real action?
6. **Fit:** Is it compact without losing meaning, appropriate to the speaker, and understandable in the rendered and accessible contexts?
7. **Coverage:** Have affected templates, shared callers, generated examples and fallbacks received the same treatment?

Fix failures in scope at their source. For runtime copy changes, follow [verification policy](../../.agents/rules/verification.md) and exercise relevant rendered/announced behavior; for guidance-only changes, review the documents, links and loading rules. Source checks do not prove runtime readability, actual model quality or that every installed development agent follows the guidance. Existing copy follow-through belongs in [UIUX20](../maintainers/ui-ux.md#uiux20); instruction-dispatch qualification remains in [CG05](../maintainers/agent-guidance.md#cg05--read-only-routing-cases).

## Research basis

The most direct formal basis is Nielsen's principle of matching an interface to the user's familiar concepts. Microsoft's writing guidance supports addressing the reader, natural speech and sufficient context for decisions. Xbox guidance applies clarity and consistent context to game UI, tooltips, errors and screen narration. Game Accessibility Guidelines supports removing unnecessary complexity while preserving tone. Sources and transfer limits are maintained once in the [research ledger](research.md#player-facing-language).

Open Legend's exact wording, viewpoint distinctions and review questions are our application of those principles. The sources do not establish a universal optimum sentence length, require second person everywhere, or certify this game's usability.

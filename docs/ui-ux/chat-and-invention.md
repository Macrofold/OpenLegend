# Agent chat, conversations and invention

[Handbook](README.md) · [Narration owner](../narration-and-conversations.md) · [UI authoring brief](../ui-design-brief.md#world-agent-authoring-and-progressive-technical-detail)

## Conversation is an interface, not the entire product

Chat works well for intent, explanation, clarification and iterative refinement. Collections, exact quantities, comparisons, version review and consequential commitments often need structured controls beside the conversation. Do not make a player retype an item name or scroll through a transcript to find the only actionable version of an invention.

OpenAI's September 2026 documentation describes editable Pages and interactive panels beside conversations; Anthropic's current artifact guidance similarly separates conversation from a reusable work product. These are useful examples of **dialogue plus an inspectable object**, not proof that their entire interfaces are optimal for a game. Their product/version boundaries change; our durable lesson is to keep the working object identifiable and editable without losing the conversation. [A01](research.md#a01) [A02](research.md#a02)

Keep NPC Talk, World Agent authoring and creator diagnostics semantically distinct. A character's speech must not become a provider-job console. A world-editing assistant may need structured validation and installation status that would be inappropriate between in-world utterances.

## Composer contract

The current composer begins on one line and grows with wrapping or explicit newlines. Preserve that behavior. Provide a clearly named Send action, a visible destination/context and understandable disabled reasons. Keep multiline content editable; a proposed growth envelope appears in [UXL04](../limits/ui-ux.md#uxl04), not as a new hard cap on message content.

Enter/Shift+Enter behavior follows the established conversation contract and input method. IME composition must finish before Enter can send. Paste, dictation, undo, text selection and keyboard shortcuts must work normally. Do not send from a keydown handler before checking composition state, or let a parent form submit the same message again.

Store the unsent draft by the actual conversation/actor/world context that owns it. Hiding a panel preserves the draft. Switching tabs must not move text into the wrong conversation. A reconnect or refreshed game projection must not erase the field. Ending a conversation is an explicit lifecycle action, not another name for hiding its panel. Restoring an ended transcript does not resurrect a tombstoned backend identity.

When dispatch succeeds, clear only the draft revision that was sent; text entered while the request was pending must survive. On a failure before acceptance, keep an editable draft or a recoverable failed message. Do not invent unlimited input capacity: existing server and draft limits remain controlling, must be disclosed near their boundary, and must never silently truncate the player's work.

Attachments or referenced entities, when supported, are visible context chips with readable names and a removal action. Distinguish removing a reference from deleting its underlying object. Do not imply the agent can see an entity, private memory or source file merely because the UI can display its name.

## Messages and reading position

Make speaker and conversation identity clear without repeating large badges on every line. Group messages only when chronology and attribution remain understandable. Timestamps can be progressive detail, but failures and changed context cannot be buried in a hover timestamp.

Autoscroll only while the reader is following the bottom, or after their own send when that is the established behavior. When they scroll upward, preserve their position and offer a **New messages** route. Prepending older history must preserve the visible anchor. A late reply belongs in its authoritative chronology; it must not silently reorder what the player is reading or duplicate a turn.

Streaming updates need stable message IDs and a coherent accessible reading strategy. Do not announce every token through an assertive live region. Keep code, long URLs, tables and unusually long invented names within the message layout with a route to the complete content. Selection and copying must not collapse a message or trigger a world action.

Provide read-only history search with explicit scope and continuation. A search result should take the player to the actual message/context, not only copy a disconnected sentence. Private conversations and memories remain scoped by server permission.

## Honest work states without technical clutter

Preserve Open Legend's accepted in-world behavior: the reply's three-dot indicator belongs at the originating message; completed turns have no success badge; technical failure uses the restrained in-message failure treatment with its reason accessible on focus as well as hover. Do not insert queue, retry or provider-stage chatter between character utterances. Actor availability and narrative interruption are not automatically technical failures.

World Agent/invention work can use an adjacent structured status card when the task actually has draft/validation/installation stages. Show only real states. **Thinking**, **Draft ready**, **Needs your choice**, **Validation failed**, **Installing** and **Installed** must correspond to meaningful evidence, not cosmetic elapsed timers. Never display a percentage unless a bounded quantity can genuinely be measured.

A Stop control, when the backend supports it, must state what stops: further generation, pending execution or a current activity. Cancellation does not undo committed effects or prove that no provider cost occurred. Retrying a message or job must preserve identity and existing accounting protections; a network timeout is not proof that the first attempt did nothing. Do not add automatic paid retries in the UI.

Reopening a panel, inspecting a result or selecting an old version is read-only. Those actions cannot restart generation. Hiding work is not cancelling it, and cancelling work is not deleting its transcript.

## Clarification as useful editing

Ask only questions that affect the next meaningful decision. Prefer a compact set of explicit choices when the domain is known, with an editable alternative where appropriate. Show safe defaults and make them revisable. Avoid a long interrogation before giving the player any useful candidate.

A prose question from an agent is not proof that a typed questionnaire protocol exists. The current answer affordance is presentation; do not build authoritative form behavior by guessing structure from punctuation. Where structured clarification is implemented, bind controls to the exact candidate revision and preserve answers across ordinary panel changes.

For a player creating a creature, ask about its experience and behavior, not internal schema fields. Explain important consequences before asking for approval: what can it perceive, affect, consume or change? A detail is not Advanced merely because it has a technical implementation.

## Invention as a revisioned work product

Present one clearly identified candidate with a readable purpose, behavior summary, affected scope, key parameters, reused parts, requirements, unresolved decisions and current status. Put deeper configuration, dependencies and diagnostic evidence behind deliberate inspection. A polished picture cannot cover up an unsupported or unbound mechanic.

Keep discussion, draft, validation, approval, installation and use distinct. Editing an approved candidate invalidates approval where its consequential behavior or scope changed. Show the meaningful before/after difference and route it through existing renewed-review requirements. A user saying **make it stronger** is not a blanket permission to affect more people, spend more or install arbitrary code.

Selecting an earlier version is inspection unless an explicit action requests restoration. Preserve revision identity in asynchronous work: late validation or art for an old candidate must not overwrite the newest draft. A structured control and a conversational edit both change the same candidate, not two diverging copies.

The action-search contract remains: unmatched text can open an editable invention draft; Enter does not dispatch creation, and explicit Send does. Existing Similar inventions and confirmed-conjuring flows remain owned by the current UI brief/workshop contract. Do not add a modal confirmation to every harmless draft edit.

## Mechanics, preview and artwork are separate

A mechanics preview explains intended behavior and evidence, not a guarantee of runtime success. Label static preview, simulated validation and actual committed result distinctly. Expose unsupported parts rather than silently substituting a canned invention. A preview is not permission or execution.

A new item/action receives the current immediate semantic fallback symbol. Optional artwork refinement should not block supported mechanics or wipe the prior usable representation on failure. Separate art status from mechanics status; do not display **Generating art** when no job was requested. Only trusted presentation families and sanitized text can enter the client. Generated HTML, JavaScript or arbitrary CSS is not authorized by an artifact-style UI.

## Acceptance conversations

Compose with an IME; paste multiline text; hide and reopen; switch between actors with unsent drafts; type more while an earlier send is pending; read older messages while a reply arrives; recover after reconnect. For invention, edit during validation, inspect an old revision, receive late art, cancel a pending job and review changed consequential scope. Verify that no operation grants knowledge, spends twice or activates merely because a card looks complete.

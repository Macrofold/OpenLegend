# Agent chat, conversations and invention

[Handbook](README.md) · [Narration owner](../narration-and-conversations.md) · [UI authoring brief](../ui-design-brief.md#world-agent-authoring-and-progressive-technical-detail)

## Conversation is an interface, not the entire product

Chat works well for intent, explanation, clarification and iterative refinement. Collections, exact quantities, comparisons, version review and consequential commitments often need structured controls beside the conversation. Do not make a player retype an item name or scroll through a transcript to find the only actionable version of an invention.

The OpenAI/Anthropic examples illustrate **dialogue plus an inspectable work product**, not proof that their whole interfaces are optimal for a game. Preserve an identifiable editable object without losing conversation; product/version boundaries change. [A01](research.md#a01) [A02](research.md#a02)

Choose structured UI only when it makes the task easier. A compact result card should resolve a small decision, not contain a second conversation composer and deep nested navigation. Move substantial comparison/editing to an explicit workspace retaining the same candidate and conversation. Do not copy host-specific card/action counts or turn every short answer into a card. OpenAI's plugin UI guidelines provide a useful boundary between a conversational result and a larger workspace. [S18](research.md#s18)

The implemented [PW11 workspace](../maintainers/parallel-batch-01-playable-week.md#pw11--inspectable-and-editable-invention-workspace) now appears in the separate **World editor**, with stable **Chat**, **Saved changes** and **Options** navigation within the same owner session. Chat remains the main writing surface; a compact saved-change card leads to exact review. Saved changes has saved-draft collection/detail, exact revision history and comparison, native check findings, and recipe or world-opening forms driven by their native metadata. Hiding or adapting the view retains selection and local edits. These capabilities are implementation coverage; the project's desktop/short/narrow/enlarged interaction qualification and broader assistive-device gates remain open until demonstrated.

Keep in-world Speak, World Agent authoring and creator diagnostics semantically distinct. A character's speech must not become a provider-job console. A world-editing assistant may need structured validation/installation status that does not belong between in-world utterances.

## Learn from game conversations without importing their world rules

The [screenshot atlas](games/README.md) studies FFXIV, Guild Wars 2, World of Warcraft, BG3 and Disco Elysium alongside inventory and crafting games. Learn from explicit speaker/audience cues, a persistent composer, readable dialogue history, local item references and selective channel filtering. Keep natural-language talk primary where the game supports it; short topic suggestions supplement speech rather than turning conversation into an activity questionnaire. MMO channel selection is a persistent audience choice, unlike a dropdown that replaces opening a physical container. The [game dossiers](research.md#game-interface-screenshot-atlas) distinguish player praise from complaints and historical/platform variants.

**Speak** opens a compact text bar from a person or from the surrounding scene. A chosen person is an explicit recipient, not the first nearby person selected automatically. Without a recipient, speaking addresses the surroundings. The selected volume still determines who hears and which words are understood; “Speak to Ada” does not promise privacy. Speaking remains available when the recipient cannot generate a reply or reply funding/configuration is absent: use native directed speech, without retrying a previously refused send or promising a response. Heard words appear above the speaker or with a directional cue and remain readable in **Events**, without a separate conversation window. Readable literary narration is useful; displaying another person's unobserved inner thoughts is not authorized by a reference game's style.

Inventory's **Talk about** prepares a removable chip containing the selected item's permitted name. An explicitly selected available person can remain the recipient; otherwise the words are ordinary ambient speech. Recipient, mode and item-specific drafts never copy words into another person's draft. Removing the chip removes only the spoken prefix. The [world-first presentation](../projects/player-experience-overhaul-feature-spec.md#speaking-and-hearing) supersedes the earlier Talk/Invent split and fixed player transcript layout. The [pinned audit](current-interface-audit.md) remains historical evidence.

Speak uses a bounded growing input and horizontal speech volume. Keep submission/recovery feedback beside the input, while final utterances belong to the world and perceived Events. Invention remains in **Create**; owner authoring keeps its own chat layout.

## Make capability and correction discoverable

A blank World Agent conversation should offer a small set of useful, currently supported examples and make its role clear. Distinguish discussing an idea from changing the world; do not advertise unsupported actions as available merely because the model can describe them. Keep scope/permissions understandable without displaying every schema field. Microsoft HAX recommends capability communication and efficient correction. [S16](research.md#s16)

Let the player correct one useful part without restarting the whole invention: retain unaffected choices, explain the changed behavior and allow direct parameter editing where supported. A conversational correction and a structured edit must converge on the same candidate revision. Preserve the existing validation/renewed-approval boundary; editing is not automatic installation.

Design for **appropriate reliance**, not maximum confidence in the agent. Distinguish inspected facts, checked constraints, generated proposals and unresolved uncertainty. A confidence percentage is not a decoration: use one only with a defined meaning, relevant evidence and demonstrated usefulness. The model's self-rating is not an established probability that an invention will work. PAIR's trust guidance supports evaluating whether explanations improve decisions rather than merely sound reassuring. [S17](research.md#s17)

A linked source establishes provenance of a claim, not necessarily why the model produced it. Generated explanatory prose is not a verified causal trace. Show actual validation evidence and practical next steps; keep diagnostics separate from the plain explanation. Do not hide missing evidence behind a confident tone, and do not bury every useful answer under a repetitive generic disclaimer.

## Composer contract

The composer begins on one line and grows with wrapping or explicit newlines. Preserve that behavior. Provide a named Send action, visible destination/context and understandable disabled reasons. Keep multiline content editable; [UXL04](../limits/ui-ux.md#uxl04) describes a proposed visible growth envelope, not a new content cap.

Enter/Shift+Enter follows the existing conversation and input-method contract. IME composition must finish before Enter sends. Paste, dictation, undo, selection and normal shortcuts must work. Do not submit from keydown before checking composition or let a parent form send a duplicate.

Speak keeps exact unsent words and an optional item mention separately for each recipient, mode, mentioned item, character, world, save timeline and native private-draft identity. Act and Create invention drafts remain separate. Speak/Act use this browser tab's session storage, with in-memory editing when storage is unavailable. Hiding, quiet pause and temporary connection loss retain the draft. Current control still gates sending; rotating that control token does not erase the same owner's words. Owner/world/character or save-timeline replacement and logout clear protected work. A storage-disabled browser cannot restore a draft after the component or browser is destroyed.

Ending a conversation is an explicit lifecycle action, not hiding its panel. Restoring an ended transcript does not resurrect its tombstoned backend identity. Do not put private draft text in URLs to implement resumability. [Persistence](system-feedback.md#classify-navigation-drafts-and-persistence)

Successful dispatch clears only the exact draft revision sent to that destination. Editing while a send is pending, even editing back to identical words, creates a different revision that the old completion cannot clear. A synchronous send guard prevents duplicate activation while pending. Late completions from an older request-access scope are refused; they cannot clear the current draft. A refusal or uncertain request retains the draft and reports the failure. A network failure does not prove that speech never occurred, so inspect Events and reconcile the original send before repeating the words.

The current item chip shows the words that will begin the message, such as **About Copper cup:**. Only explicit Send submits them through the existing speech route. The visible prefix and typed message share the existing route limit: 1,000 characters for a requested direct reply, 1,500 for ambient/native speech; an over-limit combination remains editable with a shortening explanation rather than being truncated. Removing the chip removes that prefix, not the object. This is a permitted name reference, not an attachment or a private inspection grant: it does not reveal hidden contents, disclose memories or transfer custody. Giving an item remains the separate offer-and-accept interaction. Any future richer attachment must retain an explicit remove action and its own permission contract.

## Messages and reading position

Perceived Events, promises, personal story/memories and creator work are related reading tasks with different source and authority meanings. Use consistent return/new-content/paging behavior without merging them into an omniscient feed. Preserve whose words or knowledge are visible; distinguish a suggested beginning, a spoken promise and narration. The [whole-interface reading design](../projects/game-interaction-redesign-feature-spec.md#journal-memory-and-spatial-information) and [coverage map](interface-coverage.md#conversation-journal-and-remembered-events) account for the interfaces beyond the composer. Dated DOS2 transcripts, Disco's remembered opportunities and the MMO journal/map examples support navigation clarity, not universal quest or hidden-thought access.

Make speaker and conversation identity clear without large repetitive badges. Group messages only when chronology/attribution remain understandable. Timestamps may be progressive detail, but failures and changed context cannot be buried there.

Autoscroll while following the bottom, or after the player's own send where established. When reading older content, preserve position and offer **New messages**. Prepending history preserves the visible anchor. Late replies belong in authoritative chronology without disruptive reordering or duplicated turns.

Events preserves its reading place on hide/show and retains admitted prose while the same private owner regains control. It expires paging/source tokens immediately and refreshes using new authority. A changed owner or timeline clears the reader; correction or forgetting removes stale bodies before fresh details render. [Perceived Events](../perceived-world-events.md) owns filters, chronological days/times, search and time navigation.

Streaming needs stable message IDs and a coherent accessible reading strategy, not assertive announcements for each token. Keep code, URLs, tables and long invented names within the layout with access to full content. Selection/copying must not collapse a message or activate the world.

History search is a scoped read with continuation. Take results back to their original context rather than only copying isolated sentences. Server permission governs private conversations and memories.

## Honest work states without technical clutter

Final NPC words appear only after native speech and listener-specific perception. The compact Speak input owns restrained pending, failure and explicit retry feedback; Events contains actual perceived occurrences, not provider status rows. A failed reply never restores or resends the player's already spoken words. Actor availability and narrative interruption are not automatically technical failures. Disabled sending has a reachable explanation. [Disabled controls](controls.md#disabled-controls-and-reachable-explanations)

The October 16 world-first redesign retires the separate player transcript and its provisional preview row. The earlier [NP05 preview qualification](../verification/npc-reply-preview.md#browser-and-recovery-qualification) remains dated evidence for the backend preview service, not proof that provisional words are now spoken, heard or shown overhead. Creator chat streaming retains its separate owner and does not grant NPC speech disclosure.

World Agent/invention work may use adjacent status cards for actual draft/validation/installation stages. **Thinking**, **Draft ready**, **Needs your choice**, **Validation failed**, **Installing** and **Installed** require meaningful underlying states, not decorative elapsed timers. A percentage needs a genuinely measurable bounded quantity.

A supported Stop control explains what stops: generation, pending execution or an activity. Cancellation neither undoes committed effects nor proves zero provider cost. Retrying preserves identity/accounting; a network timeout does not prove the first attempt did nothing. No automatic paid UI retries.

Reopening a panel, inspecting a result or selecting an old version is read-only, never a trigger to restart generation. Hiding, cancelling and deleting a transcript are distinct operations.

## Clarification as useful editing

Ask questions that affect the next meaningful decision. Prefer understandable choices when the domain is known, with an editable alternative where appropriate. Expose safe, revisable defaults rather than conducting a long interrogation before producing anything useful.

A prose question is not proof of a typed questionnaire protocol. The current answer affordance is presentation; do not infer authoritative form structure from punctuation. Where structured clarification is implemented, bind answers to the candidate revision and preserve them through panel changes.

For a creature, ask about experience/behavior rather than internal schema fields. Explain significant scope before approval: what it perceives, affects, consumes or changes. Technical implementation does not make an important choice an Advanced setting.

## Invention as a revisioned work product

Show one identified candidate with purpose, behavior summary, affected scope, key parameters, reused parts, requirements, unresolved decisions and actual status. Put deeper configuration/dependencies/diagnostics behind deliberate inspection. A polished picture cannot conceal unsupported or unbound mechanics.

Keep discussion, draft, validation, approval, installation and use distinct. Consequential changes invalidate approval where required. Show a meaningful before/after and use existing renewed review. **Make it stronger** is not blanket permission to expand population, spending or executable capabilities.

Selecting an older version is inspection unless restoration is explicitly requested. Late validation or artwork for an old revision cannot overwrite the newest draft. Structured and conversational edits update one candidate, not separate copies.

In **Saved changes**, each comparison names its actual before/after revisions and exposes every changed leaf or exact structural value, including fields without a supported editor control. Recipe fields, units, constraints and derived facts come from the native family owner. Preview recomputes the full current local candidate without changing saved work; facts from an older preview are marked out of date. Save creates a new saved revision, Check inspects the exact saved revision, and Prepare opens a separate exact review: Approve/Apply for a change to the existing world, or Start on the selected prepared destination for a new opening. All supported authoring kinds remain readable. Recipes and world openings have direct forms; the other kinds retain readable comparison and their conversational editing route.

Dirty recipe or opening fields persist only on the device under the world/access/session/draft/revision identity. Selecting another draft or revision requires Keep editing or explicit Discard; Discard also clears that private local record. A stale Save retains attempted fields, shows the newer exact revision, and requires deliberate reapplication. Fields absent from refreshed family metadata remain inspectable and block new Save/reapplication rather than being silently lost. Lost acknowledgements retain the original Save/Prepare/Apply identity for explicit native receipt reconciliation, preserving fields typed after the original Save. New mutations are rejected by the server during active/recovering turns and pending questions; read-only inspection continues. [Current limits](../limits/interface.md#iw02--invention-workspace) · [Native receipt/authority evidence and remaining browser/stream gates](../verification/parallel-batch-01-playable-week-engineer-4.md#pw11--exact-saved-work-and-native-receipt-authority)

Ordinary **Create** has stable **Invent**, **Recipes** and **Requests** choices, including when the player also has God mode. **World editor** and **Inspect world** are separate Game entries with their existing authority; inspection is not a creation mode. Recipes show a short name, permitted materials and missing quantities, work time and native action with its refusal reason. **Recipe details** expands the description, output, facts and limitations through the shared recipe component. Request history distinguishes loading, failed reads and an empty collection, and keeps longer evidence behind details. The invention allowance is shown beside Invent, where it affects spending. Similar-invention review uses a padded dialog with a primary continuation, separate retry and cancel, and optional technical detail; navigation never retries a paid request. These presentation changes expose no owner-session drafts, validation controls or creator authority to ordinary players.

Preserve action search: unmatched text can open an editable invention draft; Enter does not dispatch creation and explicit Send does. Similar inventions and confirmed conjuring retain their existing UI/workshop contracts. Do not add confirmation to every harmless edit.

## Mechanics, preview and artwork are separate

A preview explains intended behavior/evidence, not guaranteed success. Distinguish static preview, simulated validation and committed result. Expose unsupported parts rather than substituting hidden canned inventions. Preview grants no execution or permission.

Use immediate semantic fallback symbols for new items/actions. Optional art must not block supported mechanics or erase a usable representation on failure. Separate art status and mechanics status; no **Generating art** without an actual requested job. Only trusted presentation families and safely rendered text enter the client; an artifact-like UI does not authorize generated HTML, JavaScript or arbitrary CSS.

## Acceptance conversations

Use IME, multiline paste, hide/reopen, multiple actors with drafts, new text during a pending send, older-history reading during replies, and reconnect. For invention, test targeted correction, edits during validation, old revision inspection, late artwork, cancellation and changed consequential scope. Check whether a player can explain what is supported, proposed and verified without relying on an invented confidence score. No task may gain knowledge, spend twice or activate because its card looks complete.

Current focused component evidence covers explicit person/item entry, separate recipient/mode drafts, exact-revision send completion, refusal recovery, the combined message limit and loaded-thread hide/reopen behavior. The reconciled same-owner Resume path also preserves the draft while refreshing history access, hides it when control is absent, and rejects late completions across access or owner changes; different-owner and save-timeline cleanup were exercised. These checks use actual components with controlled browser responses, not native PostgreSQL/HTTP or provider execution. Full-scene integration, operating-system IME, assistive-device behavior and the remaining native hearing/offer-consent journeys stay open under [UIUX10–UIUX11](../maintainers/ui-ux.md#uiux10); focused component evidence does not close those gates.

### Current conversation layout

Talk/Invent and the destination remain fixed above message history, with a vertical draggable volume control beside history. The input stays below and grows within its visible envelope before scrolling its text; drafts are not truncated. [CV01](../limits/interface.md#cv01--conversation-reading-space) records current dimensions and the tradeoff of expanding this explicit reading task over more of the world. This supersedes scrolling the volume selector and destination together with messages.

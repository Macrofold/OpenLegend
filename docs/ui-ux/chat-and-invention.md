# Agent chat, conversations and invention

[Handbook](README.md) · [Narration owner](../narration-and-conversations.md) · [UI authoring brief](../ui-design-brief.md#world-agent-authoring-and-progressive-technical-detail)

## Conversation is an interface, not the entire product

Chat works well for intent, explanation, clarification and iterative refinement. Collections, exact quantities, comparisons, version review and consequential commitments often need structured controls beside the conversation. Do not make a player retype an item name or scroll through a transcript to find the only actionable version of an invention.

The OpenAI/Anthropic examples illustrate **dialogue plus an inspectable work product**, not proof that their whole interfaces are optimal for a game. Preserve an identifiable editable object without losing conversation; product/version boundaries change. [A01](research.md#a01) [A02](research.md#a02)

Choose structured UI only when it makes the task easier. A compact result card should resolve a small decision, not contain a second conversation composer and deep nested navigation. Move substantial comparison/editing to an explicit workspace retaining the same candidate and conversation. Do not copy host-specific card/action counts or turn every short answer into a card. OpenAI's plugin UI guidelines provide a useful boundary between a conversational result and a larger workspace. [S18](research.md#s18)

The implemented [PW11 workspace](../maintainers/next-playable-week.md#pw11--inspectable-and-editable-invention-workspace) provides Conversation and Work views within the same owner session. Work has saved-draft collection/detail, exact revision history and comparison, native check findings, and a recipe form driven by installed family metadata. Hiding or adapting the view retains selection and local edits. These capabilities are implementation coverage; the project's desktop/short/narrow/enlarged interaction qualification and broader assistive-device gates remain open until demonstrated.

Keep NPC Talk, World Agent authoring and creator diagnostics semantically distinct. A character's speech must not become a provider-job console. A world-editing assistant may need structured validation/installation status that does not belong between in-world utterances.

## Make capability and correction discoverable

A blank World Agent conversation should offer a small set of useful, currently supported examples and make its role clear. Distinguish discussing an idea from changing the world; do not advertise unsupported actions as available merely because the model can describe them. Keep scope/permissions understandable without displaying every schema field. Microsoft HAX recommends capability communication and efficient correction. [S16](research.md#s16)

Let the player correct one useful part without restarting the whole invention: retain unaffected choices, explain the changed behavior and allow direct parameter editing where supported. A conversational correction and a structured edit must converge on the same candidate revision. Preserve the existing validation/renewed-approval boundary; editing is not automatic installation.

Design for **appropriate reliance**, not maximum confidence in the agent. Distinguish inspected facts, checked constraints, generated proposals and unresolved uncertainty. A confidence percentage is not a decoration: use one only with a defined meaning, relevant evidence and demonstrated usefulness. The model's self-rating is not an established probability that an invention will work. PAIR's trust guidance supports evaluating whether explanations improve decisions rather than merely sound reassuring. [S17](research.md#s17)

A linked source establishes provenance of a claim, not necessarily why the model produced it. Generated explanatory prose is not a verified causal trace. Show actual validation evidence and practical next steps; keep diagnostics separate from the plain explanation. Do not hide missing evidence behind a confident tone, and do not bury every useful answer under a repetitive generic disclaimer.

## Composer contract

The composer begins on one line and grows with wrapping or explicit newlines. Preserve that behavior. Provide a named Send action, visible destination/context and understandable disabled reasons. Keep multiline content editable; [UXL04](../limits/ui-ux.md#uxl04) describes a proposed visible growth envelope, not a new content cap.

Enter/Shift+Enter follows the existing conversation and input-method contract. IME composition must finish before Enter sends. Paste, dictation, undo, selection and normal shortcuts must work. Do not submit from keydown before checking composition or let a parent form send a duplicate.

Store drafts by their actual conversation/actor/world context under the existing storage/privacy policy. Hiding retains a draft; switching tabs does not transfer it; reconnect/refreshed projections do not erase it. Ending a conversation is an explicit lifecycle action, not hiding its panel. Restoring an ended transcript does not resurrect its tombstoned backend identity. Do not put private draft text in URLs to implement resumability. [Persistence](system-feedback.md#classify-navigation-drafts-and-persistence)

When dispatch succeeds, clear only the draft revision that was sent; preserve text entered while pending. On pre-acceptance failure retain an editable draft or recoverable failed message. Existing server/draft limits remain controlling and should be disclosed near the boundary; never silently truncate work.

Supported attachments/entity references appear as named context chips with a remove action. Removing a reference is not deleting its object. Do not imply that the agent can inspect private memories, entities or files simply because the UI can show their names.

## Messages and reading position

Make speaker and conversation identity clear without large repetitive badges. Group messages only when chronology/attribution remain understandable. Timestamps may be progressive detail, but failures and changed context cannot be buried there.

Autoscroll while following the bottom, or after the player's own send where established. When reading older content, preserve position and offer **New messages**. Prepending history preserves the visible anchor. Late replies belong in authoritative chronology without disruptive reordering or duplicated turns.

Streaming needs stable message IDs and a coherent accessible reading strategy, not assertive announcements for each token. Keep code, URLs, tables and long invented names within the layout with access to full content. Selection/copying must not collapse a message or activate the world.

History search is a scoped read with continuation. Take results back to their original context rather than only copying isolated sentences. Server permission governs private conversations and memories.

## Honest work states without technical clutter

Preserve accepted NPC presentation: the reply's three-dot indicator belongs at its originating message; completed turns have no success badge; technical failures retain the restrained in-message label with an accessible reason. No queue/retry/provider-stage chatter between character utterances. Actor availability and narrative interruption are not automatically technical failures. For a disabled composer, provide a reason that remains reachable even when the input is not focusable. [Disabled controls](controls.md#disabled-controls-and-reachable-explanations)

For [NP05 early NPC replies](../projects/completed/next-priority-batch-feature-spec.md#np05--read-npc-replies-before-generation-finishes), Mike explicitly retains **dots as the only visible pending indicator**, before text and beside provisional text until actual heard-history reconciliation. Preserve the accessible waiting description without visible generation-status prose. This supersedes the initial proposed provisional-status sentence. Early text is a separate private temporary row, never a manufactured history message. It clears on lost eligibility, invalid final output, disconnect or scope change. Talk reuses the expanded narrow sheet to keep speech/input readable at enlarged UI scales; only messages scroll, while volume and input retain their own space under [CV01](../limits/interface.md#cv01--conversation-reading-space). [Actual browser evidence](../verification/npc-reply-preview.md#browser-and-recovery-qualification) records draft, reading, layout and recovery coverage and limits.

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

In the current Work view, each comparison names its actual before/after revisions and exposes every changed leaf or exact structural value, including fields without a supported editor control. Recipe fields, units, constraints and derived facts come from the native family owner. Preview recomputes the full current local candidate without changing saved work; facts from an older preview are marked out of date. Save creates a new saved revision, Check inspects the exact saved revision, and Prepare opens its separate exact Approve/Apply review. All seven authoring kinds remain readable; recipe-only forms do not imply direct editing of other kinds.

Dirty recipe fields persist only on the device under the world/access/session/draft/revision identity. Selecting another draft or revision requires Keep editing or explicit Discard; Discard also clears that private local record. A stale Save retains attempted fields, shows the newer exact revision, and requires deliberate reapplication. Fields absent from refreshed family metadata remain inspectable and block new Save/reapplication rather than being silently lost. Lost acknowledgements retain the original Save/Prepare/Apply identity for explicit native receipt reconciliation, preserving fields typed after the original Save. New mutations are rejected by the server during active/recovering turns and pending questions; read-only inspection continues. [Current limits](../limits/interface.md#iw02--invention-workspace) · [Native receipt/authority evidence and remaining browser/stream gates](../verification/next-playable-week-engineer-4.md#pw11--exact-saved-work-and-native-receipt-authority)

Ordinary players keep their distinct learned-recipe surface: permitted materials/availability, actual native output, facts, limitations and Craft. It shares those readable details with the crafting list without exposing owner-session drafts, validation controls or creator authority.

Preserve action search: unmatched text can open an editable invention draft; Enter does not dispatch creation and explicit Send does. Similar inventions and confirmed conjuring retain their existing UI/workshop contracts. Do not add confirmation to every harmless edit.

## Mechanics, preview and artwork are separate

A preview explains intended behavior/evidence, not guaranteed success. Distinguish static preview, simulated validation and committed result. Expose unsupported parts rather than substituting hidden canned inventions. Preview grants no execution or permission.

Use immediate semantic fallback symbols for new items/actions. Optional art must not block supported mechanics or erase a usable representation on failure. Separate art status and mechanics status; no **Generating art** without an actual requested job. Only trusted presentation families and safely rendered text enter the client; an artifact-like UI does not authorize generated HTML, JavaScript or arbitrary CSS.

## Acceptance conversations

Use IME, multiline paste, hide/reopen, multiple actors with drafts, new text during a pending send, older-history reading during replies, and reconnect. For invention, test targeted correction, edits during validation, old revision inspection, late artwork, cancellation and changed consequential scope. Check whether a player can explain what is supported, proposed and verified without relying on an invented confidence score. No task may gain knowledge, spend twice or activate because its card looks complete.

### Current conversation layout

Talk/Invent and the destination remain fixed above message history, with a vertical draggable volume control beside history. The input stays below and grows within its visible envelope before scrolling its text; drafts are not truncated. [CV01](../limits/interface.md#cv01--conversation-reading-space) records current dimensions and the tradeoff of expanding this explicit reading task over more of the world. This supersedes scrolling the volume selector and destination together with messages.

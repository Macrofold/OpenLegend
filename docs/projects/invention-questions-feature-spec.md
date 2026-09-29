# Invention questions: feature specification

**Status: approved implementation target; implementation in progress.** The owner explicitly requested complete implementation of this feature together with the World Agent context foundation. The target below is not yet enabled or qualified. Current OpenCode authoring suppresses its question tool and uses ordinary final-text clarification. The proposal adds structured questions to the existing conversation, preserving [runtime authority, funding and continuation](../world-agent-runtime.md).

## Purpose and scope

Let the agent ask a small, useful question when a person's answer materially changes an invention. Present understandable choices, accept an explicit answer, and continue with that answer retained as human intent. Avoid an interview for routine details the agent can resolve from the request and supported mechanics.

The first release serves the existing authorized World Agent owner conversation, including its invention entry point. It does not grant authoring access to additional players. The interaction should be reusable when player authoring is separately authorized: plain language, abstract remaining usage, no provider economics or invention-count estimates. Existing finite recipe and NPC conversations do not gain a second question system through this project.

## Journeys

### Choose a meaningful tradeoff

A person asks for a sling without specifying its purpose. If the supported mechanics make accuracy and reach a meaningful tradeoff, the agent may ask:

```text
What matters most for this sling?
Choose one. This guides which tradeoff I make in the design.

( ) Accuracy       Favor reliable shots.
( ) Reach          Favor hitting distant targets.
( ) Quick crafting Favor less preparation time.

Or write your own answer: [                                      ]

[Send answer and continue]    [Stop this request]
```

These are illustrative choices, not promised mechanics or a canned recipe. The real agent must use the supplied native mechanics. No answer is preselected. Selecting an option does not submit it. The person may type a different preference when custom answers are allowed. The submitted answer remains visible with the exact question and option meaning.

If the original request already said “favor accuracy,” the agent should proceed, not ask again. A simple well-specified invention should usually reach saved review without questions.

### Clarify a complex request without widening it

“Make a camp bed that helps me recover without using much food” can involve rest, energy, hunger, usable objects and interruption. The agent first reads the supported mechanics. It asks only about an unresolved preference that matters to a supported design. It may group a few closely related choices, with single or multiple selections explicitly labeled.

If no supported item-to-rest-effect binding exists, the agent explains that missing capability. It must not offer a world-wide sleep-policy change as an equivalent bed. A separately requested owner policy change can use the same question UI, but still needs its own supported authoring profile and exact review. Questions create neither mechanics nor permissions.

### Answer later

The application saves the question and stops the originating agent run. The card appears immediately with truthful progress while stopping completes. Once the run has stopped, leaving the panel or returning later retains the question without keeping a model waiting. Shared Worker capacity remains owner-managed; the interface makes no promise that all infrastructure charges stop.

If the previous work is reconciled and current authority permits continuation, **Send answer and continue** saves the answer and explicitly requests one new admitted turn under the same allowance. If stopping, accounting or allowance is still blocking work, **Save answer** retains it without queuing paid work. The card then offers **Continue** when eligible. Reads, reconnects and an allowance increase do not press Continue on the person's behalf.

### Review and refine

After answering, the agent receives the selected draft, relevant supported mechanics, retained requirements and the answer once. It refines through the existing submission owner, saves an immutable revision and ends at review. Choosing “Accuracy,” “Yes,” or “You choose” is never approval to Apply, consume inventory, expand access or increase funding. Exact human review and native execution receipts remain separate.

An answered card is history, not an editable source of changing authority. “Change this answer” starts an explicit correction linked to the original answer; it does not rewrite history or silently alter an approved revision. The correction supersedes the earlier answer for future work. If work on that answer is already running, stop/reconcile that exact turn before continuing with the correction. Corrections count toward the existing conversation history bound, including corrections saved without starting more work.

## Required interaction

- Put question cards inline in the existing World Agent conversation, beside the task/draft they concern. Show one active group; retain previous answered groups in history. No separate wizard, generic form builder or modal that blocks the rest of the game.
- Use plain-English question text and option descriptions, with an optional short heading. Render untrusted content as text. Native questions have no trusted recommendation field; do not infer a recommendation badge or default from label wording.
- Support single selection, multiple selection and free text according to the validated question contract. Clearly label selection mode and whether a custom answer is available. For v1, custom text replaces option selection for that question, avoiding ambiguous mixed answers. Every question in a group requires an explicit nonempty answer before group submission; no silent defaults or invented Skip/Other answers.
- Preserve selections while editing or after a recoverable send failure. An unsent browser draft is not a submitted answer. Server state wins when another tab answers first; keep the local draft available for an explicit later correction without submitting it.
- Use existing accessible form components: labeled groups, keyboard navigation, visible focus, associated descriptions/errors and a polite status announcement. Do not steal focus when a background question arrives. Show pending questions when the conversation is reopened; notifications are outside v1.
- Keep the person's usage bar. Explain blocked continuation in ordinary language: “Answer saved; finishing previous work,” “More usage is needed to continue,” or “This question belongs to an earlier world state.” Owner details may expose the existing accounting explanation.
- Closing the panel is not cancellation. **Stop this request** abandons its unanswered question and cancels any remaining work for that exact turn; it preserves saved drafts and costs. Ordinary conversation remains available after explicit abandonment. No timer chooses an answer.

## Lifecycle and failure behavior

| Situation                                                                                             | Required outcome                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Question received while a native write finishes                                                       | Retain the question, fence further writes and reconcile the committed receipt. Never claim cancellation undid a saved draft.                              |
| Duplicate question event or duplicate answer submission                                               | Show one card and retain one answer/continuation outcome. Changed content under an existing identity conflicts.                                           |
| Two tabs submit different answers                                                                     | Accept one; show the retained answer to the other tab. No second continuation.                                                                            |
| Question is malformed, too large or not supported                                                     | Stop safely with a readable explanation and retained work. Do not truncate choices, parse prose as a replacement form or restart the agent automatically. |
| Stopping or cost reconciliation is uncertain                                                          | Preserve the question/answer and reservations. Block new generation until safe admission is possible.                                                     |
| Browser disconnect                                                                                    | Recover from the server's question, answer and turn records. Never regenerate merely to rebuild the UI.                                                   |
| Server restarts during capture, stopping or continuation                                              | Recover the original operation or mark it uncertain; retain pending questions. No automatic paid restart.                                                 |
| Restore, authorization expiry/revocation, changed disclosure scope or incompatible draft dependencies | Make the old card non-actionable. Recheck access before displaying history; require current-context continuation and confirmation of affected intent.     |
| Supported path is unavailable before dispatch                                                         | Keep the existing ordinary-text clarification path. Do not enable a question tool the application cannot service.                                         |

## Completion criteria

1. A real supported invention asks one relevant native structured question, displays it, accepts a human answer, resumes with that exact intent and saves a valid review. A well-specified control journey does not ask unnecessarily.
2. Multiple selection and custom text survive reopen/reconnect. A non-weapon or supported owner-policy example uses the same contract without a recipe-specific form. Unsupported bed/food mechanics remain explicitly unsupported.
3. Native work stops while the person waits. A later explicit continuation uses the same funding session, preserves previous exposure and creates fresh authorized provider context. No question, answer, reconnect or cancellation grants approval or money.
4. Duplicate delivery, racing answers, lost acknowledgements, cancellation, restart, restore and reduced permissions satisfy the table above. Question text from another principal or world never appears.
5. Actual provider/tool requests contain the selected answer and necessary meaning once; no duplicated form schema, entire transcript or unrelated mechanics. Measure context and time-to-review against the current comparable journey; do not claim efficiency from a smaller isolated prompt.
6. Existing exact review, Apply, replay-safe receipts and spending checks still pass. Browser keyboard/mobile checks and real Macrofold evidence remain distinct from fixture observations.

## Staged delivery and tradeoffs

First qualify the native question event and safe Run termination; then add durable capture and human-answer records; then UI and compact continuation; finally enable the qualified profile after recovery, privacy, accounting and live journeys pass. The focused tracker owns dependencies and exit criteria.

The recommended v1 ends the Run at a question and uses a fresh provider session for continuation. This adds some prompt/startup overhead, but follows the existing rule against idle paid human waits and avoids resuming an unresolved native question tool. Same-run answer delivery is a later optimization only after real suspension, cost, identity and recovery semantics are qualified. It is not required for this feature.

No new effect engine, general questionnaire platform, NPC decision system, multiplayer delegation, parallel question branches, file uploads, rich executable widgets or broad action-repertoire implementation is included. Existing native mechanics, source-backed context, approval and accounting remain their current owners.

## Maintained records

- Implementation: [WW24–WW30](../maintainers/world-agent-writes.md#structured-invention-questions), under INV-2.3 and INV-21.
- Limits and constraints: [QST01–QST04](../limits/inventions.md#structured-invention-question-proposal); existing session/context limits still apply.
- Related design: [technical design](invention-questions-tech-design.md), [context foundation](world-agent-context-tech-design.md) and [current runtime](../world-agent-runtime.md).

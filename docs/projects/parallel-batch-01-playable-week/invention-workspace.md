# Parallel batch 01 — PW11 — Inspect, revise and apply an invention without losing the conversation

**Proposed implementation brief.** Engineer 4: **30 hours**, plus the shared PW06 integration allowance. The [feature specification](../parallel-batch-01-playable-week-feature-spec.md) defines the expanded week; [PW11](../../maintainers/parallel-batch-01-playable-week.md#pw11--inspectable-and-editable-invention-workspace) owns completion. This document is a concrete UI/server task, not authorization to implement it during the planning request.

## Outcome and present gap

A world owner can keep a conversation open while inspecting its saved work, compare two exact revisions, change a supported recipe parameter without another model call, validate the result and deliberately approve/apply that exact revision. They can correct one part without retyping the entire request. A player can inspect a learned recipe and its actual crafting requirements without gaining owner controls.

Current `world-agent-session.tsx` places drafts and review cards below the transcript. `world-agent-review.tsx` shows requirements, dependencies and JSON in a modal, with separate Approve and Apply. The underlying authoring service already stores immutable revisions and supports `ol_draft_read`, `ol_draft_update`, `ol_compare`, `ol_validate` and `ol_change_prepare`. The work is to make these real owners usable through a coherent browser task, not create another draft store or ask a model to rewrite every numeric edit.

## Scope and decisions

- All seven current authoring kinds get a readable summary, validation/coverage display, exact-revision navigation and structural comparison. This does not add an eighth authoring kind.
- Direct structured editing in this slice is **recipe-only**, across every installed family supported by PW02, including the container. Other kinds retain conversational revision and existing exact review; show this distinction explicitly.
- Keep separate Approve and Apply. Editing creates a new immutable revision and requires fresh review; it cannot change an already approved plan or silently apply a new revision.
- Reuse the current panel/sheet system, theme and spacing. A task-specific wider workspace is optional when room exists; narrow layouts use the same selected draft in a single pane, not an extra tiny side panel.
- No new generated art, graph-layout engine, batch Apply, universal JSON editor, autosaved server mutation, paid retry or new creator authority.

## Implementing files and shared ownership

| Area                                                            | Owner/change                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/client/src/ui/world-agent.tsx`, `world-agent-session.tsx` | Engineer 5 keeps turn/progress orchestration; engineer 4 extracts the draft/workspace view. Agree component props before editing the shared session file. |
| `world-agent-review.tsx`, `inventions.tsx`                      | Engineer 4 owns task presentation and recipe inspection; preserve existing review actions and ordinary-player separation.                                 |
| `packages/protocol/src/world-agent.ts`                          | Add read-only revision/presentation projections and typed human-edit requests alongside the existing contract. Engineer 5 owns progress fields.           |
| `apps/server/src/world-authoring.ts`, contracts and HTTP routes | Add thin authenticated human-read/edit routes; share existing draft mutation/receipt/validation logic. Engineer 2 owns family interpretation.             |
| Base-world family descriptors                                   | Supply editable-field labels, units, constraints and derived facts through PW02. No UI switch on sling/bow/container names.                               |
| Shared design-system components/CSS                             | Engineer 4 integrates common layout/input changes; engineer 5 consumes them.                                                                              |

## Required workspace behavior

The panel has two explicit views, **Conversation** and **Work**, with an unread/new-work indicator that does not steal focus. At sufficient width the selected work can sit beside the transcript. View adaptation preserves selected session, draft/revision, comparison baseline, scroll anchor and unsaved edit draft.

```text
World Agent                       conversation / work       Close
Current availability or actual pending operation
----------------------------------------------------------------
Saved work list                  Selected revision
Name / kind / revision           Purpose and supported result
Status and meaningful blocker    Materials / time / consequences
                                 Requirements and native checks
                                 Changed fields, when comparing
                                 Edit | Check | Prepare review
----------------------------------------------------------------
Exact review: Approve / Reject, then Apply approved change
```

On narrow screens, selecting a draft opens detail with a named Back control; returning restores the same list position. Put the primary next action near the selected work, not under the entire chat history. Keep action controls reachable in a short viewport, with their own reserved area and visible error text. Long names wrap in detail; rows use one concise secondary line rather than many badges. Display status text and icon, never color alone.

The draft list is paged through existing session readers. One row represents a draft's latest revision; opening History exposes exact retained revisions. Loading another page cannot replace or mutate the selected exact revision. If the server limit blocks another revision, show the native reason and preserve the local draft; do not discard old history or reset a budget.

## Human-read and edit contract

Use existing POST session-read conventions and `sessionRequest` world/session authority. Expose these operations under the World Agent session boundary; route names may follow the existing HTTP dispatch organization, but request meaning is fixed:

| Operation             | Required arguments                                                                                                       | Result and rule                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read draft            | `worldId`, `sessionId`, `draftId`, exact `revision`                                                                      | Authorized payload, digest, preparation and family presentation. No latest-revision substitution.                                                                     |
| Read revision history | World/session/draft and scoped `before` cursor                                                                           | Bounded immutable revision summaries; full payload only for selected revisions.                                                                                       |
| Compare               | World/session/draft, exact `fromRevision`, `toRevision`                                                                  | Both authorized identities, named changed fields/values, and coverage. Read-only; no validation or authority invented by comparison.                                  |
| Save human revision   | World/session/draft, `expectedRevision`, stable `operationId`, full candidate payload, optional explicitly edited intent | Existing draft-update semantics, new revision and native findings. Same request/body returns the retained result; changed body under the same operation ID conflicts. |
| Preview recipe edit   | World/session/draft, `expectedRevision`, unsaved recipe candidate                                                        | Read-only native family validation/compilation returns permitted derived facts and findings. No revision, plan, world mutation, model call or approval.               |
| Check                 | Exact draft/revision                                                                                                     | Existing native validation; no model call and no installation.                                                                                                        |
| Prepare review        | Exact draft/revision and stable `operationId`                                                                            | Existing immutable review plan bound to the candidate digest and dependencies.                                                                                        |

Add service entrypoints for authenticated human calls analogous to `applyLocal`; never expose the model's `contextHandle` in the browser or pass a browser-supplied claim as local authority. Extract a shared native operation if the existing tool wrapper's run-specific gates cannot be reused directly. Human requests must recheck principal/session/world/timeline and the kind-specific target rules, and use the same serialized record/receipt owner as tool calls. They must not consume a model-tool budget or require a paid run just to edit a draft; existing retained-record quotas still apply.

A state-changing edit is disabled while that session has an active or recovering authoring turn or unanswered question, with a reachable explanation. Read-only inspection continues. Enforce the same active-turn, recovery-turn and unanswered-question gate on the server inside session serialization shared with turn admission and draft writes; UI disabling is not authority. Reconcile an existing operation receipt before rejecting a repeated request, without admitting a new mutation. This single-writer rule avoids racing a human revision against an agent's proposal; other sessions remain subject to normal dependency/revision checks. A draft created by a completed turn remains editable when the session is available and the native quota allows it. Closed/expired/old-timeline sessions are readable according to existing permission but never writable.

Before returning a delayed read or committed edit result, recheck access. A revoked user must not receive private draft contents; an already committed receipt stays stored for authorized reconciliation. The browser handles stale responses by exact request/scope identity, not merely a shared mounted boolean.

## Recipe editor and comparison

PW02 supplies one family schema and presentation descriptor used by model input, native validation and this UI. Render the common name/description/material roles plus that family's supported editable parameters. Derived output facts are read-only. For a container, changing its pouch quantity marks the last derived facts out of date. An explicit **Preview changes** action uses the read-only server operation above to recompute required binding quantity, work, capacity and empty packing load through the same trusted compiler as Save/Check. Run neither a provider call nor a write per keystroke. Bind returned facts to the full local candidate and exact family/draft revision; discard a late preview after another edit. Save validates again. React does not copy the formula, and no editable field directly grants extra capacity.

Keep local field text separate from parsed candidate values. Empty or intermediate numeric text stays editable; Save is unavailable with a specific field explanation until a complete candidate can be submitted. Native validation remains authoritative. Dirty fields survive a failed request or resize. Switching drafts with unsaved changes offers Keep editing or Discard, not silent loss; hiding retains the device-local draft under current private-draft scoping. Do not auto-save each keystroke to the server.

An edit retains unaffected values and the original intent unless the owner deliberately edits that intent. Save creates a new revision; the UI selects it and displays fresh validation. Existing applied revisions and receipts remain read-only historical evidence. Stale `expectedRevision` does not merge automatically; show the newer exact revision, preserve the attempted local edit and let the user deliberately reapply it.

Comparison uses semantic labels where the engine/world already knows the field. Examples: a capacity change, a material quantity change, or a renamed output. Show **Before**, **After**, units and whether the value is validated or merely proposed. For supported kinds without a field template, use named top-level structural changes and expandable exact JSON for missing detail. Do not summarize arbitrary prose as a verified mechanical change or use a model to generate the comparison. No silent omission of an unhandled changed field.

Show native findings grouped as: supported consequence, failed requirement, missing dependency, and untested broader interaction. These labels are explanations of actual recorded findings, not a new validity classifier. A passed native check is not evidence of all requested meaning, field-tested balance or generated artwork. Keep source requirement text available beside the finding, with deeper graph/JSON detail collapsed.

## Ordinary player recipe inspection

The ordinary invention path still admits compatible proposals through current rules; it does not gain a mandatory confirmation dialog. Its result/known-recipe card exposes the same family-derived facts: ingredient quantities, known availability, work, actual output and limitations. A **Craft** action uses the current actor's ordinary native command and rechecks resources; viewing a recipe never crafts it. Owner-only editing, body/law changes, private source graphs and spending details remain absent.

Use the current permitted recipe/knowledge projection, not owner session records copied into player UI. Unknown ingredient availability is unknown. A recipe learned from another actor must reveal only the knowledge currently granted by the existing recipe-sharing rules.

## Implementation order and effort

1. Freeze family editor/read-only fact metadata with engineer 2 and draft/progress component boundaries with engineer 5: **3 h**.
2. Add scoped exact read/history/compare, read-only recipe preview and human-edit/check/prepare adapters reusing the native owner and receipts: **8 h**.
3. Implement Work view, stable history/comparison, recipe parameter draft and exact review actions: **9 h**.
4. Integrate ordinary recipe inspection, current availability and native Craft: **3 h**.
5. Exercise failure/input/privacy scenarios, review diff and reconcile docs: **7 h**.

Approximately **650–1,050 changed logic lines**, excluding tests. Medium/high risk comes from retaining exact revision/authority semantics, not visual complexity. The broad UI framework and a generic policy editor are outside this estimate.

## Acceptance scenarios

| Setup/action                                                 | Required observable result                                                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open a recipe draft while reply text streams                 | Reading and selection stay put; only actual draft readiness enables work actions.                                                                                            |
| Edit a container size, then save                             | Old derived facts become visibly out of date; Preview changes recomputes them natively; Save creates one new immutable revision, no model call or spawned item.              |
| Compare two names plus one numeric field                     | Every change is accessible; units and validation status are clear; exact JSON covers untemplated detail.                                                                     |
| Open an old applied revision                                 | Receipt and exact former values remain readable; editing starts from an allowed current revision, never mutates the historical one.                                          |
| Approve revision A, then create B                            | A's approval cannot apply B; B needs its own exact review and dependency validation.                                                                                         |
| Repeat Save/Prepare/Apply after a lost response              | Same operation identity reconciles once; no duplicate revision, effect or paid call.                                                                                         |
| Agent turn active/recovering or question pending             | Read-only work inspection and retained receipt recovery work; a forged or racing new mutation is rejected atomically with a reason, and no second writer bypasses the owner. |
| Different user edits or access changes during request        | Stale revision rejected; unauthorized late payload withheld; local dirty input is not silently lost or installed.                                                            |
| Closed/expired/session from an earlier save                  | Existing permitted history remains inspectable; editing/Apply stays blocked.                                                                                                 |
| Unsupported field/effect or descriptor version               | Native refusal names the problem; UI cannot forge installation through its form.                                                                                             |
| Ordinary player opens learned container recipe               | Materials/work/output are clear; native Craft behaves normally; no creator controls or private owner data appear.                                                            |
| Keyboard/IME, narrow/short/enlarged layout, long description | Named actions, focus restoration, scrolling and errors remain usable; child dismissal never moves the character.                                                             |

Use the umbrella browser matrix and suitable existing authoring/native HTTP checks. Record actual task completion steps and failures before/after with the same saved fixture. No paid call is needed for structured edits, comparison or validation; streaming/provider quality remains PW05's separately authorized evidence. This document reports no new runtime checks or costs.

## Maintained records

- Implementation: [PW11](../../maintainers/parallel-batch-01-playable-week.md#pw11--inspectable-and-editable-invention-workspace), beneath INV-21 / WW / UIUX05.
- Limits and constraints: [IW02](../../limits/interface.md#iw02--proposed-invention-workspace), existing [authoring limits](../../limits/inventions.md); no new retention ceiling.
- Related design: [week technical design](../parallel-batch-01-playable-week-tech-design.md), [chat/invention handbook](../../ui-ux/chat-and-invention.md), [exact Apply contract](../../invention-workshop-tools.md#5-explicit-apply-and-revision-continuity).

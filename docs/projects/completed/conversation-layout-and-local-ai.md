# Conversation layout and local AI readiness

| Status    | Current progress                                                                                                                 | Last updated |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Compact conversation controls and local AI readiness are verified, including the authorized scoped World Agent workspace grants. | 2026-10-03   |

## Scope and decisions

Replace the cramped conversation layout with fixed Talk/Invent and recipient controls, one independently scrolling message history, and a fixed input. Put a keyboard- and pointer-operated vertical speech-volume slider beside the messages, retaining the existing three speech levels and saved local preference. Remove the previous nested scrolling of controls with messages. Reduce shared body typography modestly and conversation spacing while preserving control targets, focus, drafts and text enlargement. No hearing or speech authority changes.

Diagnose actual local AI readiness separately from the no-paid-AI layout fixture. Start the existing configured local services, finish the previously authorized scoped Macrofold world connection, and verify native worker/inference availability through existing bounded paths. Preserve credentials, actual saves, unrelated edits and other contributors' runtimes. Paid work shares the remaining original $10 task ceiling; previous accounting: $0.037248722 reported usage and $0.510 unresolved reservations. No automatic paid retries.

## Owners and implementation

Client Composer owns local speech volume and drafts; ConversationThread owns message scrolling and reading position. Shared design-system styles own density. Server configuration, existing AI adapters and Macrofold connection/workspace access own readiness and execution. Existing narration, hearing and Macrofold documentation remain canonical.

1. Inspect current client, world speech levels, service configuration, connection lifecycle and relevant UX guidance.
2. Rework the conversation markup and focused styles (~120–180 logic lines); use installed React Aria Slider primitives. Reduce shared body text from 15px to 14px with an appropriate line height, retaining user UI scaling and readable mobile input.
3. Inspect/start actual local services with bounded spending; create/test the implemented world connection. Read-only tool ceiling is configured without organization-wide access. Authoring tools use the approved connection ceiling and exact conversation-workspace grants; the later completion permission and evidence below supersede the initial blocked step. Later permission allowed selecting a fresh current-format Auth0 database while preserving the previous database and backup; no provider fallback was added.
4. Verify long realistic speech, fixed controls, scrolling, slider dragging/keyboard, multiline draft, hide/reopen, narrow/short and enlarged UI. Run focused formatting, type checking and production build. Use native UI checks with zero paid AI; label real-provider evidence separately.
5. Review affected diff and update current UI contract, local setup evidence and remaining Macrofold requirements.

## Base and completion

Work remains on codex/auth0-sign-in in multiplayer-entry-maintenance-ae538d. The original correction used local main 5000749294b9c2d4a536dd31c8bc35e91394cfeb; it contains unrelated camp-supply implementation and documentation changes. The original correction preserved the existing dirty multi-task work without an automatic stash or history rewrite. The later combined implementation was rebased onto exact local main e4d25a06105fbc1321c9a0e7a7a12524e7644ce1, retaining its safe NPC speech previews within the fixed conversation layout.

Complete when messages alone scroll, controls/input remain usable at selected viewports, the slider selects the existing volume levels, density is readable, required static checks and affected-diff review pass, and real AI readiness is established or a specific operator-only blocker is reported. Do not represent a deliberately disabled layout fixture as a configured real backend.

## Result

[CV01](../../limits/interface.md#cv01--conversation-reading-space) records expanded reading space and the visible input envelope. The shared Panel no longer applies desktop drag offsets while nondraggable, fixing offscreen narrow sheets. [Browser evidence](../../verification/multiplayer-entry-maintenance.md#conversation-redesign--october-3-2026) and [real AI evidence](../../verification/macrofold-worker.md#conversation-redesign-ai-readiness--october-3-2026) remain separate. Historical cost for the initial layout correction: $0.037306644 reported usage plus $0.510 unresolved reservations, with no World Agent paid Run in that slice. The later owner-authorized [scoped authoring completion](../../verification/macrofold-worker.md#scoped-local-authoring-completion--october-3-2026) verifies actual native execution and unapproved-plan denial; its recorded cumulative accounted/settled cost is $0.040713644, plus $0.760 unresolved commitments. The [range-guide evidence](../../verification/perception-overlays.md) records final small-window integration and the retained broader qualification gaps.

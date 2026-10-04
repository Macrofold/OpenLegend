# Inventory and everyday play: technical design

| Status      | Current progress                                                                                                               | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Research is complete; the approved inventory, contextual activity and conversation redesign is being implemented and verified. | 2026-10-04   |

[Feature specification](game-interaction-redesign-feature-spec.md) · [Pinned source audit](../ui-ux/current-interface-audit.md) · [Handbook](../ui-ux/README.md)

## Scope, risk and planning

Research was completed first. The subsequent chat continuation authorizes the runtime implementation on the same branch. The implementation crosses world selection, inventory reads, native handling, activity presentation and conversation drafts, so this durable plan and integrated verification remain necessary. No provider calls are needed for the selected native checks.

The primary risks are hidden-content disclosure, moving the wrong item or destination, duplicate/uncertain effects, input falling through into the world, and recreating the form problem through an overly generic replacement. Reuse current semantic owners and their tests. Before implementation, size the concrete changed logic against the then-current source and update the staged plan; a line-count estimate based only on this documentation branch is not an implementation estimate.

## Implementation plan — October 4, 2026 UTC

The chat continuation on October 3 in America/New_York moves this discussed plan into implementation. The working branch remains `docs/game-ui-research-redesign`, initially at `e0bba60a36ab4a19905ed04a8d71ae77ed81e5cb`. GitHub's verified default `main` remains `b50ec6ce75f260d68c18ec99d767982c65b0fccb`; the branch is five documentation commits ahead with no upstream divergence. No history rewrite is needed.

**Estimate and risk:** approximately 2,200–3,200 changed production TypeScript/TSX logic lines, excluding tests, documentation and roughly 300–450 CSS lines. Inventory accounts for 850–1,200, activities 650–950, conversation 230–330, and world entry/shared command/projection work the remainder. This is a substantial coordinated change with custody, privacy, uncertain command outcomes, input ownership and installed-world compatibility risks. The estimate will be refined if actual owners require more work.

| Work                 | Owner and dependencies                                                                                                | Completion evidence                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paired inventory     | Existing inventory projections and transfer/equipment/handover owners; two independently scoped collection components | J01/J03–J09 and J15; real transfers, nested bags, equipment, refusal, narrow/keyboard handling and correct survivor identity after native stack merging.                    |
| World opening        | Main application, object action menu/details, minimal permitted storage projection and native approach goal           | J01/J02/J08; explicit opening/approach, arrival recheck, movement cancellation and no distant/hidden contents.                                                              |
| Activity interaction | Current camp compiler plus world-authored presentation roles; selected-target task panel                              | J10–J12; immediate native fuel action, visible supply/budget/reserve/stop choices, explicit replacement, existing recipe execution and a different installed-world example. |
| Conversation         | Existing composer/history, native private draft namespace and access cleanup                                          | J13/J14; recipient-scoped drafts, send revision fence, preserved older reading, explicit named item mention and existing offer consent.                                     |
| Integrated review    | Real native server/client and existing focused checks, followed by independent affected-diff review                   | J16 and meaningful changed-condition cases; record actual coverage and remaining device/model/human-study limits.                                                           |

**Resolved implementation choices:** quick-move uses the exact inspected available quantity with current native revisions. There is one external collection; each side retains a finite page/window instead of accumulating every page. Equipment uses the installed world's projected actions and comparisons, without new universal slot or favorite rules. Bulk transfer, fixed-chest/workbench construction, new trade economics, multiwindow logistics and an item-art pipeline remain outside the required ordinary-play scope.

The native command owner already persists epoch-scoped receipts and rejects reuse with changed input. Direct handling must retain its original command ID, epoch and exact intention while unresolved, and reuse this owner; transfer may merge a lot into a surviving destination identity. Full request scope participates in the fingerprint, so reconnect/control changes need authoritative receipt recovery rather than a new command ID or inference from counts. Implement only a minimal authorized receipt read if the existing owner cannot expose the needed outcome.

Activity presentation metadata belongs in the installed world definition and uses semantic role mappings. It does not make bundled fire/resource field names universal client rules. Changed installed-host pins retain strict current-format validation; verification uses fresh disposable worlds, and no development save is migrated, reset or deleted. An item discussion chip contributes its visible name to the explicitly sent words; it does not add a hidden attachment, inspection or custody grant. Drafts remain private session data and clear on lost access; the old global draft is not imported into an arbitrary person.

**Verification selection:** inspect the exact existing scripts/fixtures before execution; run changed-file pinned formatting, TypeScript checking and production build, focused native inventory/command/activity checks, and the existing relevant browser interactions where available. Add only a small ad-hoc scenario for missing transfer-receipt or integrated-context coverage; do not recreate a broad suite. All native runs use `AI_BUDGET_USD=0` and disposable PostgreSQL. UI acceptance needs actual interaction and visual inspection; missing dependencies, PostgreSQL, browser or assets are recorded as specific gaps rather than passes. Do not run paid provider work or claim model quality, native IME, assistive-device or uncoached human-usability results without that evidence.

## Maintained records

- Work and gates: [UIUX07–UIUX11](../maintainers/ui-ux.md#uiux07), with PW04/PW06, PO/AC and conversation dependencies.
- Proposed display and behavior envelopes: [UXL06–UXL10](../limits/ui-ux.md#uxl06). Existing read/admission bounds: [interface](../limits/interface.md) and [objects](../limits/objects.md).
- Integrity and extensibility: [engine/world boundaries](../engine-and-world-boundaries.md#5-a-repeatable-boundary-decision), [current-format saves](../save-and-load.md), root development-save policy.
- Current source evidence and precise line links: [audit](../ui-ux/current-interface-audit.md). Names below identify owners, not promises of newly implemented APIs.

## Reuse the current ownership chain

| Concern                                               | Existing owner to extend                                              | Proposed responsibility                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| World selection, inspected subject, panel placement   | Client world interaction and `main.tsx` composition                   | Open an inventory interaction for an exact selected object, rather than discarding that context.                                |
| Collections, selected item, quantities, item controls | Client `inventory.tsx`, `inventory-controls.tsx`, inventory styles    | Own two independently scoped collections and shared item interaction grammar.                                                   |
| Reachable/visible storage discovery                   | Existing destination and storage-selection service                    | Retain bounded permitted discovery for explicit storage search and activity exceptions; remove it as the routine transfer step. |
| Contents, item facts, comparison, visibility          | Server inventory projections                                          | Return only currently permitted direct contents and native fact meanings; keep continuation and stale/unavailable states.       |
| Object movement, stack identity, equipment, custody   | Existing native item-handling/action owners                           | Validate and commit every transfer through one authority, retaining exact receipts and dependent updates.                       |
| Reach and obstruction                                 | Installed world handling policy and spatial queries                   | Establish eligibility and intelligible reasons; never duplicate the 1.6m bundled rule in the client.                            |
| Learned and camp activities                           | Current capability descriptors, native review/admission and execution | Provide semantic roles and permitted contextual choices, then execute through the same native owner.                            |
| Speech, history and previews                          | Current conversation, hearing and narration owners                    | Preserve permitted audience/history, draft identity, provisional reply lifecycle and dots-only pending presentation.            |

The audit distinguishes current file behavior from architectural inference. Final implementation should inspect only affected owners and callers, reuse current context and avoid unrelated subsystem rewrites.

## Interaction state and data flow

An inventory interaction has a controlled actor, world/access/timeline identity, an optional external object, two collection locations, and local presentation state. Each collection retains its own query, sort, continuation, scroll anchor, selected item and read revision. The external object is an exact reference originating in world selection, not a display name or a list row index.

The state progression is:

1. **Selected exterior.** The player knows the object through the permitted world projection. Selection/hover is read-only.
2. **Opening.** Explicit Open requests the object's permitted direct contents. Display loading without temporarily reusing another chest's rows.
3. **Open and usable.** Both collections are tied to exact locations and access state. Item selection and inspection remain reads.
4. **Transfer pending.** The initiating gesture submits an exact native intention. Mark affected rows pending; retain source and target context.
5. **Committed or refused.** Apply the actual receipt/projection, restore useful focus and show any refusal locally.
6. **Unavailable/closed.** Loss of access removes protected contents; hiding closes presentation according to the current lifecycle without reopening, retrying or mutating anything.

Loading, empty, filtered-empty, incomplete, stale, refused and disconnected are separate states. Do not use an empty grid as the visual meaning of all seven. Source revisions and stable identities fence async replies. Switching from chest A to chest B cannot let A's late response populate B. A changed search does not prove a missing selected item was removed.

Opening a world object needs the existing permitted read route, not a new authoritative concept of a globally accessible container session. Add only the minimal projection fields proven missing by the implementation. If an explicit open/read context is needed for privacy, give it bounded lifecycle ownership; do not build an unused session service.

## Direct transfer without weaker authority

Resolve the exact source item, source location, destination location and quantity at the player's commitment. Drag/drop, quick-move, keyboard action and explicit Move button call the same client intention helper and native admission route. They are interaction alternatives, not four mutation implementations.

A routine move needs no additional human review because the two endpoints and item are already visible. It still needs server checks for actor/control identity, custody, permission, supported handling, reach, obstruction, current quantity/capacity, reference validity, containment cycles and applicable equipment constraints. Bind the destination when the gesture starts/commits according to a documented drag contract; a projection update must not redirect a pending move to another pane.

Require a stable request identity and safe uncertain-result recovery through the actual transfer owner. The audit establishes exact native transfer and receipts; it does not establish transfer-specific idempotent recovery. Verify what that owner already supports and reuse it. If the necessary recovery guarantee is absent, implement the smallest owner-level contract and qualify it before direct-transfer completion; do not assume the authoring workspace’s recovery automatically applies. Until a receipt is known, prevent duplicate activation of that exact operation and do not make an optimistic item usable at two locations. A timeout enters unresolved state and reconciles the original request. A second attempt is offered only once the first result is known, or through a verified idempotent recovery contract. Hiding/reopening is never a retry.

Amount edits preserve the target object but invalidate any quantity-dependent preview. Native revalidation can refuse changed capacity without sending the player back to choose the same chest. Quantity draft, selected target and eligibility evidence are distinct pieces of state. Full-stack intent must specify whether it uses the inspected quantity or native all-at-admission semantics; choose and disclose one existing supported contract, never silently reinterpret it during a pending action.

Visual grouping and local order never merge domain objects. Use native split/merge actions where that is the player's intention, preserving individual identity, history, names and state. A generic cell count cannot replace world-defined capacity. A world's slots, volume, mass or other capacity can be presented only through its supported facts.

For bulk transfer, add a native batch contract before claiming a single atomic action. Decide atomic versus explicitly partial semantics, bounded candidates, protected-item rules, result receipts and retry of only the remainder. A front-end loop over all loaded rows cannot promise Take all across unloaded contents. This is a later stage with its own UXL09 gate.

## World opening, movement and reach

Initial Open works on currently reachable permitted objects. Inspecting distant storage remains read-only exterior inspection. **Walk to and open** is an explicit composed intention: establish a valid approach goal; show/cancel current movement; on arrival, recheck exact target, route outcome, reach, obstruction and access; only then request contents. Cancellation, another command, moved/deleted target, world/control change and access loss terminate the continuation. A cancelled attempt must not open a chest later when an old movement callback resolves.

Do not move the character because focus changed or a storage search result became highlighted. A blocked target can still have an explainable action state. Project the current eligibility reason from the existing native owner where available; add a typed reason only if missing. Prefer concise world language over numeric implementation details. If displaying a range guide, derive it from permitted authored policy and the actual interaction geometry, and label approximation where an exact reachable area cannot be calculated.

The base world's 1.6m handling threshold is evidence about that world at the pinned baseline. It is neither a proposed new cap nor a constant to add to React. Remote manipulation, shared stashes or unusual body sizes remain authored capabilities with their own permissions and presentations.

## Replace generic activity forms with semantic presentations

Current descriptors are a useful source of native roles and constraints; they are not a layout. The client should distinguish values bound by the initiating context, sensible permitted defaults, unresolved meaningful choices and specialist inspection.

For each supported activity, define a trusted presentation mapping from its semantic roles to existing primitives: item choice, recipe/output choice, world target selection, quantity, duration/stop condition and current-task summary. The mapping uses stable capability/role identifiers, not English string matching such as an activity name containing “fire.” World-specific vocabulary, compatible resources, example text and policy remain authored in the world package. Shared React components implement reusable interactions only.

Native review/admission receives the complete typed intention even when most fields were derived. Present the derived choices in plain language when they change consequences. Do not ask players to choose an actor they already control or the object they just clicked. Do ask before using a valuable/owned supply, changing a significant stopping condition or replacing existing work. Preserve exact selected references across refusals, but refresh eligibility rather than treating old projections as permission.

Use a small initial set of meaningful activity presentations, not a universal form renderer with dozens of flags. Demonstrate an existing bundled fire/crafting capability and a different already-supported installed-world interaction, such as the charge-source demo. Chest/workbench imagery is illustrative; new fixed-chest or workbench mechanics are not a prerequisite to UI delivery. The second example tests the seam; it does not require implementing a new electrical simulation. Unsupported roles produce a truthful unavailable explanation or a supported guided clarification path, not generated HTML/JavaScript or a field dump marketed as complete gameplay.

## Layout, input and accessibility

Reuse the existing design system, tokens, collection semantics, panel placement and input ownership. The transfer workspace deliberately needs more room than one ordinary 336px panel; exact starting dimensions and compact adaptation belong in UXL07, not copied throughout components. Keep both collection identities visible, let task content reflow, and preserve names, amounts, focus outlines and action reachability at large text sizes.

The grid requires a specified keyboard model and a non-drag transfer route. Do not assume an ARIA role makes a custom grid accessible. Selection, focus, keyboard movement, inspect, transfer and context-menu invocation must remain distinct. Screen-reader names include item identity, quantity and relevant state/location without reciting lore for every cell. Announce committed outcomes and errors concisely; avoid announcing every streamed row or token.

UI input wins over world input in the permitted active layer. Drag capture ends safely on cancellation/blur/lost capture. Escape dismisses one child layer. Scrolling collections does not zoom the camera. Text fields and IME do not dispatch shortcuts. Responsive pane changes preserve the exact same task; they do not reset the quantity or convert an Open interaction into destination discovery.

Preserve the current conversation footer/header/volume arrangement, speech permissions and dots-only waiting. The audit finds one session draft record; implement the feature specification’s recipient/world/controlled-character draft identity as a target, without claiming it already exists. Define scope changes, access loss and retained-draft storage under the current privacy policy. Improvements to item/topic references and person entry reuse that parent, rather than replacing it with an unrelated chat shell. Creator forms and revision approval continue in their explicitly entered workspace.

## Persistence, performance and lifecycle

Native custody/equipment/activity changes persist through their existing mutation and current-format save owners. Grid order, filters and panel state are presentation preferences; classify them under the existing private device/world/account scope before adding storage. Do not put private inventory queries or drafts in URLs. Restored selection is not restored permission; re-read permitted contents before enabling actions. No old-format migration, compatibility wrapper or parallel legacy inventory is introduced.

Opening a chest queries the selected object and the carried collection; it does not enumerate all nearby storage first. Preserve direct-child pagination and bounded scans. Do not recursively hydrate unopened bags, poll every chest each frame, rebuild item art on each quantity change or sort only a loaded page while labeling it globally sorted. Late pages deduplicate by object identity. A complete search may need continuation; report it honestly.

Track total hydrated rows and retained pages independently of per-request limits. Initially bound retained UI data to the two active collections and their existing read contracts; navigation releases obsolete pages unless the established cache owner has a finite policy. The proposed two-pane display does not cap stored possessions. Content/rendering workloads, long names, missing art and changed access need representative measurement before selecting virtualization or a new cache. UXL10 identifies remaining work-bound decisions without inventing benchmark evidence.

## Verification and completion gates

Use the feature specification's J01–J16 as the single scenario list. Run focused existing native checks for handling, access, containment, stacks, equipment and current saves; then exercise the real client through the native server and world-selection entry. A component fixture can help isolate layout but cannot close chest-entry, ongoing-work, NPC speech or custody acceptance. Author new tests only where the verification policy or a concrete uncovered high-risk behavior requires them.

For each delivered slice, record build/ref, input method, viewport/text scale, exact scenario, actual visible result and limits. Check ordinary paths and relevant refusal, cancellation, stale data, competing player, disconnect and request recovery. Observe player task completion without coaching. Retain existing unrun native IME, assistive-device and broad platform qualification until actually performed. Documentation review and screenshot analysis do not close those gates.

Before coding, confirm then-current contracts and refine the concrete diff estimate; implement each complete interaction through its existing semantic owners, update current-behavior documentation, and remove the superseded ordinary UI in the same slice. Continue through the integrated camp journey before claiming the experience is fixed. Runtime testing, implementation and comparative usability measurements were not performed for this research deliverable.

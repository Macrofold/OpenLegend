# UI/UX design bounds and starting values

[Handbook](../ui-ux/README.md) · [Foundations](../ui-ux/foundations.md) · [Follow-through](../maintainers/ui-ux.md) · [Tracking rules](README.md)

UXL01–UXL05 remain **proposed display starting values**, documented September 30–October 1, 2026 against runtime baseline `0382be7`. UXL06–UXL12 distinguish implemented and planned scope/retention/task-hierarchy choices, remaining UI qualification and later capabilities for the October 3–5 whole-interface redesign. Its pre-redesign audit is pinned to `b50ec6c`; [current implementation evidence](../verification/game-interaction-redesign.md) records actual checks and gaps. Adoption is not a claim of universal optimality, a stored-content cap or accessibility conformance. Existing shared values remain in the production guide and [interface inventory](interface.md); the accepted replacement interaction is stated in the [UI brief](../ui-design-brief.md#object-based-inventory-and-everyday-actions).

## UXL01

**Proposed · Restrictiveness: Medium (layout envelope).** Use the existing 4px rhythm; initial CSS-pixel relationship ranges are 4–8 label-to-field, 8 icon-to-label, 12–16 between fields, 24–32 between semantic groups, and 16–24 comfortable panel inset. [Foundations](../ui-ux/foundations.md#spacing-and-dimensions) owns application guidance.

**Reason/tradeoff:** Consistent proximity with room for focus/errors, without turning compact game panels into spacious desktop forms. At the boundary, wrap/stack and grow content; do not clip labels or hide validation. Preserve compact adaptations until deliberately revised. Revisit with long content, enlarged text and real task observations; these are not measured optima.

## UXL02

**Proposed · Restrictiveness: Medium (reading measure).** Start longer prose at about 45–75 characters per line where the workspace permits. Short contextual labels, narrow chat and numerical tables need different measures.

**Reason/tradeoff:** Readability without taking the world away. Wrap rather than enforce a fixed minimum or shrink text. Existing 336/504px panel adaptations remain unchanged. Revisit through reading/scrolling tasks at supported text scales.

## UXL03

**Proposed · Restrictiveness: Safe (preferred target envelope, not content cap).** Prefer roughly 40px targets for new ordinary desktop controls and 44–48px for coarse-pointer/touch operation, while retaining explicitly accepted 32px compact controls until reviewed. Glyphs may remain smaller. The web AA 24×24 CSS-pixel baseline has criterion-specific exceptions; it is not a comfortable-default recommendation. [Accessibility](../ui-ux/react.md#accessibility-is-a-behavior-contract)

**Reason/tradeoff:** Easier targeting costs HUD space. Increase hit area without overlapping neighbors or adjust layout/density; never extend invisible hitboxes across another control. Qualify a retained compact exception in the actual input mode and record the tradeoff. Dimensions alone establish no accessibility pass. Viewport width alone does not identify pointer type.

## UXL04

**Proposed · Restrictiveness: Medium (composer viewport only).** Keep the current one-line initial composer. For future bounded growth, evaluate approximately six visible text lines or about 30% of available panel height, then internal scrolling or an explicit expanded editor, whichever fits the task.

**Reason/tradeoff:** Preserve conversation context and Send/recovery while allowing long drafts. This is not a character limit and never permits truncation. Short viewports/keyboards need another fit strategy, not mechanically enforcing both numbers. Existing message/draft caps stay with interface/server owners. Revisit through multiline/IME/draft-retention scenarios before adoption.

## UXL05

**Proposed · Restrictiveness: Medium (local feedback target).** Aim for visible local input/selection feedback within roughly 100ms under a declared representative device/workload. This is not a guaranteed server/storage/model duration or a new timeout.

**Reason/tradeoff:** Input should not wait for optional computation. Measure distributions and visible stalls instead of one favorable run. If the target is missed, expose truthful pending state and reduce expensive work or bound rendering; do not discard commands or invent success. The 150ms search debounce remains separately recorded in [QU15](interface.md#qu15), not applied to immediate text echo.

**Measurement scope:** Google's good-INP threshold is at most 200ms at the 75th percentile of page visits, with device-class segmentation. It is a different field metric, not an alternate value for this target, a camera frame budget or an end-to-end completion SLA. No INP measurement or telemetry collection was performed. [Source and scope](../ui-ux/research.md#s15)

No universal spinner-delay/minimum-duration or sub-500ms mutation requirement is introduced. If a future feature selects such a behavioral value, record its purpose, boundary behavior and evidence with that feature. Visual smoothing must not falsely extend pending status after a consequential completion/failure.

## UXL06

**Current implementation; full gameplay qualification open · Restrictiveness: Medium (active task scope).** The ordinary transfer workspace presents the player's active carried location and one explicitly opened external object. Opening another external container replaces that side deliberately; carried bags use breadcrumbs. Each side retains one finite contents page under UXL10. This is a UI scope, not a limit on stored containers or possessions. Routine transfer no longer enumerates nearby storage or asks for the open destination again. Explicit storage finding remains a separately entered, permitted bounded read. Quick-move submits the exact inspected available quantity and leaves reserved units behind; it does not expand to all units at admission. [Inventory](../ui-ux/inventory.md#open-the-object-and-keep-both-inventories-visible) · [UIUX08](../maintainers/ui-ux.md#uiux08)

**Reason/tradeoff:** Two identifiable endpoints support direct manipulation and keep the world-object relationship clear. More simultaneous storage windows and remote logistics are outside the first slice. Reach, obstruction, custody and permission remain native world/authority rules; no universal distance is introduced. This replaces the routine picker/review target while retaining its historical implementation evidence in IW01 and the audit.

**Recovery prerequisite:** the chosen client implementation requires the native `commandRecoveryScope` and successful browser storage of the exact pending request before an inventory send. Storage failure refuses the send instead of permitting an unrecoverable uncertain move. Unresolved handling stays blocked while a read-only receipt check uses the original envelope. This is an implementation restriction supporting exact recovery, not a possession limit or authority granted by local storage. [Native recovery contract](../projects/game-interaction-redesign-tech-design.md#direct-transfer-without-weaker-authority)

## UXL07

**Current grid/adaptation implementation; broader fit/input qualification open · Restrictiveness: Medium (display adaptation).** Inventory uses a grid with readable item identification, ordinary focusable item buttons and explicit non-drag transfer. Two collections use an expanded workspace; narrow layouts retain both endpoint identities rather than returning to a destination selector. Focused checks passed the actual 792px Panel and readable paired endpoint names at 390/320px, with retained quantity drafts. Large-text, short-viewport, broader input and real-world checks remain with UIUX08/J09. Exact component dimensions are implementation choices to qualify against real content, not new accepted universal display bounds. No fixed viewport minimum, physical slot count or global inventory cap is declared.

**Reason/tradeoff:** Stable item locations and a visible source/target reduce repeated selection. Label modes and alternative list access serve unfamiliar items and different access needs. Adaptation must preserve selection, amount, focus and reading positions; it cannot reintroduce the destination dropdown. Existing 4px tokens and unrelated 336/504px panel adaptations remain under their owners. [Layout/design](../projects/game-interaction-redesign-tech-design.md#layout-input-and-accessibility) · UIUX08

## UXL08

**Current authored-presentation implementation; full native gameplay qualification open · Restrictiveness: Medium (supported presentation).** Ordinary activities bind known actor/object/item context through a closed set of trusted semantic presentations selected by the installed world. The scope covers supported container, item, gathering, crafting and fire-care interactions plus the constructed body's finite recharge session; it does not claim arbitrary generated UI. A missing presentation reports its supported limitation or uses a genuine guided choice, never an automatic schema-field form. The native immediate fuel action still consumes one unit per activation and labels that amount; this UI change introduces no arbitrary-quantity fuel batch.

**Reason/tradeoff:** Removing unnecessary parameters improves play, but supply budgets, personal reserves, stopping conditions, costs and replacing current work remain visible when consequential. No universal maximum number of actions/choices is introduced. World labels, examples, policy and role compatibility remain authored; generated HTML/code and silent policy defaults are not an extension seam. [Activity design](../projects/game-interaction-redesign-tech-design.md#replace-generic-activity-forms-with-semantic-presentations) · [UIUX09](../maintainers/ui-ux.md#uiux09)

The implemented default is a compact care-task summary that names every consequential current value, with one focused **Supply**, **Amount** or **Stopping** editor open at a time and a reachable explicit Start/replacement action. The all-fields-at-once defect found during visual review is corrected. A focused actual-Panel check verified deliberate editing, retained blanks, exact arguments and action reachability. Native defaults, exact values and role evidence remain unchanged; the [evidence report](../verification/game-interaction-redesign.md#chosen-tasks-and-crafting) retains real native client/server and different-world qualification.

**Current portability boundary:** the trusted presentations are `resource-care`, `gather-store-use` and `replenish-session`. The new reservoir recharge host binds a compatible perceived source and current-work mode, then composes the existing finite native recharge operation. It does not invent fuel/material/reserve choices for constructed bodies. The existing native duration, drain, supply/capacity and partial-transfer behavior remain authoritative; full supply depletion or a filled reservoir can end the session early, and stopping retains completed transfers. Its contextual choices reuse the existing bounded first-32-visible-entities activity window with explicit omission; selecting an exact object remains a separate permitted read. Installed base hosts stay separate from the reservoir/touch recharge host; adding a trusted host does not install it in every world.

**Decision history and evidence:** the [October 4 correction](../verification/game-interaction-redesign.md#world-portability-correction) correctly identified already-existing touch/reservoir presets and native recharge but no longer-task host for that path. The subsequent implementation and real native bind/preview/cancel/current-record roundtrip checks resolve that missing example. Shared inventory presentation now consumes authored item/action metadata and native preparation facts. Optional valid world presentation metadata has a generic fallback when absent and imposes no new save incompatibility. The host/icon catalogues remain finite trusted support; neither a different theme, capability absence nor this one different task establishes arbitrary-world UI semantics. [UIUX17 and remaining qualification](../maintainers/ui-ux.md#uiux17)

## UXL09

**Proposed later capability, not delivered · Restrictiveness: Very safe (bulk operation boundary).** Initial direct handling does not require Take all, Deposit matching, automatic nearby deposits, new trade economics or multiple external windows. Add bulk conveniences only with explicit native scope, atomic/partial outcomes, protected-item treatment and request-recovery semantics. A client loop over loaded rows is not a complete or atomic batch.

**Reason/tradeoff:** Ordinary container handling can ship as a complete interaction while batch guarantees are designed. This is not a ban on later chore reduction; Terraria, Stardew and GW2 are evidence for useful options with distinct scope. Define candidate/read/write bounds with the actual owner before implementing a batch; no guessed batch size is adopted here. [Bulk semantics](../projects/game-interaction-redesign-tech-design.md#direct-transfer-without-weaker-authority) · UIUX08/PO

## UXL10

**Current bounded page retention; scale unmeasured · Restrictiveness: Medium (two active collection pages).** Each collection retains one finite native direct-contents page; navigation replaces it instead of accumulating all visited pages. Independent searches and continuations preserve access to later permitted contents. Revision/access changes invalidate the retained read; an obsolete continuation is discarded and recovery restarts from the first page rather than repeatedly submitting a stale cursor. Selection/quantity drafts are separate from the page and do not silently change item or destination. Existing direct-content/destination result and candidate limits remain under IW01 and object-query owners.

**Decision history:** the research phase left page retention undecided and identified unbounded accumulation as a risk. The implemented one-page-per-side choice resolves that UI retention decision. It does not impose a total stored-inventory cap or certify total retained bytes across unrelated history/detail owners. Final large-content, concurrent-change and recovery qualification remains open in UIUX08 and the [verification report](../verification/game-interaction-redesign.md).

**Reason/tradeoff:** Complete permitted search and stored collections remain available through continuation without hydrating all bags or scanning nearby storage on every open. Cold index construction, native admission, total history and authored collection size are separate costs; a small rendered grid proves none are bounded. [Performance/lifecycle design](../projects/game-interaction-redesign-tech-design.md#persistence-performance-and-lifecycle) · UIUX08; existing performance owners retain measurement authority.

## UXL11

**Current whole-interface task/role hierarchy; broader qualification open · Restrictiveness: Medium (presentation scope).** Immediate character/world/current-work context remains available while deeper tasks use deliberate entries: Character actions and explicit subject selection, Journal sections, purpose/scope-based Settings, named Checkpoints, creator work and permission-gated operations/diagnostics. Retained task components preserve supported selection, reading and drafts through navigation; inactive tasks suspend their ordinary reads where implemented. The shared panel/sheet adaptation and existing finite query/history owners still define layout and data bounds. This introduces no maximum panel/tab count, viewport minimum, stored-history cap or new authority restriction.

**Reason/tradeoff:** Simultaneously exposing every possible menu competes with exploration and the active decision. Contextual and role-aware entry reduces that competition while retaining discoverable access to supported depth, including the ordinary character's own Private mind and invention workshop. World targeting keeps the scene usable; a readable candidate list is an alternative entry, not a mandatory full-screen action form. Current cancellation is labeled **Stop all work**, including suspended work; narrower cancellation remains conditional on native scope support. Review the implemented arrangement using J17–J48 and actual populated scenes. [Whole-interface design](../projects/game-interaction-redesign-feature-spec.md#one-coherent-interface-across-the-whole-game) · [UIUX12–UIUX18](../maintainers/ui-ux.md#uiux12)

**Evidence boundary:** actual App/PlayCanvas checks with native base/reservoir projections and controlled transport cover selected desktop/390/320px tasks and 130% component UI scale. Additional controlled reading/editor/lifecycle/operations checks cover specific focus, draft, uncertainty and wrapping behavior. These workload sizes are evidence, not accepted universal limits. They do not qualify authenticated PostgreSQL gameplay, all text/short-viewport combinations, native OS IME, assistive devices or uncoached usability. Existing inventory page/possession, recipient/trade, scale and recovery gaps remain with UXL06–UXL10 and their owners. [Current evidence](../verification/game-interaction-redesign.md)

## UXL12

**Planned implementation; native/browser qualification pending · Restrictiveness: Medium (one unresolved creator request).** Item, person and environment creation share one unresolved request per native private namespace, world, save timeline and actor. A new creation waits until the original outcome and matching local cleanup are resolved. The browser must successfully retain and read back the exact request before sending; inaccessible or corrupt storage blocks that creator action. Unrelated play, supported creation kinds and valid quantities remain unaffected.

**Reason/tradeoff:** Closing a dialog, changing a destination or reloading must not turn an uncertain successful creation into a second effect. **Retry original creation** is an explicit mutation that can recover or perform the original request, never an automatic check. A later refusal does not erase an earlier unknown outcome. This trades simultaneous creator creation for understandable recovery using the existing native receipt owner. Same-owner reload retains the request; logout/private-access loss, owner change and another save timeline follow existing private cleanup. The boundary is not account-wide recovery across cleared browser storage. Revisit only with a supported multiple-request task model, preserving exact identities and scope. [Feature behavior](../projects/game-interaction-redesign-feature-spec.md#direct-world-and-character-editing) · [Implementation plan](../projects/game-interaction-redesign-tech-design.md#recover-item-person-and-environment-creation) · [UIUX15](../maintainers/ui-ux.md#uiux15)

## Existing bounds and non-limits

The handbook changes no existing popup row counts, notice lifetimes, quick-action counts, query lengths, page sizes, camera angles, save retention or data capacity. Current values and historical qualifications remain with their owners: [HV01](interface.md#hv01), [QU11](interface.md#qu11), [QU15](interface.md#qu15), [LA223](interface.md#la223) and [object queries](objects.md).

Responsive fit equations are methods, not fixed minimum world dimensions. The handbook supplies no universal maximum menu items, inventory size or tabs; that does not declare runtime work unbounded. Existing data/authority/performance limits still apply. Test workloads are fixtures, not product restrictions. Vendor-specific pane ratios, card counts and timing conventions are not silently adopted.

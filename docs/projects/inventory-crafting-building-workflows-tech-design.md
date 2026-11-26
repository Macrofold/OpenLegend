# Inventory, crafting and building workflows — follow-on technical design

| Status      | Current progress                                                                                                           | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | The design maps the proposed workflows onto existing owners; implementation, integration and runtime evidence remain open. | 2026-10-14   |

**Design-only request, October 14, 2026.** Parent design identities: [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) for player controls and [ND07](../maintainers/needs-design.md#nd07--editable-buildings-that-become-usable-homes) for shelter interaction. ICB module IDs below identify this follow-on's work, not replacement ND entries or a second global task register.

## Maintained records

- Behavior, scope and complete player journeys: [feature specification](inventory-crafting-building-workflows-feature-spec.md).
- Single detailed task owner: [ICB01–ICB07](../maintainers/inventory-crafting-building-workflows.md).
- New proposed restrictions: [workflow limits](../limits/inventory-crafting-building-workflows.md); inherited activity, object, interface, shelter, persistence and native-work limits remain in their existing owners.
- Current contracts: [action admission](../action-capabilities.md#action-availability-and-temporary-execution), [action/continuation records](../action-experience.md), [items and equipment](../worlds/base/items.md), [shelter technical design](editable-shelters-tech-design.md), [spatial behavior](../spatial-world.md#physical-interaction-design-checks), [complete-operation authority](../engine-and-world-boundaries.md#complete-operation-authorization), [save/load](../save-and-load.md) and [UI handbook](../ui-ux/README.md).

## 1. Baseline, risk and ownership

Inspected published main: `1cf678802d62652d8dd466776d4b95a9d0d19166`. Relevant implementation samples were `apps/client/src/ui/inventory.tsx`, `recipe-details.tsx`, `construction.tsx` and `packages/protocol/src/construction.ts`, alongside their current contracts and PW04/SH trackers. This establishes specific existing fields and routes, not a new certification of every caller.

No runtime lines change in this design task. Future implementation is cross-layer work with material risks: editing a plan after some of it has executed, a compound custody/equipment change, stale spatial review, and private recipe/item disclosure. The design therefore supplies explicit commit boundaries and scenarios instead of treating this as a cosmetic screen change.

| Responsibility                                           | Existing owner / inspected entry point                                                                            | Intended extension                                                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Inventory navigation, selected detail and quantity draft | `apps/client/src/ui/inventory.tsx`, `inventory-controls`, `inventory-destinations`; PW04 and inventory handbook   | Preserve task context between existing panels; reuse exact quantities and lazy destination discovery                     |
| Recipe detail                                            | `apps/client/src/ui/recipe-details.tsx` consumes `RecipeDetailsView`                                              | Separate planned output from receipts and held from usable stock; add finite-count/list affordances in the owning parent |
| Current action choices and commands                      | Existing action catalogue/preview, `apps/server/src/world-service.ts`, `http.ts`, and native admission            | Add only the scoped request/response variants below; no UI-owned permission or rule calculation                          |
| Finite work and actual outputs                           | Existing `ActorPlan`, `packages/domain/src/activity-execution.ts`, `action-experience.ts`, `agency.ts` and kernel | Compile a chosen finite manufacture list; exact pending-suffix edit under the same plan owner                            |
| Custody, conflicts and capacity                          | Existing object placement/quantity/reservation owners and installed equipment rules; PO04/PO10                    | Evaluate and commit the destination-aware immediate exchange as one native operation                                     |
| Construction                                             | Existing `ConstructionPlan`, `/api/construction`, `construction.tsx` and the SH evaluator/phase owner             | Draft site picking, permitted alignment candidates and richer check/disposition presentation                             |
| Scene preview                                            | Existing plain `ConstructionShape` and renderer boundary                                                          | Show draft versus checked shapes without extra world knowledge, physics or React updates per frame                       |
| Durability                                               | Existing WorldService publication and PostgreSQL record catalogue                                                 | Persist accepted plan changes/receipts through their semantic owners; no independent queue table or save format          |

Source filenames identify current owners; proposed fields and operations below are **design contracts**, not assertions that matching exports already exist. Prefer a small feature-local child component when needed, not a second UI framework or one universal component with unrelated modes.

## 2. Shared read, review and command lifecycle

Use the existing authenticated actor/world/access/timeline scope. Every task draft references semantic IDs and exact choices, not row indexes or labels. Identical names remain distinguishable using permitted location/context. Opening a draft or convenience preview cannot reserve, split, consume, allocate durable IDs, sample randomness, interrupt work, create history or call a provider. An explicitly chosen Inspect action remains distinct: its existing observation owner may record the permitted facts actually inspected. Do not remove that behavior or secretly dispatch Inspect from hover, refresh or a recipe convenience preview.

The lifecycle is: **select → read permitted facts → draft exact intent → evaluate → review → submit through current native admission → commit and persist → receipt → refresh affected views**. The same existing rule owner supplies preview and execution checks. Where the current owner still needs isolated temporary execution for a complete preview, preserve it until equivalent pure evaluation is actually qualified; do not skip a refusal to make the new UI faster.

A review key covers its actual dependencies: actor/body/life/control, access scope, relevant recipe/family/installed meaning, source quantities/conditions/holds, equipment attachments, source/destination contents and capacity, plan identity/revision, or construction geometry as appropriate. A public view alone does not necessarily contain every authorization dependency; retain the complete server-side prepared values or owner revisions needed for admission. Recheck current conditions at the real effect boundary.

Changed inputs invalidate the review, not the user's intent. Late results are accepted only for the same scope and exact draft/check identity. Disconnection, access loss, selected-actor replacement or timeline change suppress old actionable/private projections immediately. A retained local amount cannot restore permission. Reopening performs a read, never resubmits a mutation.

Existing request identity/receipts govern duplicate submission and lost acknowledgement. While uncertain, expose recovery of the original outcome; do not issue a new request ID automatically. A failed read, refused action, required preparation and an operation with an unknown outcome are different states. Announce only actual committed results, with preserved exact quantities and references.

## 3. Recipe facts and workflow handoff

Extend the existing permitted recipe-detail producer rather than calculating materials in the browser. A selected detail needs the following meanings, whether represented by existing facts or new typed fields: recipe/definition identity and known-source scope; declared prerequisites; requested count; per-role required units; total and currently usable units with known holds; explicit planned-output dependencies; native work and cancellation consequences; and the declared output ports/properties. Avoid a second mutable stock total or client recipe evaluator.

The current `RecipeDetails` component labels `ingredient.available` as currently held and displays a singular `output`. Do not simply relabel that number as usable: trace the producer and derive usable units through the quantity/reservation owner. Retain held totals where useful. The supported manufacture families can keep their existing single-output representation; any admitted multi-output preparation shown in this workspace must expose all declared ports or remain explicitly outside the first list consumer. Never drop secondary products to fit a card.

Use **Makes** for a recipe's declared result. A completed row receives **Made** only from the native occurrence/output receipt. Its Inventory/Inspect/Use handoff targets the actual returned object or lot; a merged output needs the receipt's receiver/quantity, not an imagined newly allocated object.

Only known installed methods enter ordinary recipe search. Product possession, appearance, creator catalogue visibility or a remembered private recipe name cannot grant knowledge. Related-recipe shortcuts follow existing permitted relations; absent knowledge offers an honest explanation or the ordinary supported inquiry/invention route without dispatching it. Stable metadata selection precedes expensive ingredient/detail work. The new workflow list uses the proposed paging envelope in ICB-L02 and retains an explicit route to existing broader discovery.

Private unsent work-list and placement drafts stay in the currently mounted, scoped client task state for the first release. Preserve them across panel hiding, adaptation and same-scope transport reconnection. This proposal does not add browser local-storage or cross-device draft retention; reload can lose unsent drafts, and the UI must not promise otherwise. Accepted work is server-owned and durable. Existing inventory/private-work persistence remains unchanged.

## 4. Finite crafting list and suffix editing

### 4.1 One execution owner

A draft entry contains a stable client row key, exact known recipe/installed support pin, finite requested count, selected supported arguments and any explicit dependency on a preceding row's named output. It contains no executable prose, callback, new recipe definition or permission grant. Validate and compile the whole finite shape through the existing requested-composition owner. Reuse native invocation/sequence/repeat controls and [AEL01](../limits/action-experience.md#ael01); do not make the active-window size a new total-list limit. Check representability before expanding a count into rows or nodes: retain an oversized numeric draft as an explained invalid field rather than allocate its requested number of entries. Draft structure and accepted work must fit the same native representation budget; client preflight is convenience, not authority.

After acceptance, the native plan is the sole authoritative list. Preserve source row identity as bounded presentation metadata on that plan's existing structure, with node/output mappings in the same owner. Do not maintain a separate server list whose progress can diverge from the executor. Future predicted outputs remain roles until actual receipts bind them. Existing immutable definition/pin and current-format validation cover the compiled form.

Structural validation covers the full finite list, known supported recipes, references and dependency order. Starting checks the next action's current prerequisites through the shared admission path; later stock, tools, station availability or capacity are not promised. The review can show deterministic declared totals and known future shortages without simulating future world events. Native per-step admission obtains that step's normal resource claims and preserves its start/completion consumption semantics.

Adding a client draft entry while another activity runs does not replace it. Starting a new accepted list requires the existing explicit replace/interrupt decision and its native permission/cost checks. No queue worker competes with the actor's current physical lane. A completion schedules only the already accepted finite next step under the existing executor, never an unbounded refill loop.

### 4.2 Exact pending-suffix edit

The new edit request names the current plan identity and revision and a replacement for its not-yet-started suffix. If the plan owner lacks an adequate edit revision, add one there and capture it in the existing plan codec; do not create an independent revision service. Accepted structure changes and changes to which invocation has started/completed advance this edit dependency. Elapsed-time/progress updates within the same running invocation do not by themselves invalidate an independent suffix edit or require resetting the current craft. Other materially relevant authority or dependency changes still invalidate it.

At native admission, locate the actual execution frontier. Reject a request that targets a completed node, the running native step, another actor/plan, a stale revision or an unsupported control shape. The first editing consumer accepts the craft-only linear/finite-repeat structure it generated, not arbitrary branches or somebody else's standing routine.

Validate the proposed suffix and its actual producer references before changing anything. Completed/current output bindings remain fixed. A producer cannot be deleted while a later retained consumer requires its output, nor moved after that consumer; an explicitly rebound valid suffix is a different reviewed request. Removing a later independent row requires no mutation of the current step. Replacing all remaining entries still leaves the already running step unless Stop is separately chosen.

For a counted row, describe the requested edit in remaining invocations, separate from already completed units and the currently started unit. Preserve the executor's repeat/frontier counters and per-iteration output identity; never restart a repeat at iteration zero or retarget an already bound consumer. An edit whose required dependency mapping cannot be represented safely refuses rather than guessing. Retain cumulative execution/expansion accounting across edits and evaluate spent work plus the proposed remaining allowance against the same native limits. Repeated appends cannot replenish an exhausted plan budget or evade record-size admission.

Publish the accepted suffix and revision atomically through the existing plan owner. Do not reconstruct a new plan from the beginning, reset elapsed progress, replay start consumption, clear actual output receipts or release claims owned by the current step. A change of current step/frontier between review and submit makes the old edit stale; an ordinary timer update alone does not. The response returns the current safe list and explains a genuine conflict; the client does not guess which edit would now be equivalent.

### 4.3 Lifecycle and persistence

Stop, interrupt, wait, blocked and resume keep the existing family's meanings. In particular, current manufacture that consumes material at start does not gain a refund or resumable partial product merely because it is listed. Expose a supported pause only when the owning operation supplies it. Manual world pause permits the existing cancellation/read exceptions, not new physical starts or durable plan edits; the player can still change an unsent local draft.

Ordinary departure/death/control loss applies through existing participation owners and can cancel unfinished human work. Server recovery and gameplay restore rebuild the accepted frontier and actual outputs from current-format records; a new timeline invalidates old reviews, callbacks and client drafts. Reopening an ended list shows its real terminal state, not an invitation to resume canceled work under the old authority. A new attempt is separately chosen.

New plan metadata, if required, joins existing native validation, `WorldRecords`/record codecs and consistent capture/restore. Follow the root development-save policy; no compatibility reader, conversion or second feature version is introduced. Receipts/private history retain their existing retention and publication owners. No plan-wide advance reservation, new provider operation or independent database scheduler is required.

## 5. Exact acquisition and destination-aware equipment exchange

### 5.1 Preserve current commands

The ordinary selected-item transfer continues to use the existing source/destination/quantity review and native command. The UI handoff carries the source until completion and points to actual result identity afterward. Keep current timed ground pickup and dynamic Pick Up All semantics as documented in [items](../worlds/base/items.md#pickup-and-drop). Do not hide them behind a new atomic label or broaden access to an unopened private container.

Comparison remains deliberate and native-projected: same known characteristic identities, units and conditions against the actual equipped counterpart. Missing information remains unknown. No universal score, rarity-based junk rule, equipment auto-selection or bulk-disposal system is introduced.

### 5.2 Compound immediate operation

The proposed exact **Equip and stow** intent contains the incoming accessible source unit/lot and revision, intended admitted equipment attachment, expected current conflicting attachments, and an explicit allowed destination for every displaced unit. Actor identity and authority come from the authenticated execution scope, not a trusted body supplied by the client. For a lot, the intent selects one unit; native individualization still creates its actual identity and lineage once.

Reuse or extract the existing object owner's final-placement preflight already used for reciprocal net-capacity reasoning, and the equipment owner's compatibility/conflict calculation. This shared helper is an implementation candidate, not a claim that a particular generalized API already exists. It must account for all affected ancestors and destinations, including a bag both losing the candidate and receiving a conflict. Do not reject solely because a sequential imaginary intermediate state would be full.

The complete preflight checks current source/custody/access, permitted immediate movement, equipment definition and body places, current activity/reservations, all conflicts, quantities/condition, cycles/depth and final net capacity. Unknown load is not zero. Installed/lowered construction parts cannot be borrowed by bypassing their owner. Two-hand conflicts are resolved from the installed definition, not a hard-coded single offhand slot.

Only then commit through **one native command draft and publication transaction**, using the existing custody and equipment mutation owners. Capture qualifying authority before moving parts changes the relationships used to establish it. Update exact placements, any individualization/lineage, capacities, action result and receipt consistently. A failure at any point discards the whole draft; neither observers nor another command see an intermediate unequip or duplicated item.

The first release does not combine an operation requiring approach, elapsed pickup or an unsupported timed equipment action into this immediate transaction. Offer the ordinary separate route with its real costs. This is a deliberate scope limit, not permission to silently zero those costs. The immediate exchange is not inserted into reusable crafting plans: current revision-bound inventory restrictions remain intact.

A valid preview names **candidate from A → equipment; displaced item from equipment → B**, including multiple conflicts when supported, and the resulting relevant capacity. A changed destination/access/hold invalidates the review and fails current admission without automatic ground fallback. Lost acknowledgement recovers the original exact receipt rather than repeating individualization or movement.

## 6. Construction draft, check and disposition

### 6.1 Reuse the current family and plan

Current `ConstructionPlan` already carries family/arrangement, site, supported orientation, operation, exact posts/cover/bindings, outgoing part, destination, expected revision and keep-covered constraint. Its operations include build, extend, replace, lower, dismantle, resume and reclaim. Keep those meanings. A workflow does not authorize walls, doors, tier upgrades, another bay, new slope combinations or a different material family.

The current `ConstructionView` separates total and available material quantity, eligibility/reason/condition, family arrangements and permitted geometry. Build the richer review from these owners and the SH evaluator, not by reproducing resource/support rules in React. Shared contract additions should be narrowly typed permitted outcomes, not raw private entity graphs.

### 6.2 Site selection and alignment

Use the existing renderer-intent boundary for a draft support point and supported orientation. Site-picking mode captures its selection gesture; release cannot also walk or start work. Existing camera controls still work in their own gesture scope. Provide focusable native-form alternatives and explicit exit; window blur/lost capture leaves no pending unintended click.

Alignment candidates come only from the selected family's supported layout and permitted nearby compatible anchors. Compute a suggested draft against that finite candidate view, with stable selection and optional manual adjustment; never query the entire world or request a server check every rendered frame. An advertised anchor needs the same actual source identity and supported contact meaning as native evaluation. No visible anchor can imply hidden contents, construction rights or material supply.

Initially Check is explicit. Draft movement updates the local outline and marks it not checked; it does not run full geometry admission per pointer movement. Permit at most one current check per active construction workspace, cancel/supersede an older read and retain only the newest pending intent. Existing dependency refresh may invalidate a check without automatically rerunning expensive evaluation. Do not add a second polling loop alongside the current construction reader.

### 6.3 Checked facts and changing geometry

A review returns its exact draft identity, permitted part shapes, source dependency identity, available/required material facts, declared work and a disposition of ready, blocked, incomplete/preparing or failed. It includes only supported use/coverage facts and permission-safe reasons. The UI's text/outline states distinguish a draft from a last-checked result; a successful prior result cannot remain visually current after a relevant change.

Reuse current SH complete material/permission evaluation and geometry/navigation preparation. Dependencies include selected material usable stock and condition, family meaning, edited root/parts, exact support/orientation and relevant occupancy/geometry. If the current owner cannot prove narrower invalidation, use its conservative existing dependency rather than an unsafe cache. Rendering may keep the desired outline for orientation while hiding its stale ready indication.

Native evaluation sees physical blockers even when the actor cannot identify them; disclosure remains separately fenced. For example, a general cannot-place result must not expose an unseen person's name, private inventory or exact hidden shape. Start independently checks current placement, working stances, access and resources; no preview locks the site against later occupants.

### 6.4 Replacement and correction

Show a replacement's complete incoming/outgoing disposition, including bindings and intermediate supported coverage, before it starts. Every affected material and destination belongs in authorization and capacity preflight. A single `destinationId` may be reused only when it faithfully expresses the actual operation; a more detailed permitted display cannot pretend several distinct destinations were selected. Extend the existing family plan only if the chosen new disposition genuinely needs it and is fully admitted there.

Keep-covered remains a hard constraint on that selected request. The existing two-layer/two-socket and unsupported-overlap refusals remain. A proposed alternative is an uncommitted draft and never silently weakens coverage or releases materials.

Local draft reversal changes no world state. Cancel/Stop after Start uses current phase semantics and leaves installed parts and consumed inputs as recorded. Take-down/reclaim uses ordinary reachable stances, supported lowering, condition continuity and exact destinations. Current wetness/individual identity cannot reset in the UI or save codec. A full destination blocks new effects under the owner; no partial compound release is accepted merely to keep an animation moving.

## 7. Growth, responsiveness and repeated reads

The new surfaces add no provider calls. Their main growing dimensions are known recipes, accessible lots and ancestor depth, finite plan nodes, nearby alignment candidates, edited parts and retained receipts. Keep shared preparation at existing quantity, equipment, plan and spatial owners. A selected row must not force a recipes × possessions × targets expansion.

| Path                   | Preparation and invalidation                                                                                                     | Future measurement through actual callers                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Recipe browsing        | Page permitted metadata first; fetch material/work detail for selection; share quantity/hold reads within the same scope         | Cold known-list preparation, page/search continuation, selection detail with large stock and held units                     |
| Work-list display/edit | Read the existing bounded plan and actual receipts; update current progress with native time, not historical hydration per frame | Full admitted finite shape, stale concurrent edit, current-step advancement and restart reconstruction                      |
| Exact exchange         | Fetch exact selected sources/conflicts/destinations and affected ancestor chains; reuse existing indexes                         | Full and near-full nested bags, multiple conflicts, cold index reconstruction and rollback/publication cost                 |
| Placement              | Current permitted nearby candidates and selected assembly; one check at a time; dependency-complete reuse                        | Cold geometry/navigation preparation, repeated unchanged check, occupant/material changes and renderer/input responsiveness |

[ICB-L02](../limits/inventory-crafting-building-workflows.md#icb-l02--bounded-reads-before-detail) records the proposed new-reader envelope and its limits. The inherited total object population, cold indexes, native whole-operation admission and global publication queue are not magically bounded by a small rendered page. No growth allowance is increased here. Incomplete preparation offers continuation or narrowing and is never reported as missing material, no recipe or no valid space.

Hide/close stops optional readers and check requests without stopping accepted native work. Coalesce identical in-flight reads only when their fields, actor/access/timeline and dependency scope agree. Completed receipts remain in their existing history owner; retain no second unbounded browser/server ledger. Measure setup, tail latency, retained memory and work counts separately from warm reuse. Compare against the existing feature/PF budgets and matched baseline; this document supplies no measured speedup or maximum population claim.

## 8. Modules and delivery sequence

| Module | Parent design / runtime owners      | Dependency                                   | Mechanism owned by this module                                                             |
| ------ | ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| ICB01  | ND13; PW04, AC and UIUX             | Current inventory/recipe/admission contracts | Scoped task handoff, selected recipe facts and planned-versus-actual presentation          |
| ICB02  | ND13; AC/AE/AG/SL and recipe owners | ICB01                                        | Finite manufacture-list compilation, owner-scoped normal UI and exact pending-suffix edits |
| ICB03  | ND13; PO04/PO07/PO10 and PW04       | ICB01                                        | Exact acquisition/transfer handoff and current-state/receipt recovery                      |
| ICB04  | ND13; PO/AC and installed equipment | ICB03                                        | Destination-aware immediate exchange, shared final-placement preflight and UI review       |
| ICB05  | ND07/ND13; SH02, SW and UIUX        | ICB01                                        | Draft site mode, qualified alignment assistance and truthful checked-state presentation    |
| ICB06  | ND07; SH01/SH02/SH05 and PO         | ICB05                                        | Complete replacement/reclaim disposition and draft-versus-committed correction             |
| ICB07  | ND07/ND13; relevant owners above    | All selected preceding modules               | Combined native/PostgreSQL/player-interface evidence and final owner reconciliation        |

ICB02, ICB03 and ICB05 can proceed independently after the shared projection/draft decisions in ICB01. Their authors must coordinate changes to shared protocol/UI primitives. Existing receipt, authority, equipment and shelter improvements are dependencies to reuse, not new copies of parent tasks. A partial release can deliver ICB01 or ICB03's improvements independently; the complete two-journey claim requires the full selected scope and ICB07.

## 9. Verification and contract reconciliation

The feature's acceptance table owns user outcomes; the task tracker owns unchecked work. During implementation use focused existing tests and small native/manual scenarios under repository verification policy; do not author an unrelated broad test suite or start paid experiments by default.

Required exact checks include no mutation from convenience previews/refreshes, while preserving legitimate deliberate-inspection evidence; usable versus held inputs; actual outputs after merges; plan edit races and producer dependencies; consumption/cancellation continuity; complete exchange or rollback; changed body/access/work; full nested final capacity; site occupancy/reach/contact changes; keep-covered refusal; condition-preserving reclaim; and private observer differences. For list edits, separately test a clock-only progress update, a change of current invocation, a partially executed counted row and cumulative budget exhaustion after repeated edits. Test removal as well as addition of relevant facts. A successful sibling preview cannot qualify a different caller that failed required preparation.

Exercise actual PostgreSQL publication, same-format restart and original-receipt recovery after an uncertain acknowledgement. Preserve current authority outside gameplay rewind and fence old timelines. Include ordinary departure separately from an abrupt server failure because their continuation contracts differ.

The UI journey includes selected-row stability, legitimate partial results, failed reads, duplicates/long names, keyboard/no-drag controls, narrow/short/enlarged views, child popup Escape, pointer cancellation, and a composer receiving keys without world commands. Construct one materially different installed recipe/profile and one omission case through the real discovery/admission path. Test immediate own-bag exchange separately from a timed pickup so convenience cannot erase a rule.

Update current persistent behavior, relevant world descriptions, limits and parent tracker references only as additions are implemented and verified. Record actual runtime evidence in the existing inventory/shelter/activity verification owners, with one coherent integration section for the cross-surface journey rather than duplicate reports. Significant adopted behavior changes belong in the documentation changelog at adoption/delivery. This design does not mark old PW04/SH/UIUX acceptance complete.

## 10. Decisions, alternatives and remaining evidence

Choose explicit finite work over an unbounded production service; native plans over a new queue; explicit destinations over silent dropping; final-state exchange over sequential client mutations; and optional alignment over a universal construction grid. Retain simple Craft now/Equip/Move and existing form-based construction as useful alternatives. The extra review is for multi-step or materially consequential choices, not a confirmation dialog on every harmless click.

The selected design is sufficiently specified for implementation planning. Unknown current Rust micro-interactions are not implementation blockers, and no feature is justified solely by that missing evidence. Open runtime evidence is deliberately owned by ICB01–ICB07. A new installed family, broader automation, mass looting, persistent loadouts, enclosure geometry, offline work or wider private-data retention would require its own selected scope rather than being smuggled into these modules.

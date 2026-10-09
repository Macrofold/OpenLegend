# Persistent objects — DF01 / BW07 subtracker

**October 7 shelter follow-on:** [SH05](editable-shelters.md#sh05--shared-two-bay-layout-and-qualified-cloak-lean-to) now qualifies the single-bay slope using actual short/tall stock, existing attachments/custody, permission-fenced work and current restoration. Wet cloak identity and surviving-part reclaim remain with PO; no second kit or inventory authority is introduced. Wider PO growth/failure/lifecycle qualification stays open.

**Delivered AV02 extension:** PO04/PO07/PO10 now include exact compatible body-port attachments, all supplied-base consumers and current-format lifecycle continuity through the existing placement owner. The former writable single-item mirror and compatibility-only conversion are removed. Atomic conflicts, stack conservation, transfer/death and SQL return passed [focused evidence](../verification/shield-defense.md); arbitrary construction and hosted scale remain open.

**Other allocated consumers:** [Batch 05](parallel-batch-05-adventure-defense-and-home.md) records delivered AV04 installed shelter parts under completed PX05 design, and allocates AV01/AV05 finite rewards/catches. These extend the same PO owners; the [technical contracts](../projects/parallel-batch-05-adventure-defense-and-home-tech-design.md#shared-responsibility-and-delivery-contracts) forbid competing writable equipment/custody. AV02 delivery extends current PO equipment behavior; wider qualification remains unchanged.

**Status:** implemented and qualified for the approved object foundation scope; arbitrary construction and hosted capacity remain separate. This decomposes [DF01](production-data.md) and [BW07](base-world.md), coordinated with INV-6, P1 claims, P2 authority and SL00. It does not create a competing inventory or ownership roadmap. [Feature specification](../projects/persistent-objects-feature-spec.md) and [technical design](../projects/persistent-objects-tech-design.md) own the approved project.

Implementation was approved in chat on September 26, 2026; the [foundation plan](../projects/foundations-1-5.md#approved-implementation-plan) records scope, refreshed base and DF02 branch seams. Retain current receipts and semantic owners. Each new state owner must join SL00 in its introducing slice.

**Delivered selected construction consumer:** [Editable shelters](../projects/editable-shelters-feature-spec.md) uses these identity, custody, finite-resource and lineage foundations for reusable coverings, staged work and salvage. [The paired technical design](../projects/editable-shelters-tech-design.md#2-existing-owners-and-missing-contracts) is complete for PX05. [SH01/SH02/SH03/SH05](editable-shelters.md) records registered assembly/back attachments, installed/lowered-part protection, exact conditioned-object reclaim, atomic hold release with attachment and narrow equal-state fiber split/merge. AV04 delivers the selected flat profile with [native/SQL/UI evidence](../verification/editable-shelters.md); no completed PO foundation gate is reopened. Broader materials, cooperative grants and lifecycle/capacity qualification remain with PO/SH owners.

## Execution notes — September 26, 2026

The approved finite object implementation and native/database/browser qualification are complete.
The current diff promotes legacy lots to entities, moves XYZ/support into tagged placement,
and routes native quantities, split/merge, custody and individual equipment through the
object owner. Finite bags use exact pinned packing metadata, net ancestor load updates and
bounded depth. Direct children use a persistent ordered index with cached nesting height;
root moves do not rewrite descendants. Declared ownership has a revisioned empty state,
so clearing a declaration cannot reset its revision.

Canonical placement uses a restrictive physical-parent FK separate from structural record
ownership. The writer publishes moved children before deleting their former pile. Legacy
conversion validates before replacing the two changed SQL tables, preserves old definition
bytes and uses exact authored packing bindings. Retired identities/lineage leave the hot
set only after commit; unscoped complete capture rehydrates canonical object history.

The HTTP/UI work adds direct-child pages, search windows, breadcrumbs, quantity selection,
transfer/split/merge/unequip and a permitted ownership editor. Page continuation binds
current access, timeline and root/container inventory revisions. Existing type-total person
editing preserves unchanged individual/split objects and rejects ambiguous replacement.

Static and native evidence: TypeScript passes. A native seed-73 180-second run remains at simTime 180,
24 events and RNG 4074112313. A two-level bag with two berries retained exact JSON and
indexed inventory through SQLite. A production-router SQLite journey then exercised nested
packing, cycle and nonempty-retirement rejection, ownership declaration, whole-bag
drop/pickup and empty-pile removal, foreign-inventory denial, and consumed-food retirement.
Canonical/active/complete-capture entity counts were 30/29/30, with both lineage records
retained. The same HTTP journey also passed against the disposable PostgreSQL adapter.
These are no-cost ad-hoc runtime scenarios, not an automated suite or browser proof.

Populated legacy equipment conversion now passes on both SQLite and PostgreSQL: the
three-unit original bulk ID retains two units, one deterministic individual receives the
equipment attachment, and the running hunt's supported weapon reference binds that unit.
Both adapters publish the same source/result SHA-256 conversion receipt and preserve total
quantity three. An unsupported active item reference rejects on both adapters with revision
1, quantity three and the old placement schema unchanged.

A 10,000-lot, 12-level native qualification fixture (an explicitly enlarged finite bag,
not a change to the ordinary 24-load bag) built/validated/froze in 402 ms. Forty-child
pages measured 0.040 ms median / 0.069 ms p95. Whole-root transitions measured 11.17 ms
median / 19.43 ms p95 including Immer publication/freezing; only five SQL records changed,
with no descendant placement writes. Record preparation took 12.01 ms and ten native
seconds took 209.96 ms; heap used was 50.4 MB. This is one run, not a matched improvement
or capacity pass. Flat entity-map copying and record enumeration still scale with the
resident set and require the P4/performance follow-through.

The owner now records occurrence-time custody for new split/merge/consumption lineage
and retirements, including partial consumption. An indexed scoped SQL history page and
the inventory panel consume cold identities without actionable successor redirects.
Older records with unavailable custody remain undisclosed rather than inventing access.
SQLite and PostgreSQL HTTP scenarios preserved three consumed units, exact retired lookup,
foreign-history isolation and complete save/reload. The actual PostgreSQL/OIDC browser journey verified history refresh after consumption.

The final compound HTTP journey passed on both adapters: full shared-ancestor net load,
opposing bag moves, reserved pickup rollback, declared-owner merge refusal, exact split/merge
retry, failed multi-input work, and actual craft/equip/gather/unequip/container movement.
The 10,000-lot/12-level SQL and HTTP workload retained 2,000 cold contributions, matched all
251 pages against exhaustive child order and preserved every descendant placement across
12 moves. A 480-pixel Chromium interaction covered keyboard paging/search/merge selection,
paused availability, nested movement and visual overflow. These supersede the earlier
browser-tool timeout gap. [Verification](../verification/foundations-1-5.md#foundation-priorities-15--implementation-evidence)
records precise timings, payloads and limitations.

The complete affected-source/definition/referrer review and acceptance/documentation reconciliation are complete. Wider arbitrary construction, hosted throughput
and automated CI are separate gates; the measured flat-map copy cost is retained in PF.

## PO01 — Inventory, spatial and reference audit

- [x] Map `world.items`, definition-only merges, `addItem`, pickup/drop/equip/craft/eat/harvest, direct entity-position assumptions, body/spatial queries, editor/context/views and current canonical record codecs.
- [x] Audit active process/equipment/reservation and historical references to item IDs; distinguish a lot from an already individualized object. Inspect actual entity/item ID collisions and quantity precision without resetting worlds.
- [x] Record exact bases, unchanged base-world pickup/portability semantics, intentional equipped-unit refinement and a representative native baseline.

**Dependencies:** DF02 for overlapping code. **Exit:** complete source/owner/referrer map and supported migration shape; unknown referrers or collisions remain explicit blockers to conversion, not guessed aliases.

## PO02 — One entity/lot/placement owner and in-place conversion

- [x] Evolve `sim_items` into entity-backed item components, extend `sim_placements` to one tagged world/contained/attached record and keep geometry separate. Remove duplicate writable item/location representations at cutover.
- [x] Add required scoped identity uniqueness and semantic-reference constraints; keep physical containment independent of RecordNode structural cascade FKs.
- [x] Preserve IDs, quantities, definitions, custody, current geometry and typed equipment/process references in a checked source-revision migration. Verify before atomically switching readers/writers; reject unsupported conversion with the old world intact.

**Dependencies:** PO01; current data migration and SL00 owner. **Exit:** native world roots and contained objects have coherent placement without fake XYZ or a second inventory list; both database adapters preserve all existing supported state.

## PO03 — Lot operations, identity and lineage

- [x] Implement strict split/merge/individualize operations with safe quantities, exact definition/unit/state/provenance compatibility and explicit individual status.
- [x] Preserve whole unmerged identities, create deterministic split IDs, and retire merged/consumed sources with scoped lineage. No automatic actionable successor alias.
- [x] Move all definition-only merge bypasses to the same validator; reject incompatible active references, containers, equipment and reservations unless the owning operation supports rebinding.

**Dependencies:** PO02; P1 claim envelope. **Exit:** totals remain conserved across compatible operations; unique state and retained references survive, while stale mutable references reject honestly.

## PO04 — Atomic custody and individual equipment

- [x] Route pickup/drop/transfer/equip/unequip through one transaction with current P2 scope, revisions, portability, reach, capability and source/destination validation.
- [x] Individualize one equipped unit from a stack and preserve ordinary gathering-tool use. Reconcile the base-world item spec's equipped-stack behavior explicitly.
- [x] Retain Pick Up All's eligible-at-completion selection and all-or-nothing default; couple quantity/placement/attachment/receipt updates and ambiguous-acknowledgement recovery.

**Dependencies:** PO03; existing action owner and BW05 branch integration. **Exit:** exact equipped unit follows custody, retries do not duplicate transfer, and real two-human last-item competition uses the same native boundary.

PW04's client extension adds exact quantity drafts and visible source/destination review for native transfer, split, drop and recipient offers; All/Half only fill a draft. It preserves the existing custody writer and current revisions rather than granting a new mutation path. [Actual browser slices](../verification/parallel-batch-01-playable-week-engineer-4.md#pw04--native-inventory-and-partial-browser-checks) include a three-of-eight transfer, a later keyboard Move with focus restored to the detail actions, ground drop/take and unpacking one unit from a container. Ordinary Craft also consumes an applied recipe's materials and produces the native item; equipping that item refreshes comparison with the current equipment. This extends the completed object foundation; the complete new ordinary-client/layout/interaction acceptance remains under [PW04](parallel-batch-01-playable-week.md#pw04--inventory-for-exact-camp-tasks) and [UIUX02–UIUX04](ui-ux.md#uiux02), not implied by the earlier checkmarks.

## PO05 — One useful nested finite-capacity container

PW03/PW10 reuse the delivered PO03/PO04 identity and atomic custody boundaries. Native checks preserve split lineage, exact current pins and actual moved receipts, and reject capacity/minimum/selection failures without partial mutation. Two supplied woven designs passed ordinary crafting, nested packing, filled drop/return/take, access loss and current-format native restore. Real PostgreSQL teaching/crafting/packing/drop/inspection/reopen/take of the small design and single resumed craft completion also passed; scripted ordinary craft/custody passed, while live invention and shared-picker qualification remain separate ([evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026)).

- [x] Add the portable bag/container capability through existing native definition admission, with explicit authored packing-load compatibility and finite capacity. Do not impose new global actor encumbrance.
- [x] Implement bounded ancestor cycle/depth/slot checks, nested load accounting, net shared-ancestor updates and source-revisioned derived load summaries.
- [x] Make whole-container movement change the root and affected ancestors rather than every descendant's persisted position. Keep contained contents out of independent spatial participation unless an actual exposed-attachment rule applies.

**Dependencies:** PO02–PO04. **Exit:** an ordinary bag with food/tool content can nest/move/use/save; self/ancestor cycles, occupied slots, unknown load and overflow fail without partial movement or lost contents.

## PO06 — Ownership, work and removal integration

- [x] Support the explicit declared-owner consumer with distinct custody/access/author rights and permitted editor/inspection; do not infer legal title from old `ownerId`.
- [x] Integrate craft/consume/output/reservation operations with P1 and existing native progress. Moving or splitting a reserved source must not steal another process's allocation.
- [x] Block nonempty retirement without an admitted disposition; retain tombstone/lineage/pins for references. Supply INV-5 activation/retirement dependencies, not a second installer or invented destruction policy.

**Dependencies:** PO03–PO05; P1; INV/EWF07. **Exit:** declared owner differs from current holder when authored, interrupted work preserves actual inputs/outputs, and container deletion cannot cascade away possessions.

## PO07 — Scoped UI, context and action discovery

The PW03/PW10 consumer extends selected-container inspection with access/revision-bound pages and permitted pack/take discovery. Disposable PostgreSQL checks passed page-two-only decision context, opaque references, access-loss removal and inspection/restart. The actual director request refused a cache whose access changed during parameter choice. NP04 completes ordinary ground-cache activity inspection through the shared picker, as recorded below. PW01-owned director-selected transfer qualification remains in [PW03](parallel-batch-01-playable-week.md#pw03--craftable-containers-and-camp-supplies). The native woven-family consumer uses PW02's trusted recipe interface and existing PO05/PO06 containment.

- [x] Extend existing item/detail/action surfaces with individual/container state, permitted location/ownership and useful capacity/compatibility failures.
- [x] Add bounded direct-child pages, breadcrumbs and searchable complete access; keep renderer artwork limits separate from stored content. Fence pages/caches by container, timeline and current disclosure.
- [x] Use the existing action/freeform/world-agent binding and admission route. Reject hidden descendant counts/IDs/packing totals and avoid hover/read-triggered provider calls.

**Dependencies:** PO04–PO06; MP01 and existing catalogue/knowledge owners. **Exit:** real ordinary clients can navigate/use all authorized contents without private payload leaks or an alternate mutation path.

R04 follow-through (2026-09-28): merge choices are found by the server across the whole current container using the merge admission rules, not only the displayed 40-item page ([QU05](../limits/objects.md#qu05), [evidence](../verification/player-clarity-ui.md#r04--merge-targets-beyond-the-page)). Automated coverage for `containerPage` merge mode remains unwritten.

PW04's task workspace now keeps selected detail and exact quantity drafts across narrow/wide adaptation and hiding. Current-container search retains continuation; lazy permitted destination discovery returns 40 choices after at most 200 examined candidates and distinguishes partial/unavailable discovery from an honest complete negative. It uses existing direct-child/spatial indexes; cold index construction and native admission for a selected bag are outside that discovery work bound. Filtered or partial contents cannot prove a selected item was removed: retained detail is explicitly last inspected, and fresh certified reads update its quantity and facts. The reproduced filtered-selection defect is corrected and [rechecked in the actual browser](../verification/parallel-batch-01-playable-week-engineer-4.md#pw04--native-inventory-and-partial-browser-checks), alongside More-destination paging through the 44-bag set and named search/Clear/breadcrumb controls. Those keyboard interactions do not change the observed native command count or character position. Native equipment facts and the actual equipped counterpart support deliberate comparison. [IW01](../limits/interface.md#iw01--inventory-task-workspace) owns these limits. This is a concrete browser consumer relevant to [AC07.1–AC07.2](action-capabilities.md#ac07--scoped-inspection-search-and-monitoring), not closure of general search/measurement or the complete new browser acceptance.

**NP04 contribution to PO07:** the same storage disclosure owner now supports role-filtered camp selection, exact refresh and explicit approach. Visible dropped bags expose appearance only; admitted inspection remains the only source of ground contents. Selection is independent of page membership and private drafts use the current authority/timeline namespace. [Scoped evidence](../verification/camp-life.md#np04--camp-supply-discovery-october-3-2026) does not close general inventory/search or hosted capacity acceptance.

## PO08 — Save, inactivity and cold continuity

- [x] Join active lots/placements, required cold tombstones/lineage, reservations, container state and exact pins to SL00 consistent capture and restore.
- [x] Validate complete reference/cycle/quantity/equipment invariants before installation; rebuild derived indexes/summaries, preserve current privacy/accounting and reject stale callbacks.
- [x] Integrate P2 human inactive roots without activating carried children or granting protection to detached world property. Exercise return and changed geometry.

**Dependencies:** introducing state slices above; MP04; SL00. **Exit:** restart/restore during nested work preserves one object graph, actual progress and possessions; unavailable data cannot be silently dropped.

## PO09 — Native, database, UI and performance qualification

The checked foundation gate below retains its original scope. October 2's PW03/PW10 native family, actual crafted-family/watch PostgreSQL restart and scoped inspection cases contribute current consumer evidence to PO08/PO09. They do not repeat or close the complete PO09 workload. [Engineer 3 evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026) keeps browser/live cases and broader hosted qualification distinct.

- [x] Exercise every acceptance case in the paired docs using disposable worlds and zero provider budget, including opposing nested moves, shared ancestors, cold retired references, active-equipment migration and failed multi-item work.
- [x] Compare row/quantity/reference/pin totals across commits and both database adapters; inspect browser/network behavior for large and private containers.
- [x] Measure bounded child lookup, ancestor work, root movement, index rebuild, history residency, save/capture size and contention under PF's mixed workload. Record current behavior in Architecture, actual evidence in Verification and unresolved regression/hosted gates here; retain CI and default no-suite instructions.

**Dependencies:** PO01–PO08. **Exit:** the real tool/bag/stack loops and meaningful failures are evidenced; this does not close arbitrary construction, D6 cross-region transfer or first-release scale qualification.

## PO10 — Shared access and dependency-aware handling

PW10's fresh selection obeys existing access and ancestor restrictions and excludes claimed/in-use lots. Personal minimum proof counts currently available own possessions; moving stock between accessible own bags does not spend that minimum. An inspected ground cache supports a later method only while current inspection/access permits it. Current functional/review scenarios passed exact own-work completion, minimum protection and access-loss refusal; fixture director admission does not prove live preference ([current contract](../action-experience.md#fresh-stock-binding-in-finite-methods), [evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026)).

- [x] Reachable world containers/piles are shared by default; explicit durable actor grants restrict access, including ancestor restrictions. Carried contents remain private unless a carried bag grants access. Giving requires the reachable recipient's acceptance; it never enumerates their possessions.
- [x] Use accessible nested possessions for ingredients, eating and equipment. Allow unrelated transfers/splits/merges/drops during work; reject moves that affect reservations or the actor/custodian's active references, including descendants.
- [x] Integrate container navigation, giving and creator restriction controls with current scope/revisions; exercise HTTP on both adapters and the actual inventory browser.

On 2026-09-28, giving to a person changed: it is now an offer the recipient must accept ([social rules](../worlds/base/social.md#offering-and-accepting-possessions), tracker BW20), and direct deposit into another person's carried inventory is refused. The [base-world contract](../worlds/base/items.md#shared-containers-and-active-work) and [OB11–OB13](../limits/objects.md#ob11) own behavior/limits. [Verification](../verification/immediate-gameplay-limits.md#immediate-gameplay-limits) records evidence. PX02 now extends that offer owner with immediate reciprocal quantities, final combined placement and unchanged private access, rather than two independent gifts ([contract](../worlds/base/social.md#offering-and-accepting-possessions), [evidence](../verification/reciprocal-barter.md)). Arbitrary locks/keys, granular deposit-versus-withdraw grants, feeding, title disputes and commercial promises remain future authored extensions. Standing reservations remain BW21; no PO parent or broader scale qualification is closed by this subset.

PW04 reuses that offer boundary for nearby recipients and native access/capacity/reservation checks for storage moves. Choosing a destination performs no transfer and never exposes a recipient's private possessions. Its reusable source-free container picker can supply permitted storage to the camp-activity request/review owner without independently implementing that activity. Changed source, quantity, capacity or access keeps the user's intent visible and requires a fresh admissible choice. [Bounded native/HTTP and browser evidence](../verification/parallel-batch-01-playable-week-engineer-4.md#pw04--native-inventory-and-partial-browser-checks) includes exact 3-of-8 transfer/dedup/capacity, held offers, a later bag-contents fence, and an actual stale destination that leaves the quantity draft visible with Confirm blocked. Further actual browser checks refuse a full bag, move a Half-filled draft into an explicitly granted NPC bag and create a pending offer while custody remains with its source. This qualifies those particular grant/capacity/offer states, not recipient acceptance, the ordinary utility-container loop or every browser permission failure. PW04/PW06 retain the final shared integration and complete actual-client qualification.

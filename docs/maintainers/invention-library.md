# Useful invention library and local sharing — implementation tracker

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | Selected DG12/ND12 design is complete; all LIB implementation and qualification tasks remain open. Existing live invention, method-record learning and OC opening delivery are separate established owners. | 2026-10-18 |

[Feature specification](../projects/world-creation-feature-spec.md#15-dg12-expansion--a-useful-invention-follows-its-creator) · [Technical design](../projects/world-creation-tech-design.md) · [Bundled rules](../worlds/base/invention-reuse.md) · [Limits](../limits/world-creation.md). This focused tracker is the single selected child of [INV-8.1/8.2](inventions-and-world-evolution.md#inv-8--portable-inventions-and-later-algorithm-extensions) and [EWF11](extensible-world-foundation.md#ewf11--reusable-construct-integration-and-local-portability-proof). It does not replace their broader construct, complete-world inventory, commercial, cross-operator, general rights or live-migration work.

## Scope and execution rules

The next experience is a useful method that survives its maker's first session: retain it, find it, install it without generation in another authorised world, explicitly learn/make/use it, deliberately adapt it, and let an independent person choose to learn a physical method sheet and use it for their own purpose. The final selected distribution case is one immutable zero-price release to one known recipient on the same operator under sufficient actual grants. A serializer, catalogue screen or scripted NPC reaction does not complete the experience.

First Playable already owns empty-handed survival, camps, cooperation and roaming. LIB consumes those completed implementation owners when available and can use smaller native fixtures for its independent contracts; it does not design a second Main opening or require implementation changes before First Playable starts. [OC](parallel-batch-07-playable-world-creation.md) retains the existing first-opening consumer. LIB05 adds only the explicitly selected optional recipe attachment/disclosure integration.

Keep account authority, historical authorship, exact definitions, library entitlements, character knowledge, physical items, learned proficiency and independent actor choices separate. Current `installRecipe` can install without learning; current creator recipe Apply calls `admitDeclaration` and teaches its controlled actor. Imports need their explicit install-only adapter and imported provenance. Existing `teach` does not prove listener assent; use actual actor-owned record learning for the voluntary-adoption gate.

This is a design-only assignment. Future implementation/verification follows the repository's current authorization, workflow and spending rules; no paid/native evidence is asserted here. Every implementation slice updates its actual canonical owners and current-format implications before claiming completion. UI and actor discovery are developed alongside the native path, even though LIB07 gathers their shared acceptance.

## LIB01 — Account scope, operational records and exact grants

**Dependencies:** existing account/session authority, current PostgreSQL/operational repository and stable identity contracts. **Parent delegation:** INV-8.1 selected library record/authority foundation; no new general identity system.

- [ ] Implement the one configured operator-library repository and strict format/operation/grant/entry schemas described in technical §§2–3, with explicit trusted installation/account mappings and current registration generations.
- [ ] Add authenticated account-only library scope/routes using the existing session owner without granting a world character, `create`, `inspect` or control. Enforce exact mapped principal at direct and proxy boundaries; never trust caller account/author labels.
- [ ] Create canonical operational contribution/owner/artifact/entry/grant/release/acquisition/operation records and required unique/reference constraints. Keep body fingerprints distinct from native recipe/definition digests and keep all library/account data outside gameplay checkpoints.
- [ ] Implement the administrative intake of already selected grant/mandate evidence. Default missing operations/scope to ungranted; do not create legal terms, infer a coauthor mandate or treat ownership/zero price as redistribution authority.
- [ ] Connect actual finite durable storage admission, exact byte/reference accounting and operational backup/reload. An absent allowance means new retention/publication unavailable, not unlimited storage or broken installed gameplay.

**Exit:** current scoped identities and exact records reopen through PostgreSQL, changed-body operation reuse is refused, an unrelated account cannot inspect or mutate the entry, and insufficient grant/storage is an explicit refusal. Schema existence alone does not close the useful round trip. **Acceptance:** LIB-A08/A09/A12/A14; relevant identity/rights/recovery cases in technical §12.

## LIB02 — Capture contributions and keep complete reusable copies

**Dependencies:** LIB01, existing `admitDeclaration`/attribution, recipe family/material/policy validation and source canonical-record readers. **Parent delegation:** INV-8.1 account projection plus INV-8.2 exact retained artifact subset.

- [ ] Append the small source contribution outbox identity with an actually committed native invention. Delivery runs outside the world transaction and has indexed bounded pending selection/idempotent receipt recovery; library failure cannot undo a valid native method.
- [ ] Reconcile earlier retained contributions by stable cursor with explicit source coverage; preserve separately attributed independent discoveries despite mechanical deduplication. Rewind/current membership never rewrites historical ownership.
- [ ] Implement the one-root recipe closure adapter using exact family/material/item-handling pins and positive manufactured-material proof. Count 32 references/1 MiB and parser/work limits; distinguish owned-output backlinks from true production cycles.
- [ ] Retain the complete eligible closure/grants in one library transaction and acknowledge only after durable commit. Preserve source-reference versus independent-copy states and current private-origin redaction. Missing content/rights remains a specific blocker.
- [ ] Provide usable retention from the real admitted invention result and a basic permitted list/detail. No generated descriptions, broad prompt injection or full-history scan on list open.

**Exit:** an actually invented useful method appears, a complete copy survives ordinary source membership closure, reference-only content stays honest, and absent/changed/private/over-limit dependencies never produce a partial “saved” artifact. **Acceptance:** LIB-A01/A02/A08/A09/A10/A12/A16.

## LIB03 — Install exact methods through the existing authoring owner

**Dependencies:** LIB02, existing World Agent revision/check/review/apply, current world writer and `installRecipe`. **Parent delegation:** INV-8.2 installer consumer plus EWF11 same-author local unchanged-reuse proof.

- [ ] Add the narrow `recipe-import` kind/adapter with an immutable library artifact reference, bounded choices, current destination entitlement/support and existing exact review state. Complete artifact bytes do not enlarge current authoring/tool argument ceilings.
- [ ] Add imported recipe provenance and a local canonical import receipt/mapping; extend exact validators without a fake actor invention receipt, foreign actor lookup or false authored-world profile. Preserve normal genuine invention/creator recipe Apply behaviour.
- [ ] Share existing candidate compilation and exact canonical-digest lookup/allocation with native `installRecipe`. Prepare the complete destination directory once outside the creator writer; preserve current first-match own-key order, charge all `R` recipes/digest bytes and ID collision probes, and reuse only the exact frozen published branch. Use an attempt-local additions overlay, invalidate changed/removed/reordered/restored recipes, and return explicit incomplete/refusal on unadmitted work. A 32-reference source closure does not bound `R × P` baseline scanning. Preserve ordinary actor-invention/authored-builder callers. Build only actual additions against the current mutable destination transition; never replace current world state with the prepared snapshot.
- [ ] Recheck current `create`/`inspect`, applicable player policy, registrations, destination timeline and exact required pins at the single destination transaction. Start the destination's single 60,000-ms monotonic admission claim before library issuance, bind its current runtime generation and exact operation/body/plan, and persist the accepted claim/authorization identity with the destination operational receipt. Qualify queue/network delay, exact deadline, skew/UTC changes, restart/restore and receipt-only recovery; never renew/reconstruct the timer or reissue expired work. An operation admitted in time may finish later. Preserve the stated withdrawal/replay boundary without claiming a distributed atomic grant read. One active preparation per destination; ordinary unrelated world progress remains independent.
- [ ] Return Installed or Already available here with an exact durable mapping/receipt and no knowledge, item, proficiency, author credit or NPC goal. Refresh applicable scoped views through existing invalidation.

**Exit:** the first real source method installs with zero generation in current World B, repeated exact reuse stays single and a failed/stale install leaves one coherent old world. The person can inspect requirements and deliberately continue towards learning/use. **Acceptance:** LIB-A01/A03/A10/A11/A12/A14.

## LIB04 — Useful composition, binding and a distinct adaptation

**Dependencies:** LIB03 and the already delivered cordage producer/woven-container consumer interfaces. **Parent delegation:** EWF11 selected recipe binding/adaptation/unsupported-dependency cases; broad reusable selectors/effects remain parent work.

- [ ] Preserve complete manufactured-cord → bag producer/output/native dependency identity and compile producer before consumer. Learning/possessing one side grants no knowledge of the other.
- [ ] Expose actual trusted family port metadata for the selected ingredient/reference bindings: interface/version, units, origin, bounds, phase, required/default behaviour and dependencies. No string-name or loose-property equivalence.
- [ ] Implement one explicit world-owned exact native-alias adapter and contrast a materially changed/unsupported binding. An uploaded package or generated suggestion cannot register that adapter.
- [ ] Use the existing recipe editor/World Agent for a new adapted draft with retained original/parent artifact, exact revision and actual compiled material/work/capacity differences. Native field edits need no model; optional conversational work follows existing funding.
- [ ] Complete a bag journey where a coherent useful kit exceeds the original container’s capacity but fits the new bag, then actually take/drop/offer that whole kit. Derive capacity/work from admitted quantities, keep loose carriage/another bag viable, and add no actor carry cap or strength. Include obtained intermediate material without producer knowledge and preserve the earlier version.

**Exit:** unchanged reuse, explicit binding, purposeful adaptation and unsupported dependency all work through one admission owner. The useful option is observed through native manufacture/use, not only a comparison card. **Acceptance:** LIB-A02/A04/A10/A17.

## LIB05 — Physical method sheets and explicit opening disclosure

**Dependencies:** LIB03 for imported methods; writing/local sharing can develop from existing known recipes independently. Existing recipe-record inspection/learning, stock/craft/action/placement and current-format owners are required. LIB04 supplies the compounded bag qualification. **Parent delegation:** selected INV-8 consumer's knowledge/use boundary; existing knowledge/agency owners retain mutation/choice.

- [ ] Install the world-owned method-writing profile: known exact local method, one wood + one prepared fibre, actual stone_tool or knife held under the existing First Playable world-owned cutting role, 300 game seconds, one portable packing-load-one sheet. Read all values from that profile, with no engine/world duplicate table.
- [ ] Implement `write-method-record` through existing exact stock/tool/body/action admission and native work, with start debit, no cancelled-work refund, exact completion and ongoing save/resume. Register the exact method/profile/stock/tool request, domain/protocol unions, native command bindings, action/history meaning, output IDs and method dependencies. Share the option owner across selected recipe details, `context.ts` NPC/planning candidates and current `decision-context.ts` admission; a player-only action is incomplete.
- [ ] Reuse actual inventory inspection and `learn-record` for human/NPC discovery and action; account ownership or record custody is not knowledge. Refresh current detail when inspection/learning/custody changes, including changes from another UI surface.
- [ ] Qualify a maker's real sheet and a learner's own current inspect/learn/craft/use, including a person who declines/postpones and a person using a finished intermediate without producer knowledge. No forced goal, imitation, praise or private NPC adoption feed.
- [ ] Add separately reviewed `method-record-endowment` creator placement with exact location/quantity and distinct receipt. Label authored supply; default it off and preserve successful installation if later placement fails.
- [ ] Integrate one optional sealed artifact through the same current OC candidate/profile, native builder/readiness and Start owner as optional Ash Road. Build the actual selected FPW/Ash registries/resources/identities first, bind/import against that combined candidate, then apply explicit optional initial learning/sheet placement. Keep complete artifact bytes outside the 24,000-byte candidate; six optional learning choices do not cap fixed authored FPW/Ash methods. Allocate stable local import-record identity/body before review and link it from the later operational receipt, with no late authorization field changing the compiled-world hash. Use the existing empty-target intake's fresh instance nonce/monotonic claim, not a nonexistent WorldService. Qualify combined selection invalidation, one atomic Start/recovery and either feature shipping first; unattached Main/Ash/Solo/custom starts without the library.

**Exit:** useful methods become actual local opportunities, with real resources/custody/knowledge and independent action. Imported recipes alone teach nobody. Opening attachment is advertised only after its own actual Start/recovery gate. **Acceptance:** LIB-A01/A02/A05/A06/A11/A12/A14/A17.

## LIB06 — Free release and known-recipient acquisition

**Dependencies:** LIB01–LIB04 and sufficient actual grants/mandate for the selected content. LIB05 completes the recipient's physical learning/use path. **Parent delegation:** INV-8.2 immutable eligible artifact and the usable-existing-grant subset of INV-8.3; product-wide D44 terms remain unresolved there.

- [ ] Prepare exact publisher/artifact/complete-closure/approved-public-metadata/grant/known-recipient review. Do not disclose private source titles or actor histories, infer rights from credits, or build a public account directory.
- [ ] Publish immutable zero-price release and exact receipt; expose a direct link/current-format file. Publication sends no message, auto-acquires nothing and grants no destination authority.
- [ ] Acquire explicitly as the selected current recipient, serialising exact release/grant/publication state and unique acquisition/retention/receipt in one transaction. Return the same result on replay without duplicate ownership or bytes.
- [ ] Implement exact newer versions, unpublish/acquire race, own-copy deletion/reference checks and acquired-copy reopening. Retained terms/history survive ordinary unpublish; exceptional operator restrictions retain their actual scope.
- [ ] Complete actual recipient World B install → deliberate learn → craft → useful action under the recipient's own grants/materials, with insufficient-rights and untrusted-origin refusals.

**Exit:** one useful invention reaches one known person's authorised world for zero package price under its real existing terms. No marketplace, complete-world free-use badge, automatic update or generated code claim. **Acceptance:** LIB-A07/A08/A09/A12/A13/A14.

## LIB07 — Complete account, creator, player and NPC surfaces

**Dependencies:** develop with LIB02–LIB06; complete after those native operations exist. Shared design-system, Recipes/details, World Agent and action owners remain authoritative.

- [ ] Add My inventions account navigation and Use from my library creator entry, clearly distinct from the controlled character's Recipes. Keep one selected entry/detail owner, shared recipe facts and existing exact authoring review/operation state.
- [ ] Implement 20-row keyset pages and existing Unicode prefix search semantics: eight terms/64 code points, 250-row scan chunks/2,000 examined rows, explicit continuation and complete-versus-partial absence. Select account summary rows before artifact hydration.
- [ ] Cover empty, failed, incomplete, stale, private-source, unsupported and Already available states, identical/long names, favourites/nicknames, keyboard/IME, responsive layout and reachable disabled explanations.
- [ ] Fence all read/mutation/receipt callbacks by full current scope/revision/attempt before outer state/notices/storage/focus updates. Double click cannot replace an unresolved operation; hide obsolete private content immediately on access change.
- [ ] Confirm actual installation/learning/writing/publication first, then refresh details; failed readback cannot erase a committed receipt or invite duplicate mutation. Hidden panels stop optional reads without deleting drafts or unknown-result identities.
- [ ] Show real materials/work/next useful action and independent NPC/native offers. No required shopping/interview sequence or technical IDs as the primary gameplay flow.

**Exit:** the complete library/adaptation/sharing/recipient journeys work through real UI and actor surfaces, with documented limits of any component-only evidence. **Acceptance:** LIB-A01–LIB-A07/A09/A12/A15/A17.

## LIB08 — Current-format recovery, authority races and removal

**Dependencies:** LIB03–LIB06, current save/load/journal/operational backup and definition-removal owners. Do not implement general INV-5 migration here.

- [ ] Validate canonical world imports/provenance/local mapping, physical records and writing/crafting work on current-format save/reload without source-network/model access. Reject unsupported old formats; retain existing native provenance checks.
- [ ] Keep account entries/grants/releases/acquisitions/operations/outbox outside gameplay rewind and inside operational backup/recovery. Reconcile exact cross-host counterpart receipts; no pretend distributed rollback.
- [ ] Exercise changed source/destination permissions, registration generations, timeline, required pins and account switch after preparation/read; no stale activation/private leakage or hidden rewrite of historical ownership.
- [ ] Exercise crash before dispatch, accepted commit with lost response, duplicate same/changed body, receipt reconciliation while old network wait is pending, cancel around admission and concurrent preparation/publish/acquire/remove.
- [ ] Preserve separate hide/unfavourite/delete-copy/unpublish/installed-retirement scope; last required artifact bytes cannot be deleted accidentally. No automatic live migration, respawn, repeated knowledge grant or retry spending.

**Exit:** every selected operation resumes or refuses from its actual authority and exact receipt without duplicating any effect. Recovery cannot turn an acquired library copy into automatic gameplay knowledge or make an occupied OC host empty. **Acceptance:** LIB-A08–LIB-A14.

## LIB09 — Useful play, autonomous choice and complete-caller qualification

**Dependencies:** LIB01–LIB08 and their real caller surfaces; First Playable complete Main for combined human play, while independent native fixtures can qualify earlier. Current repository verification/spending authorization remains required for execution.

- [ ] Record LIB-A01–LIB-A17 and technical §12 against exact revisions/configuration, distinguishing supplied native correctness, real generated invention/adaptation, NPC independent choice, actual browser/HTTP/database flow and uncoached enjoyment.
- [ ] Qualify 32-reference/1-MiB exact/over-limit closure, parser limits, missing/fake dependencies, Unicode bounded search/continuation, growing unrelated account/source histories, many terminal receipts, pending recovery and simultaneous world commits. Independently grow destination recipe count and imported producer count; qualify native first-match equivalence, cold shared lookup cost, warm/attempt-overlay reuse, invalidation/order/collisions and visible work refusal across import, ordinary actor invention and authored builders. Measure the actual read lane/SQL plans, rows/bytes/allocations, retained storage and complete operation latency; do not close with row-limit estimates.
- [ ] Observe one uncoached player finding/reusing/adapting or sharing a method for a worthwhile purpose. Check that they understand installation/learning/stock distinctions and that the result changes a real option. A scripted sequence is not evidence of fun, balance or voluntary adoption.
- [ ] Write the focused verification record only when evidence exists; report incomplete/blocking cases honestly. Update canonical owners, limits/evidence, this tracker, parent INV-8/EWF11 selected delegation, needs-design implementation references and repertoire selected-use notes without closing broader work.

**Exit:** all selected native/recovery/UI contracts are evidenced and useful play/choice claims carry their actual scope. Any unobserved human/NPC quality or operational capacity remains explicitly open. Complete this tracker only when its actual selected delivery is complete; a completed design or first single-world fixture does not satisfy that gate.

## Retained open work

D44/INV-8.3 still owns product-wide free-use contribution terms and complete-pack consent. INV-8/EWF11 retains broader constructs, full-world inventory/payload completeness, additional coauthorship/ownership-transfer policy, unsupported families and cross-operator portability. PACK retains public/commercial discovery, price and payments. INV-5 retains stateful replacement/removal. General lesson consent and arbitrary literacy/teaching rules remain outside this physical-record consumer.

## Maintained records

- Behaviour: [world creation §15](../projects/world-creation-feature-spec.md#15-dg12-expansion--a-useful-invention-follows-its-creator); [technical design](../projects/world-creation-tech-design.md); [bundled method sheets](../worlds/base/invention-reuse.md).
- Constraints: [world creation limits](../limits/world-creation.md), shared [invention limits](../limits/inventions.md), current knowledge/action/object/storage/authority inventories.
- Parent delivery: [INV-8](inventions-and-world-evolution.md#inv-8--portable-inventions-and-later-algorithm-extensions), [EWF11](extensible-world-foundation.md#ewf11--reusable-construct-integration-and-local-portability-proof), [production data](production-data.md); [OC](parallel-batch-07-playable-world-creation.md) remains the opening owner.


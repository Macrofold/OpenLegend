# Batch 05 — Technical definitions for adventure, defense and a home

| Status      | Current progress                                                                                                                  | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | AV05’s river meal and second review are delivered and qualified; the other four assignments and combined integration remain open. | 2026-10-07   |

Current AV05 delivery: [installed preparation/cast contract](../food-preparation.md), [river profile](../worlds/base/river-fishing.md) and [native/player/live-choice evidence](../verification/river-meal.md). Other assignments retain their prerequisite and acceptance requirements.

## Scope and baseline

Implement the [five feature assignments](parallel-batch-05-adventure-defense-and-home-feature-spec.md), with status in [AV01–AV05](../maintainers/parallel-batch-05-adventure-defense-and-home.md). The inspected baseline is main `34233ae2`; branch evidence is distinguished in the feature audit. References name current files unless explicitly called proposed or incoming. Proposed filenames identify responsibility, not permission to create a parallel owner if the base has since gained one.

This design makes work implementable without instructions to communicate between chats. An owner supplies earlier-wave changes; a worker completes its own scope under AGENTS.md. Integration is not permission to close unrelated parent tasks, reconstruct old saves or change mortality to make a demonstration easy.

## Shared responsibility and delivery contracts

| Producer / semantic owner                    | Consumers                                  | Contract and failure behavior                                                                                                                                                                                                            |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incoming PG05/PX01 threat and lifecycle work | AV01, AV02                                 | Use committed preparation/strike outcomes, the real damage owner, source geometry and selected player lifecycle. Missing integration blocks actual threat qualification; no copied controller or replacement mortality.                  |
| PX03 encounter evidence / known places       | AV01                                       | Supply named physical site definitions and ordinary inspect/arrival events. PX03 alone learns and projects last-known places; no AV01 omniscient map or parallel visitation flag.                                                        |
| AV01 physical recipe records                 | Existing knowledge/admission               | A permitted exact record references an already installed pinned method. Explicit learning grants that method once, without possession, execution or knowledge of unrelated methods.                                                      |
| AV02 equipment attachment                    | All held-tool consumers; AV04 cloak        | Object placement remains the saved physical truth. Read occupied ports/tool capabilities through one resolver; atomic equip/unequip handles conflicts and current custody. Missing/unusable capability refuses before mutation.          |
| AV02 contact-defense resolution              | Current strike/body/event owners           | A pure calculation returns prevented and remaining injury from current lawful guard facts. The ordinary committed attack consumes the interception and applies injury exactly once; it does not emit a second independent damage action. |
| AV03 competence contribution                 | Existing shot resolution                   | Read the actor's applicable, supported competence and add its declared accuracy contribution before the existing animal factor. Record the actual release first; new progress affects later shots only.                                  |
| PX05 structural design; AV04 implementation  | Geometry, inventory, native work, rest, UI | Installed real parts and dependencies determine coverage/clearance. The builder grant and exact material rights are checked at the mutation owner. A preview cannot reserve, install or authorize anything.                              |
| AV05 preparation definitions                 | All cooking entrypoints                    | Resolve exact input/output/work/heat from installed world data. Shared native work owns holds, interruption, debit/output and receipts. Missing or changed definition refuses/reconciles under current active-work integrity.            |

### Work that may proceed together

AV01 can build sites/rewards/record learning before PX03, but cannot call its complete place-discovery acceptance done. Final two-handed spear integration also consumes AV02; content work and current single-tool use do not wait for that integration. AV02 starts after the incoming threat/lifecycle revision is supplied. AV03 and AV05 have no new earlier-batch runtime prerequisite. AV04 starts after PX05, with final cloak attachment waiting for AV02's equipment contract. Its geometry, installed materials, permission and weather work can proceed independently of that attachment integration.

AV02 owns removing the old writable `equippedItemId` representation and updating **all current consumers in its supplied base**. AV03 uses the current equipped-tool owner, not a copied inventory search; AV05 reserves a work tool without introducing a second held-equipment store. When integrating branches that predate AV02, reconcile remaining callers to the new resolver as part of the affected assignment's integration. A source-level contract in this plan is not a claim that an unmerged API exists.

Keep the existing main action executor as dispatcher. New substantial calculations belong in focused domain owners rather than growing unrelated inline branches. Server projections, native admission, NPC offers and player menus consume the same descriptors and pure prerequisite work. Do not rebuild PG04's expensive disposable-execution preview for a new action.

## Common implementation requirements

### World configuration and extensibility

World-specific names, item roles, probabilities, recipe content, ports, species, dimensions, narration templates and timing live in `packages/domain/src/worlds/base/` and their [world documents](../worlds/base/README.md). Generic code handles exact identities, typed data, registered trusted computation, authority and persistence. A string label or generated prose cannot manufacture a new native capability.

Extend the existing manifest, family admission, action descriptors and editing/inspection consumers for each selected capability. A definition must be inspectable, reject unusable combinations at its owning boundary, invalidate affected previews, and disclose unsupported operations plainly. Do not build an unused plugin loader, universal expression language or generic quest framework. The genuinely different cases required below prove useful seams, not universal composability.

### Lifecycle and knowledge

Use current exact item/definition/action identities and revisions. Admission is repeated only where execution-time changes can invalidate prerequisites. One committed operation owns the outcome and evidence; previews do not consume randomness, stock, ammunition or learning. Cancel/reconnect/current-format save/reopen cannot double grant, double spend or reroll a resolved attempt. Pending work retains its real continuation or a supported explicit failure.

Use existing events/action experience for facts and actual participant knowledge. Body condition, inventory contents, competence evidence, recipe rights and hidden resource state do not become public because a new feature needs a convenient panel. Corrections use current overlays and support rules; do not create a feature-specific universal audit system. The root no-legacy policy applies to current model changes: update current callers and validation together, reject incompatible development saves explicitly, never silently reset them.

### User experience and cognition

Use the existing action picker, inventory detail, person controls and shared design-system tokens. At the decision point show exact target/tool, approach distance when relevant, real work time, materials/conflicting equipment and a reachable reason for refusal. Keep the principal action and Stop visible. Show actual result versus incomplete or failed work; never say only “sequence complete.” Parent activity wording retains its purpose and performed steps through the action-experience renderer.

For construction, gear and practice, put the action/summary above a readable details area; let optional breakdowns expand locally. Keep labels next to values, use tabular numbers for comparisons, wrap long names, reserve padding for focus/errors, and stack panes when content cannot fit. Preserve selections/drafts while reflowing; do not shrink text, clip important facts or require hover. In-world guard/preparation feedback must remain understandable without color, animation or sound alone. Actual geometry backs any preview outline.

NPC offers use permitted target and inventory facts with the normal relevance preparation, not every actor multiplied by every tool and site. The new action's availability does not set a goal or select it. Use concise world-owned language and the current model/provider policy. Native correctness, controlled choice fixtures and live free choices are separate evidence; report exact additional/cumulative costs for any Jev-related work under current authorization. No new paid retries or spending grants are created here.

### Work bounds and completion evidence

Operate on the selected object/site/participants, the existing spatial index and relevant installed definitions. Aggregate world population, growing history and many sites must not cause a scan for every menu row or simulation tick. Only active work needs deadlines; empty sites and completed progress do not require periodic global processing. Use existing paged/indexed discovery and authoritative event/record storage, not arbitrary actor-memory or world-object caps.

Each task's acceptance includes its real application path, meaningful refusal/cancellation and current-format continuity. Whether to author tests and which checks to run follows AGENTS.md and [Verification](../../.agents/rules/verification.md). This plan defines required evidence, not a blanket test-writing workflow. Reuse suitable existing tools/fixtures after checking compatibility. Record native, browser and genuine-model evidence distinctly, including unmeasured scale and uncoached-play gaps. No raw output dumps go into Git.

## AV01 — Sites, rewards and physical recipe records

### Owned change and source map

The [world profile](../worlds/base/rewarding-expeditions.md) owns actual site/reward content. Existing source owners:

- `packages/domain/src/worlds/base/world.ts`, `spatial.ts`, `landscape.ts`: new-world placement, finite stock and supported route geometry. Reuse the existing lookout instead of spawning a duplicate.
- `worlds/base/items.ts`, `recipe-families.ts`, `knowledge.ts`: item/tool facts, admitted field-sling definition and authored starting/learned knowledge distinctions.
- `packages/domain/src/objects.ts`, `item-handling.ts`, `knowledge.ts`, `action-experience.ts`: actual custody, exact grants and recorded action effects.
- `apps/server/src/action-catalogue.ts`, `action-descriptions.ts`, `inventory-view.ts`, `knowledge-context.ts`: permitted offers and explanation; consume PX03's incoming place/encounter owner.
- `apps/client/src/ui/inventory.tsx` and the existing action-picker surface: inspect/learn and useful comparison. Do not build a separate reward inventory.

### Record and learning contract

Add an optional typed recipe-record capability on an ordinary item definition/instance through the current item-capability pattern. It references an exact installed method pin and an authored disclosure permission. Display text cannot carry executable instructions or substitute for that pin. The persistent object remains portable and follows existing custody/inspection. Public placement does not expose unrelated container contents.

A **Learn this method** invocation binds actor, exact record and its current revision. Resolve permitted inspection and in-reach access, validate the record's installed method and disclosure, then call the existing knowledge mutation owner. Return acquired/already-known/unavailable with the exact method reference and an action occurrence. Do not use a second reward-granted boolean or teach every observer. No method execution or private author provenance is bundled with learning.

If an item moves, access changes or a definition changes between inspection and execution, recheck at admission. A permitted recipient can learn from a transferred record. A copied visual caption does not confer authority. Existing knowledge withdrawal/revision rules govern invalidation; do not retroactively revoke a valid lesson merely because the record later changes hands.

### Delivery order and acceptance

1. Author/validate the spear and known method, place finite lots, clues and record on reachable surfaces. Preserve current starter supplies and existing saves.
2. Add exact inspect/learn capability through normal native, server and UI entrypoints, including clear already-known/stale outcomes.
3. Feed actual discovered place/record events to supplied PX03; surface last-known sites and later manufacture/use without omniscient navigation.
4. Qualify route → spear use → second discovery → method learning → real craft/use; also known-recipe reuse alongside live invention, two visitors, removed record, depleted stock, forgotten/unknown location, interrupted approach and restart. Incoming threat permits both avoid and confront paths with unchanged mortality.

The source map is not an invitation to rewrite PX03. AV01 closes only its content/physical-record subset of NC exposure and INV knowledge work. Browser qualification must establish that clues actually guide a player, not just that teleporting to coordinates finds an item.

## AV02 — Equipment and one contact-defense owner

### Owned change and source map

- `packages/domain/src/objects.ts`: current `equipLot`, `unequipLot`, transfer/retirement handling and attachment validation.
- `item-handling.ts`: atomic object changes currently copy the single equipped reference; this must follow the new single owner.
- `types.ts`, `world-modules.ts`, `invention-families.ts`: current model, admitted equipment/defense profiles and body applicability.
- `strikes.ts`, `kernel.ts`, `body-policy.ts`, plus incoming `territorial-threat.ts` and consent/lifecycle owners: contact attempt and committed injury. Incoming filenames must actually exist in the supplied branch before their integration is claimed.
- `worlds/base/items.ts`, `recipe-families.ts`, `actions.ts`, body definitions and a proposed `shield-defense.ts`: authored hand use, guard and known shield.
- Server action/inventory/context projections, protocol views and existing inventory/action UI: one resolved equipment view and actual block results.

### Equipment authority

Use the existing attached item placement as physical authority. Extend admitted item equipment data with occupied body-port references and supported uses. Its attachment's primary port identifies placement; the full occupied set comes from the pinned definition. Derive the actor's equipment lookup through the existing object index and a shared resolver. A maintained acceleration index, if needed, is rebuilt/validated from placements and is not separately writable saved equipment truth.

Remove `ActorComponent.equippedItemId` and update current callers, protocol, validation and save model in this assignment; do not preserve a legacy alias or dual-write map. A body supplies available ports. A profile claiming a missing port or conflicting with another current attachment cannot be used. A two-handed item is one entity occupying two ports, not duplicated into two inventory entries. Equipment benefits come from actual current attachments, not item ownership alone.

The equip transaction individualizes one unit as today, resolves requested and conflicting attached items, checks all relevant custody/reservations/action constraints, stows conflicts in the same actor's carried custody, attaches the selected exact item and publishes invalidation/effects atomically. Failure changes nothing. Drop/offer/transfer/consume/retire/death/lifecycle paths remove or preserve the exact attachments under their current laws. Replacement life must not retain a retired body's references.

Expose one query for current equipment by declared use and exact optional item, plus readable port/blocked-use information. Existing attack auto-equip continues through that mutation owner. AV04 can register the cloak's authored port without another actor field. This is finite body equipment, not an all-purpose socket framework.

### Guard and injury resolution

Add a typed guard action binding exact shield and permitted facing/target input, using the existing exclusive physical action lifecycle. Set the real body heading once from that input; the guard holds that facing, and changing it requires a new chosen guard rather than a nonexistent general turn command or automatic target tracking. Save preparation/readiness/recovery phase, deadlines, bound profile pin and whether the one interception remains. Use simulation deadlines, not per-frame mutation or paid cognition to hold the pose. Once recovery is committed, retain its availability deadline through action replacement and equipment changes so Stop/movement cannot erase it; movement remains allowed while another guard or offensive attack waits. Reuse the native action-availability owner, scoped to the current body/life, rather than another global timer. World tuning comes only from the [shield profile](../worlds/base/shield-defense.md).

Factor the contact impact calculation through one reusable resolver invoked by current native strikes and the incoming threat. Inputs are the real admitted contact attempt and current target state. Validate ordinary attack legality before reading guard applicability. Calculate raw injury, prevented component and actual injury without mutating or rolling again. The same atomic attack commit consumes an applicable interception, transitions guard recovery, applies actual injury through the body owner, and records the structured result. Current interruption and death use actual resulting state.

Stable simulation ordering determines same-time attempts; the first lawful intercepted hit consumes the one interception. A later hit sees recovery/current state. No second event listener independently subtracts damage or marks a block after injury. Misses, wrong-sector attacks and unrelated hazards never receive protection by matching a generic word in their result.

### Delivery order and acceptance

1. Integrate supplied threat/lifecycle behavior; trace all equipment readers and item cleanup before replacing the single reference.
2. Deliver equipment authority and caller cutover, then shield definition/family/known manufacture and ordinary compare/equip UI.
3. Add chosen guard and shared contact resolution, its readable phases/results, and relevant scoped NPC offers.
4. Qualify knife+shield, a two-handed weapon stowing both, an unavailable/reserved conflict, last-unit split, drop/offer/transfer, death/reincarnation and pending-save integrity. Qualify correct front timing, miss, side/rear, expired guard, cancellation, incompatible hazard, simultaneous contacts and unseen attacker privacy against the actual incoming threat.

Prove a changed admitted shield profile changes the same calculation and view. Qualify a body without these ports, not merely another named human. Broader armor, combat AI, projectile travel and PvP remain outside scope. If the damage path cannot preserve the supplied mortality contract, that is an in-scope integration defect, not a reason to simplify death rules.

## AV03 — Practical skill from committed experience

### Owned change and source map

Implement [PC02–PC06](../maintainers/practical-competence.md), supplying `docs/projects/authored-stats-tech-design.md` as the missing canonical counterpart for this selected consumer. Preserve the broader optional examples rather than marking them delivered. The exact product and tuning owners are [section 16](authored-stats-feature-spec.md#16-dg14-expansion--become-more-capable-at-something-worth-doing) and [practical competence](../worlds/base/practical-competence.md).

- `packages/domain/src/world-modules.ts`: applicable typed attribute definitions/read/write, missing/private distinctions and authored installation.
- `kernel.ts`, `strikes.ts`, `worlds/base/recipe-families.ts`: current swing mechanism, release checks and single accuracy roll.
- `action-experience.ts`, `knowledge.ts`, `state-contributions.ts`: committed occurrence references, existing evidence/overlay boundaries and one authoritative derived contribution.
- `action-capabilities.ts`, current native work and perception owners: inert target, actual observation and two-person feedback.
- Server cognition/perceived context/action catalogue and person/inspection UI: relevant choices and private progress. No new planner or general relationship score.

### Progress and contribution

Register the world-owned competence on applicable bodies through existing typed-state ownership. Keep authored starting support distinct from earned support. A small progress component references up to the canonical six released-shot occurrences plus one qualifying completed coaching episode. It is supporting data for one current competence contribution, not another general history or XP store. The existing action/evidence records retain their independent retention policy.

At an actual eligible release, capture the supported mechanism pin and current competence, consume the real projectile and resolve the one existing hit comparison. Commit that outcome; then reconcile progression and its future contribution in the same authoritative transition. A display refresh, narrated story, observed third-party shot or starting preparation cannot credit a release. Once coached improvement exists, continue gathering the bounded independent support to six as required by the canonical correction rule.

One reconciliation owner handles installation, eligible outcomes, coaching completion, support correction and permitted rule changes. Do not persist a mutable attribute value and an independently editable counter that can disagree. The owning state service exposes the supported current value; preview and execution consume it. Loss of sole support suppresses future benefit while retaining actual historical shots and spent ammunition. Ordinary compaction, absence and death do not invent loss.

### Inert target and cooperation

Use a real nonliving target capability, not an immortal animal. Reuse the ranged-work lifecycle but supply the target consumer's own applicability, safe-clearance and output contract. One active practice shooter per target; rejection has no queue or ammunition debit. No body damage, corpse, loot or animal danger factor. Current geometry, equipment, compatible projectile and active-action checks still apply at release.

Coaching is a finite two-person episode with exact participants, scope revision, separate consents, observation reference, participation/work phase and completion/cancellation. Use the current actor/action/consent patterns; do not re-purpose a recipe Teach command to grant skill. A request grants neither actor a future action. Each participant must actually select the episode, and can withdraw under existing replacement/cancellation. At most one active episode per participant under the authored profile.

Bind the coach's **actual permitted observation** of a qualifying learner release during the agreed episode. Hearsay and omniscient source lookup are insufficient. After that observation, both choose the guided-feedback work; admission checks the coach's actual competence, participants, permitted communication/reach and work availability. Completion grants one support reference. Leaving midway preserves actual shots and ends incomplete feedback honestly. New consent is needed for a later attempt; reconnect does not manufacture it.

Chosen NPC speech stays with the conversation owner. Native completion can describe the supported method and actual observed result without fabricating a quotation or diagnosing an unmodeled posture. A trained resident is authored through mechanical starting competence; biography alone grants nothing. The first prepared scene may provide a practiced resident, but never force acceptance or replace Ada's independent goals.

### Delivery order and acceptance

1. Reconcile the scoped technical counterpart and installed world law, progress support and later-shot contribution.
2. Deliver useful ordinary-hunt progression and inert-target practice with real material use and private inspection.
3. Deliver request/accept/refuse, observed release, chosen feedback and interruption through current UI and NPC choice paths.
4. Complete PC05/PC06 continuity, correction, cost and game-value comparisons. Include six-shot independent support after early coaching, a private/missing/inapplicable value, a revised tool, repeated receipt, blocked release, absent teacher, refusal and save during work.

No general teaching framework or a second skill is needed to complete this consumer. If appreciation is unproven, record that evidence gap; do not lower beginner accuracy or stretch repetitive work to make the numerical advantage compulsory.

## AV04 — Real construction and useful shelter

### Prerequisite and source map

**Runtime implementation begins after PX05 supplies `docs/projects/editable-shelters-tech-design.md` and resolves its required technical contracts.** That path is an expected deliverable, not an existing verified file in the inspected main. Product scope is already in [DG13's expansion](editable-shelters-feature-spec.md#14-dg13-expansion--make-a-place-use-it-and-change-it) and the [world profile](../worlds/base/editable-shelters.md). PX05's canonical design owns the detailed structural schemas; this allocation does not create a competing schema while that assignment remains open.

Its implementation must extend current `packages/domain/src/objects.ts`, material/invention owners, `action-capabilities.ts`, `state-contributions.ts`, spatial surfaces/clearance/navigation and current-format persistence. Client scene/picking and placement UI consume the same geometry and permitted plans. Server preview/inspection and native execution must share the actual construction prerequisites. Use AV02's attachment owner for wearing the same cloak, rather than a shelter-only equipped flag.

### Required technical closure from PX05

Before dependent coding, the supplied design must identify exact persisted part/connection identity, one construction permission authority, material-use grants, phases and holds, coverage/support query ownership, occupant-safe alteration, condition propagation on split/combine, relevant geometry invalidation, save/active-work reconciliation and explicit limits. It must cover both arrangements and all selected cloak/rest/visitor/reclaim behavior. A checklist labeled designed without those decisions does not satisfy the prerequisite. Developer decisions, if any remain, must be answered before their dependent work.

### Delivery order and acceptance

1. Implement the admitted first structural family, part identity/placement and builder/material authorization through the canonical owners; permit no generic take/drop bypass of installed-part protection.
2. Deliver placement preview and phased installation. The preview states actual costs and covered footprint; it neither reserves resources nor teleports the builder. Recheck geometry/material/permission at each committing phase. Completed parts persist after cancellation; unfinished work cannot grant coverage.
3. Deliver actual cover/exposure, bounded local rain/moisture, ordinary rest/visitor/storage use and cloak wear. Use existing contributions/simulation boundaries; an inactive dry shelter needs no global per-frame loop. A body or item outside the supported footprint remains exposed.
4. Deliver extension, temporary replacement coverage, proper dismantle order, light-family support loss and same-item reclaim. Shared-support dependency lookup is local to the assembly. Reject unsupported heavy loads, higher storeys and unauthorized edits before effects.
5. Complete the selected product journeys with real UI and current-format return, including interrupted phases, an occupied footprint, one shared support, two roof layers, moved material, outside/inside rain exposure, competing edit and protected parts through ordinary inventory routes.

The one-builder/material grant is narrow and does not alter general theft/title, container access or visitor rights. No recurring rain, illness, fire penalty, private room or NPC housekeeping routine is needed to prove positive shelter value. Current scope ends at the qualified selected family; broader INV-6.4/SW/PO remain accurately open.

## AV05 — Finite casts and preparation definitions

### Owned change and source map

The [world profile](../worlds/base/river-fishing.md) owns contents and tuning. Extend:

- `worlds/base/world.ts`, `landscape.ts`/`spatial.ts`, `items.ts`, `recipe-families.ts`, `actions.ts`: actual reaches/stances, admitted tool, raw/cooked items, authored cooking definitions and language.
- `packages/domain/src/kernel.ts`, `action-capabilities.ts`, current native work/reservation/resource owner: finite attempt and exact food transformation. Use a focused calculation/helper owner for the new source family instead of a duplicate scheduler.
- `objects.ts`, `action-experience.ts`, current resource/saved-randomness state: finite stock, outputs and result ports.
- `apps/server/src/action-catalogue.ts`, `action-descriptions.ts`, `inventory-view.ts`, relevant context/interest preparation: offers and descriptions from the installed definitions.
- Protocol and current inventory/action controls: exact tool/source selection, stopping and real result. Fishing consumes existing action UI, not an isolated minigame screen.

### Resource attempt

Represent the reach as a finite resource capability with exact source identity/revision, remaining catch units, supported water footprint/stance reference and installed extraction profile. It is not an invisible per-actor stock and not a population of fake animal entities. The engine can host another authored source profile; world text and food effects are not universal.

Bind one exact tool and source into one native work occurrence. Reuse approach/physical channel/stop and active item reservations. Resolve only at its due simulation boundary after rechecking participation, current geometry, tool and remaining stock. One lawful attempt takes one saved random draw; success decrements stock and produces the output atomically. Empty attempts record actual work without granting items. If the last unit was removed by another committed attempt, reject before a new draw and explain only permitted current availability.

Do not reserve a potential fish for the entire approach, draw in a preview, share a precomputed lucky outcome between actors or call a provider to decide the physical catch. Event-time commit ordering supplies concurrency; ordinary item result ports permit subsequent packing/cooking. Paused/deferred work does not advance on wall time. No new endless-retry operator is added.

### General food preparation

Replace the single `BASE_FAMILY_FACTS.cooking.input/output` assumption with installed finite preparation definitions. Each definition declares identity/revision, exact admissible input roles/quantities, exact output definitions/quantities, work duration, required supported heat capability and authored presentation. No arbitrary effect expression or generated executable code. Bind the selected definition and exact input lots when choosing the action.

One resolver supplies catalogue facts, cognition offers, resource holds and execution prerequisites. One existing work owner debits inputs and creates outputs, preserving its current interruption/heat-failure semantics. Pins/revisions and the current live-definition owner determine invalidation; no legacy raw-meat fallback reader. Update all current cook producers and consumers together, including structured action outputs and learned-method bindings. Existing learned food methods keep their meaning only where their exact current definitions remain valid; no silent substitution of a different food or missing heat.

This is a real second consumer of food preparation, and a targeted BW06 boundary repair. Move relevant meat/fish wording and selection rules into world definitions rather than merely adding `if fish` beside `if meat` in each caller. Do not expand into arbitrary crafting or rewrite all native action families.

### Delivery order and acceptance

1. Generalize current cooking through the existing owner, preserving its current meat behavior with exact data; verify a contrasting supported preparation definition.
2. Admit the tool, place real reaches and supply the finite cast lifecycle with saved randomness and exact item output.
3. Wire ordinary player choices and relevant permitted NPC candidates; expose no unseen stock, hidden success draw or imposed food goal.
4. Qualify the complete meal/carry/offer journey, empty cast, exhausted reach, blocked stance/line, unavailable or replaced tool, cancellation, same-time last fish, heat loss, changed input, stale definition and restoration before/after outcome. Current meat preparation remains valid through the same owner.

The initial native probabilities and stocks are content choices, not successful-play evidence. Record whether travel, retries and the final meal feel worthwhile compared with existing hunting. Do not claim all supported actors autonomously choose fishing from one injected selection or hide repeated attempts' costs.

## Documentation reconciliation map

| Assignment | Canonical updates on delivery                                                                                                                       | Related tracked scope to reconcile without closing wider parents                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AV01       | Proposed expedition profile → delivered world behavior; relevant item/knowledge/action and narration specs; actual verification report              | AV01; PX03's content/exposure integration; NC09–NC12 exposure subset; INV-4/INV-7 knowledge/admission consumers; AC09/AC11; BW starting-world content; PO custody where changed  |
| AV02       | Shield profile, base combat/items, persistent objects, targeted actions, equipment/body permissions, current save model; actual evidence            | AV02; AC09/AC09.6/AC10/AC11; PO04/PO07/PO10; EWF04/06/07; BW14 interaction only under supplied lifecycle; INV shield-family admission; UIUX changed controls                     |
| AV03       | Authored-stats technical counterpart, feature section 16, practical-competence world/limits, action experience and typed-state explanation          | AV03; PC02–PC06; DG14/ND03 and the practical part of ND04; EWF02/04/06/07; SC authoritative contribution; AE02/04/08 consumer; AG/CE genuine participation evidence              |
| AV04       | Supplied shelter technical counterpart, feature section 14, world shelter rules, objects/spatial/state/permission and selected use; actual evidence | AV04; PX05 remains design-only acceptance; DG13/ND07 and shelter-only ND08; INV-6.4; SW03–SW08/SW15–SW16 affected portions; PO and SC integration; BW home content               |
| AV05       | Fishing profile, world actions/items/survival, installed preparation definition contract, action output/learning facts; actual evidence             | AV05; BW06 cooking boundary only; AC09/AC10/AC11; INV-6 relevant finite material/preparation subset; PO conservation; AE02/04/09 food-method consumer; AG13 food-choice evidence |

Implementation updates the batch tracker and actual affected parent entries in the same change, retaining unsatisfied broader criteria. A delivered child does not close a whole ND, INV, SW, UIUX or behavior-quality project. Preserve historical evidence with its original revision and limits. Competence/shelter restrictions remain in their existing inventories; new batch restrictions are indexed below until their runtime owners adopt them.

## Maintained records

- Product scope, estimates and gates: [feature specification](parallel-batch-05-adventure-defense-and-home-feature-spec.md).
- Delivery: [AV01–AV05 tracker](../maintainers/parallel-batch-05-adventure-defense-and-home.md); [standalone prompts](parallel-batch-05-adventure-defense-and-home-prompts.md).
- Constraints and growth: [batch inventory](../limits/parallel-batch-05-adventure-defense-and-home.md), [authored stats](../limits/authored-stats.md), [editable shelters](../limits/editable-shelters.md).

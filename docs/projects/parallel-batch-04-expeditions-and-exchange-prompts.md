# Parallel batch 04 — Expeditions and exchange — assignment prompts

| Status      | Current progress                                                                                                        | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | PX01 is completed; the retained prompts and prerequisites apply to the other assignments and future integration checks. | 2026-10-06   |

Use the [allocation/readiness table](parallel-batch-04-expeditions-and-exchange-feature-spec.md#allocation-and-readiness) before distributing these. **PX01 is conditional on the approved encounter design and overlapping runtime work. PX04 needs integrated PG02. All runtime tasks consume integrated PG03/PG04 where relevant. PX05 is design only and can start independently.** The owner supplies the correct starting branch; these instructions do not direct workers to communicate with each other. [Technical boundaries](parallel-batch-04-expeditions-and-exchange-tech-design.md#shared-boundaries-and-delivery-order) settle shared ownership.

## 1. A readable wilderness threat — conditional implementation

**Completed under [PX01](../maintainers/parallel-batch-04-expeditions-and-exchange.md#px01--a-readable-wilderness-threat).** Retained original assignment; do not dispatch it again as a new encounter implementation.

```text
Implement PX01: one readable wilderness threat with warning, a viable way to avoid it, voluntary confrontation and understandable aftermath. Follow AGENTS.md and applicable guidance.

This assignment is ready only on a branch containing the approved PG05 first-threat encounter feature specification and technical design, the relevant settled recovery/protection decisions, and the overlapping injury/targeting/escape/remains work. Those expected files are docs/projects/completed/first-threat-encounter-feature-spec.md and docs/projects/completed/first-threat-encounter-tech-design.md. If they or a consequential decision are absent, report the specific unmet prerequisite rather than inventing its rules or duplicating the earlier assignment.

Read docs/projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md, “PX01 — A readable wilderness threat”; the matching “PX01 — Encounter implementation contract” and shared boundaries in parallel-batch-04-expeditions-and-exchange-tech-design.md; and docs/maintainers/parallel-batch-04-expeditions-and-exchange.md, PX01. The approved PG05 pair owns the creature, warning/escalation, pursuit, reward, loss and recovery behavior.

Use existing combat, activity, perception, body, participation and navigation owners. The technical definition maps kernel.ts, agency.ts, living.ts, participation-state.ts, activity-execution.ts and server projection entrypoints. Creature policy/content belongs in the authored world. Do not recreate injury feedback, corpse lifecycle or escape work already present. Do not introduce PvP policy, omniscient pursuit, a scripted victory or generated-prose damage.

Complete the real warning/avoidance/engagement/aftermath journey, including changed terrain, target loss, miss, blocked reach, protected departure and the approved loss/recovery cases. Demonstrate actual effects and persistence through existing player/actor surfaces; distinguish native behavior from live-model quality evidence. Use AGENTS.md for verification and test-authoring policy.

Keep the PG05 pair, docs/worlds/base/lifecycle-and-protection.md, applicable action/actor descriptions and limits accurate. Update PX01 plus the demonstrated portions of docs/maintainers/base-world.md BW14, multiplayer.md MP04, product-scalability.md PS05 and needs-design.md DG07/ND11. Preserve broader incomplete human-conflict and ghost work. Follow the documentation mapping in the technical definition rather than marking whole parents complete from this encounter alone.
```

## 2. Trade something useful

```text
Implement PX02: a player or resident can offer an exact item quantity for an exact item quantity, and acceptance transfers both sides together or neither. Follow AGENTS.md and applicable guidance.

Read docs/projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md, “PX02 — Trade something useful”; parallel-batch-04-expeditions-and-exchange-tech-design.md, “PX02 — Reciprocal offer contract” plus shared boundaries; and docs/maintainers/parallel-batch-04-expeditions-and-exchange.md, PX02. Read docs/worlds/base/social.md, “Offering and accepting possessions,” docs/worlds/base/items.md and docs/ui-ux/inventory.md, “Future trading: inspect, agree, commit.” The proposed first-family bounds are in docs/limits/parallel-batch-04-expeditions-and-exchange.md, PX-L01.

Extend the existing handover semantic owner and ordinary object/resource-claim transitions, preserving current gifts. The technical definition identifies domain, server, protocol and inventory/person UI callers. Exact terms and revision govern consent; counteroffers invalidate earlier agreement. Validate final joint placement before committing both moves. Do not expose another character’s private inventory or use two independent gifts as a trade. Keep currency, pricing scripts, credit, standing reservations and generalized negotiation outside this slice.

Use integrated PG03/PG04 action presentation and shared prerequisite evaluation. Show You give / You receive with readable exact terms, current status and reachable controls; preserve drafts on refusal or stale terms. NPC choice receives permitted offer details and relevant current priorities, not a forced acceptance. Complete voluntary exchange and refusal plus changed contents, changed quantity/work, reach loss, withdrawal, duplicate delivery, disconnect and reload with no half-transfer or privacy leak. Use AGENTS.md for verification and test-authoring policy.

Reconcile docs/worlds/base/social.md and items.md, relevant objects/base-world/action limits, PX02, docs/maintainers/base-world.md BW20, persistent-objects.md and needs-design.md DG06/ND09’s immediate-barter subset, plus relevant inventions-and-world-evolution.md INV-20 scope. Keep deferred currency, institutions, promises and BW21 reservations explicitly open. Document only actual delivered and verified scope.
```

## 3. Discover useful places and objects

```text
Implement PX03: grounded introductions for a newly encountered useful place or inspected inventory item, plus a compact way to find places the character has actually learned about. Follow AGENTS.md and applicable guidance.

Read docs/projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md, “PX03 — Discover useful places and objects”; parallel-batch-04-expeditions-and-exchange-tech-design.md, “PX03 — Encounter evidence and known places” plus shared boundaries; and docs/maintainers/parallel-batch-04-expeditions-and-exchange.md, PX03. Read docs/narration-and-conversations.md, “Replaceable story selection,” relevant memory-architecture.md evidence/forgetting contracts, spatial-world.md and docs/ui-ux/world-interaction.md, “Navigation and world search.” PX-L02 in docs/limits/parallel-batch-04-expeditions-and-exchange.md defines the proposed static-place scope.

Extend existing perception/experience/story selection; generated narration never creates discovery. Author named places over current physical references, not a renderer mesh or a parallel navigation engine. Inventory exposure follows actual permitted inspection. Reuse deduplication and story policy, keep a useful authored fallback, and preserve identity for same-name objects. The source map identifies story-selection.ts, narrator.ts, entity-description.ts, inventory-view.ts and existing history UI/server owners.

Offer Known places through the existing panel family: learned description and last-known location, deliberate focus/inspect, then a separate admitted move action when supported. No omniscient map, unseen live details, hidden bag exposure, forced movement, new memory cap or per-frame narration. Consume integrated PG03/PG04 rather than redesigning their action surface.

Complete first exposure, repeat visit, unfamiliar invented item, two observers, forgetting/correction, inaccessible contents, stale or removed destination, failed navigation and current-format reload. The discovery must support a useful next choice, not just produce decorative prose. Use AGENTS.md for verification and test-authoring policy.

Update PX03 and the place/item-exposure subset of docs/maintainers/narration-and-conversations.md NC09–NC12, needs-design.md DG01/ND18 and relevant spatial/memory tasks. Keep narration, spatial and cognition limits and canonical behavior accurate. Do not close broad narration, maps or character-memory projects from this child delivery.
```

## 4. Take a voluntary outing together

```text
Implement PX04: invite a person to a specific known destination, let them freely accept or decline, and let both participants travel through their own ordinary actions with clear arrival, interruption and leaving behavior. Follow AGENTS.md and applicable guidance.

The starting branch needs integrated PG02 ordinary decision/continuation behavior and PG03/PG04 action interfaces. This task does not need PX03’s future place list: use currently permitted destinations/points. Read docs/projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md, “PX04 — Take a voluntary outing together”; parallel-batch-04-expeditions-and-exchange-tech-design.md, “PX04 — Consenting travel companions” plus shared boundaries; and docs/maintainers/parallel-batch-04-expeditions-and-exchange.md, PX04. Read agent-agency.md, action-experience.md, relevant current composed activity contracts and docs/worlds/base/social.md. PX-L03 in docs/limits/parallel-batch-04-expeditions-and-exchange.md scopes the pair and destination.

The invitation records exact social consent; each existing activity/navigation owner still owns its actor’s motion. Acceptance cannot implicitly replace newly changed work, control someone else, transfer items, enlist combat assistance or impose a promise. Keep terms and scope visible, provide Leave outing, and let action outcomes wake ordinary reconsideration. The technical source map identifies activity-execution.ts, activity-hosts.ts, agency.ts and server activity-requests.ts/activity-request-choice.ts/activity-context.ts callers. Do not add a rival planner, omniscient follow controller, forced friendship, permanent party HUD or per-tick model polling.

Complete voluntary invitation/acceptance/travel/arrival and refusal/withdrawal. Include blocked routes, lost sight/separation, a threat, changed work/destination, tab departure and save/reload without teleportation, hidden tracking, repeated acceptance or resurrected trips. Gathering or conversation after arrival remains separately chosen. Use AGENTS.md for verification and test-authoring policy.

Reconcile PX04, docs/maintainers/agent-agency.md AG05/AG06/AG07/AG12, character-experience.md and needs-design.md DG06/ND10’s small-cooperation subset. Update current agency/action/social documentation and the relevant action/base-world/cognition limits. Preserve broader psychological, institutional, promise-management and unattended-community work as incomplete.
```

## 5. Design an editable shelter worth using

```text
Complete PX05 as a design assignment only: make one useful editable shelter ready for implementation. Do not implement construction. Follow AGENTS.md and applicable guidance.

Read docs/projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md, “PX05 — Design an editable place worth returning to”; parallel-batch-04-expeditions-and-exchange-tech-design.md, “PX05 — Shelter technical-design assignment”; and docs/maintainers/parallel-batch-04-expeditions-and-exchange.md, PX05. Reuse and reconcile docs/projects/editable-shelters-feature-spec.md, then create its missing counterpart docs/projects/editable-shelters-tech-design.md. Do not create a competing shelter feature specification.

Use docs/maintainers/inventions-and-world-evolution.md INV-6.4, persistent-objects.md, state-contributions.md and spatial-world.md to locate existing semantic owners. Read the relevant spatial-world-runtime.md sections under archive/07-technical-architecture, engine-and-world-boundaries.md, docs/limits/editable-shelters.md and applicable UI/UX guidance. The batch technical definition lists the eight concrete design questions and required source mapping.

Specify the actual build/use/alter/reclaim journey, persistent parts and materials, supported layouts, support/coverage/navigation calculations, admission/work/cancellation, permissions, actor knowledge, authored-world rules and current-format save lifecycle. Work through a cloak lean-to and a different two-bay arrangement using the same rules. A place should be worth shaping and revisiting; do not make arbitrary upkeep or wet tinder its sole purpose. Preserve the proposal’s staged rain/moisture scope while leaving general heat/spread and unsupported structural families separate.

Produce an implementation-ready paired design and a sequenced delivery breakdown under existing INV/SW/PO/BW owners, with useful success/failure traces and exact source entrypoints. Identify consequential unresolved owner decisions as stage blockers, not silent defaults. No runtime/provider execution is required to establish design completion.

Update PX05, needs-design.md DG13/ND07 and the shelter-only ND08 subset, relevant INV-6.4/SW/PO/BW planning links, and the shelter limits inventory. Completing the design does not complete runtime construction, weather or home psychology. Keep project status tables and acceptance honest under the documentation policy.
```

## Maintained records

[Tracker](../maintainers/parallel-batch-04-expeditions-and-exchange.md) owns completion, the [paired design](parallel-batch-04-expeditions-and-exchange-tech-design.md) owns handoff contracts, and the [constraint inventory](../limits/parallel-batch-04-expeditions-and-exchange.md) links current subsystem limits. Prompt preparation is not runtime delivery or independent approval of a missing prerequisite.

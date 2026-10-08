# Batch 05 — Five implementation prompts

| Status      | Current progress                                                                                                                  | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | AV05’s river meal and second review are delivered and qualified; the other four assignments and combined integration remain open. | 2026-10-07   |

Use a branch containing this batch's committed documentation. [Allocation and sequencing](parallel-batch-05-adventure-defense-and-home-feature-spec.md#allocation-and-sequencing) explains readiness: AV03 and AV05 can start from the inspected main; AV01 can start independent content work but needs PX03/threat integration to finish; AV02 needs the incoming threat/lifecycle delivery; AV04 needs PX05 and later AV02's equipment integration. These prompts do not execute the assignments from the planning chat.

Current AV05 delivery: [installed preparation/cast contract](../food-preparation.md), [river profile](../worlds/base/river-fishing.md) and [native/player/live-choice evidence](../verification/river-meal.md). Other assignments retain their prerequisite and acceptance requirements.

## 1. Worthwhile expeditions and useful rewards — AV01

```text
Implement AV01: a short expedition worth taking, with two discoverable places, finite usable gear and a physical recipe record enabling later real manufacture/use. Follow AGENTS.md and applicable repository guidance.

Read in order:
- docs/projects/parallel-batch-05-adventure-defense-and-home-feature-spec.md: “What the audit found”, “AV01 — Discover something worth bringing home” and “Allocation and sequencing”.
- docs/projects/parallel-batch-05-adventure-defense-and-home-tech-design.md: shared contracts, common requirements and the complete “AV01 — Sites, rewards and physical recipe records” definition, including its source map and acceptance.
- docs/worlds/base/rewarding-expeditions.md: actual content, known-method reward and finite-stock decisions.
- AV01 in docs/maintainers/parallel-batch-05-adventure-defense-and-home.md and AV-L01 in docs/limits/parallel-batch-05-adventure-defense-and-home.md.

Reuse the existing lookout, item custody, recipe admission/knowledge, manufacture and action UI. Exact record learning grants no stock, fabrication, unrelated knowledge or private inventory access. Preserve the live invention route and distinguish it from a known authored recipe. New-world content must not reseed existing saves.

Physical content and record learning can start on current main. Complete place discovery consumes supplied PX03 implementation; dangerous-route qualification consumes incoming PG05/PX01 threat and selected lifecycle rules. Do not recreate those owners or use obsolete recovery proposals. Use AV02's supplied equipment contract when integrating the spear's two-handed behavior.

Complete route → useful reward → discovered method → actual manufacture/use, with the no-kill route, two visitors, removed record, finite stock, repeated learning and current-format return. Distinguish actual player evidence from native-only checks.

Reconcile the world/item/knowledge/action/narration documentation, AV01, PX03's actual content integration and the NC09–NC12, INV-4/INV-7, AC09/AC11, BW and PO subsets in the technical design's “Documentation reconciliation map”. Retain broader incomplete parent criteria; mark only delivered and verified scope.
```

## 2. Shield defense and compatible equipment — AV02

```text
Implement AV02: craft/use a shield alongside a compatible weapon, choose a finite guard against a real incoming attack and see actual prevented/received injury. Follow AGENTS.md and applicable repository guidance.

Required starting input: the owner supplies incoming threat/lifecycle delivery inspected on codex/pg05-first-threat at 75e8c82e, or its integrated successor. This identifies evidence, not a command to switch or merge branches. Do not build another stag controller or choose mortality again.

Read:
- docs/projects/parallel-batch-05-adventure-defense-and-home-feature-spec.md: AV02 and allocation/sequencing.
- docs/projects/parallel-batch-05-adventure-defense-and-home-tech-design.md: shared contracts, common requirements and all of “AV02 — Equipment and one contact-defense owner”.
- docs/worlds/base/shield-defense.md and the supplied current first-threat/lifecycle specifications.
- AV02 in docs/maintainers/parallel-batch-05-adventure-defense-and-home.md, docs/maintainers/persistent-objects.md, docs/maintainers/action-capabilities.md and AV-L02 in docs/limits/parallel-batch-05-adventure-defense-and-home.md.

Own equipment representation/caller cutover and the single contact-defense calculation. Item attachment remains physical authority; remove the single-equipped-item writable representation without a legacy alias. A two-handed item is one item occupying compatible ports. Equip/drop/offer/transfer/death/save must preserve exact identity and conflicts. AV04 consumes this attachment owner for a cloak; AV01 for its spear.

Guard uses lawful geometry, equipment and action phase at actual impact. It never changes PvP permission, rerolls an attack or independently subtracts damage after a hit. Preserve ordinary knife, gathering-tool, sling and bow use. No armor, stamina, durability or universal passive protection. Show actual auto-equip conflicts and readable guard outcomes through existing UI and relevant NPC choices.

Complete the feature/technical acceptance: front/late/rear/miss/expiry/cancel, simultaneous contacts, hidden attacker privacy, stack splitting, incompatible gear and current-format lifecycle. Demonstrate a different admitted shield profile through the same consumer.

Update shield/combat/items, targeted-action, object/equipment and save documentation, AV02 and the AC09/AC09.6/AC10/AC11, PO04/PO07/PO10, EWF04/06/07, INV-family, BW14 interaction and UIUX scope in the technical reconciliation map. Preserve broader acceptance and report actual evidence/limits.
```

## 3. Useful practice and willing coaching — AV03

```text
Implement AV03 and PC02–PC06: a capable sling user becomes more dependable through actual hunting or peaceful target practice; a willing practiced person can help through an observed shot and chosen feedback. Follow AGENTS.md and applicable repository guidance.

Read:
- docs/projects/authored-stats-feature-spec.md, section “16. DG14 expansion — become more capable at something worth doing”. The roof/dice example is excluded.
- docs/worlds/base/practical-competence.md for exact effect, independent/coached routes, target, evidence, privacy and correction.
- docs/projects/parallel-batch-05-adventure-defense-and-home-tech-design.md: shared/common requirements and all of “AV03 — Practical skill from committed experience”. Supply docs/projects/authored-stats-tech-design.md as the canonical scoped counterpart while delivering the feature; this is not design-only work.
- docs/maintainers/practical-competence.md, AV03 in docs/maintainers/parallel-batch-05-adventure-defense-and-home.md and docs/limits/authored-stats.md.

Existing sling release, typed state and committed evidence are available. No shelter, cross-world library, general skill tree or PX04 trip controller is required. Keep recipe knowledge, tentative learned methods, actual handling competence and willingness separate. Use the current equipment owner, not a parallel store while AV02 generalizes equipment.

Count actual released shots once, including misses; improvement affects later shots. Deliver a real inert target and actual ammunition use, not an immortal animal. Coaching requires each participant's choice, permitted observation and chosen feedback. A resident may refuse; native completion cannot invent speech. Preserve the independent route and capable beginner.

Complete independent practice, genuine voluntary coaching, interruption/refusal, missing/private/inapplicable values, support correction, blocked releases, duplicate outcomes and current-format return. Separate native/fixture evidence from actual NPC choice and player-value evidence. Current policy controls provider use and exact cost reporting.

Update the authored-stats pair, practical-competence world/limits, PC02–PC06, AV03, DG14/ND03/ND04's practical subset and EWF/SC/AE/AG/CE consumers in the technical reconciliation map. Do not close general progression, personality, recipe teaching or learned-method projects.
```

## 4. Build, inhabit and alter a real shelter — AV04

```text
Implement AV04: build an actual small canopy, use its cover/space, extend it to two bays, wear/reuse its cloak and reclaim the same real parts. Follow AGENTS.md and applicable repository guidance.

Required starting input: PX05's completed docs/projects/editable-shelters-tech-design.md with its technical decisions resolved. It was absent from the batch's inspected main. Do not start dependent construction from an unresolved design. AV02's equipment attachment contract is also required for final cloak-wearing integration; geometry/construction can proceed after PX05 independently of that smaller dependency.

Read:
- docs/projects/editable-shelters-feature-spec.md, especially “14. DG13 expansion — make a place, use it and change it”, and its supplied technical counterpart.
- docs/worlds/base/editable-shelters.md for actual parts, arrangements, work, permissions, rain/moisture and non-punitive use.
- AV04 in docs/projects/parallel-batch-05-adventure-defense-and-home-feature-spec.md.
- docs/projects/parallel-batch-05-adventure-defense-and-home-tech-design.md: shared/common requirements and “AV04 — Real construction and useful shelter”, including the PX05 closure gate.
- AV04 in docs/maintainers/parallel-batch-05-adventure-defense-and-home.md, PX05 in docs/maintainers/parallel-batch-04-expeditions-and-exchange.md and docs/limits/editable-shelters.md.

Use ordinary object/material, spatial, contribution, native-work and permission owners. Real parts, supported surfaces and completed phases determine cover. Preserve builder/material authorization through every edit and inventory route. Visiting grants no editing rights. Completed parts survive interruption; preview never creates them.

Deliver placement, phased build, actual rest/visitor/possession use, selected rain/moisture, extension, cover replacement, safe light-cover support failure and reclaim. Use AV02 for cloak attachment. No heavier roof, private room, forced maintenance, new sleep/fire/health penalty or recurring storm.

Complete the selected journeys through real UI and current-format return, including occupied/invalid geometry, unauthorized materials, partial work, shared supports, two layers, competing edits and conservation. Show positive shelter value without worsening existing basic survival.

Update the shelter pair and world/limit docs, AV04, PX05's separate design status, DG13/ND07 and shelter-only ND08, INV-6.4 and affected SW/PO/SC/BW requirements from the reconciliation map. Do not close broader construction, weather or material acceptance from this first family.
```

## 5. Fishing and general food preparation — AV05

```text
Implement AV05: make/obtain a fishing tool, choose a real river reach, perform a finite cast, obtain an actual catch and cook/eat or share it. Follow AGENTS.md and applicable repository guidance.

Read:
- AV05 in docs/projects/parallel-batch-05-adventure-defense-and-home-feature-spec.md.
- docs/projects/parallel-batch-05-adventure-defense-and-home-tech-design.md: shared/common requirements and all of “AV05 — Finite casts and preparation definitions”.
- docs/worlds/base/river-fishing.md for tool, sources, one-cast rules, stock/randomness and food transformation.
- docs/worlds/base/actions.md, docs/worlds/base/items.md and docs/worlds/base/survival.md for current work, custody and food behavior.
- AV05 in docs/maintainers/parallel-batch-05-adventure-defense-and-home.md and AV-L03 in docs/limits/parallel-batch-05-adventure-defense-and-home.md.

This can start from current main plus this plan. Existing work-tool reservation, finite resource handling, cooking and eating are available. It does not require shelter, competence, barter, PX03 or AV02's held-equipment extension.

Generalize raw-meat cooking into installed world preparation definitions, then use that same owner for fish. Update catalogue, facts, cognition, exact input/output bindings and execution together. No fish/meat name switch, separate cooking handler, arbitrary effect language or legacy fallback. Preserve current meat behavior.

Fishing binds exact tool/source/stance, one work occurrence and one lawful saved-randomness resolution. Appearance alone is not a source. No automatic recast, bait/durability economy, boats, regrowth, thirst or imposed NPC food goal. Finite stock and costs remain truthful after competition, cancellation and restart.

Complete craft → approach → cast → catch → cook → eat plus carry/offer alternatives. Include empty/exhausted source, blocked stance/line, missing tool, last-fish competition, cancellation, heat loss, stale inputs/definitions and current-format return. Demonstrate a contrasting preparation through the same consumer. Report actual NPC choice separately from native execution and any Jev costs precisely under current policy.

Update fishing/actions/items/survival and preparation/action-output documentation, AV05, BW06's cooking boundary and AC/INV-6/PO/AE/AG13 subsets in the technical reconciliation map. Preserve broader ecology, invention and behavioral qualification instead of closing entire parents.
```

## Maintained records

- [Feature scope, sizing and readiness](parallel-batch-05-adventure-defense-and-home-feature-spec.md).
- [Technical definitions and reconciliation map](parallel-batch-05-adventure-defense-and-home-tech-design.md).
- [AV01–AV05 status](../maintainers/parallel-batch-05-adventure-defense-and-home.md) and [constraints](../limits/parallel-batch-05-adventure-defense-and-home.md).

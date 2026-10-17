# Combat and threat responses: feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The accepted design is being detailed; runtime implementation and behavioral qualification have not started. | 2026-10-17 |

## Purpose and authority

Make an attack produce a believable, legible encounter in Open Legend's bundled world: an animal finds somewhere safer, Ada deliberately resists an assault, and the player's contextual action remains predictable while the situation changes.

This project follows Mike's October 17 decisions. It extends the implemented physical combat in [batch 06](parallel-batch-06-rivals-and-contested-ground-feature-spec.md) and the implemented [Command-click interaction](player-experience-overhaul-feature-spec.md); it does not replace either project or claim their remaining qualification is complete. The reviewed starting revision is `Macrofold/OpenLegend@0eb7358f251d1ab706592ccb6e9829e98c729fe9`. This branch changes documentation only.

Native code may implement an authored world's animal policy. The engine supplies shared physical execution, perception, evidence, decision scheduling and admission. The bundled world chooses danger categories, escape preferences, speeds, harm rules, personality content and response repertoires. Another coherent world may make different choices without rewriting engine consumers.

## Accepted outcomes

1. Released projectiles apply the selected world's contact-damage law to the body or material they actually contact. An unintended living interceptor is not immune merely because it was not the selected target.
2. Human players may deliberately attack other physically present, vulnerable players in this world. Account/control authority, exact physical-life binding and departure protection remain separate from fictional hostility.
3. Alarmed animals consider all locally perceived potential dangers, choose reachable safer destinations, and remain wary until both distance and continuous safety conditions are met. Ordinary animals make no Decision API calls.
4. Species movement is authored in the world's units, with plausibly faster escape than the current uniformly slow animal motion.
5. In the ordinary, feasible, unprovoked attack scenario, Ada must independently choose and attempt a physical counterattack. Authored personality, present evidence, feelings and the available choices must produce that response. A name-specific retaliation branch or a scripted biography instruction cannot satisfy acceptance.
6. Busy characters receive relevant threats, context and feasible response choices. Existing work is not a reason to hide attacks or defense; the chosen response explicitly retains, replaces or interrupts work through its existing owner.
7. A generalized, source-linked appraisal process replaces the crude damage-to-fear mapping for this response path. No new universal survival maximizer or collection of compulsory needs bars is required.
8. Humanlike characters use a prepared repertoire: a cheap Decision API stage selects situation-relevant options, then a second stage chooses what the character actually does. Native feasibility precedes both; it does not substitute for the first semantic decision.
9. Meaningful changes, including an aggressor withdrawing, leaving effective reach or disappearing, trigger reconsideration. Neither automatic pursuit nor silent permanent pursuit follows from being attacked.
10. Selection and hovering remain harmless. Command-click uses exact, disclosed action intent and per-opponent evidence, including a short recent-hostility grace period, without exposing hidden intentions.

## Playable scope

The intended first loop is approach, provocation or attack, understandable response, an opportunity to retreat or change tactics, and a readable end to the immediate encounter. A harmless berry bush still offers gathering and an ordinary person still offers speaking. Physical defense has value because bodies, terrain, distance and time affect the result.

The project favors distinct authored lives over a universal enemy state. Ada may be practical, protective of her own future and unwilling to submit to casual violence while another character responds differently. Animals have efficient authored options rather than model-generated thoughts. Neither system needs an invisible global hostility score that overrides all other decisions.

### Deliberately deferred

Long-term relationship change, reconciliation, reputation, law and communal punishment remain separate work. This project retains causal evidence for their eventual consumers but does not invent new relationship scores.

Richer animal ecology—offspring, den protection, packs and herds, predation, hunger-driven hunting, taming and learning—and optional animal cognition are recorded as later possibilities. They are not prerequisites for useful fleeing now. General ranged penetration, ricochet, automatic repeated attacks, universal tactical command systems and new combat pausing are also outside this first implementation.

## Journeys and acceptance structure

The completed design will specify the ordinary attack on Ada, punch-and-retreat, interrupted work, multiple human dangers around an animal, blocked escape, an intercepted shot, direct PvP, and exact Command-click behavior. Each journey must identify what was perceived, what the actor chose, what native execution did and what the player can actually observe.

Mechanical correctness, independent model behavior, interface usability and balance require different evidence. Documentation and source inspection establish none of those runtime passes. Detailed implementation order and evidence gates belong to the [technical design](combat-and-threat-responses-tech-design.md) and [implementation tracker](../maintainers/combat-and-threat-responses.md).

## Maintained records

- Implementation: [Combat and threat responses](../maintainers/combat-and-threat-responses.md).
- Limits and constraints: [Base-world inventory](../limits/base-world.md), [ranged and evasion inventory](../limits/parallel-batch-06-rivals-and-contested-ground.md), and [interface tuning](../limits/ui-ux.md).
- Mechanism and delivery: [Technical design](combat-and-threat-responses-tech-design.md).
- Current physical behavior: [Combat](../worlds/base/combat.md), [ranged counterplay](../worlds/base/ranged-counterplay.md), and [player danger](../worlds/base/player-danger.md).

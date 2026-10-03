# Inventable camp containers

**Proposed base-world content, not implemented.** This is the authored gameplay portion of the [next playable week](../../projects/next-playable-week-feature-spec.md). It does not change the current [items and possession contract](items.md) until implemented and verified.

## Purpose and supported effect

A character can invent and craft a woven portable container, choose what to pack, carry the kit together or leave it on the ground for later use. Accessible containers use ordinary inspection and exact transfers. This extends the existing woven-bag mechanism to generated recipes; it does not add a new storage engine.

Packing load is the existing abstract integer measure. The actor still has no finite total carrying-load limit. Containers organize possessions and support voluntary sharing; they provide no extra carrying strength, ownership lock, reservation, food preservation, waterproofing, warmth or structural shelter.

## Proposed first-family rules

These are provisional world balance, not universal engine rules or a physically derived weaving simulation. Implement the accepted version in one base-world definition consumed by schemas, validation, compilation and descriptions. Do not repeat constants in server prompts or UI.

| Choice or derived property   | Proposed rule                                                                                              | Reason                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Pouch material               | A native available material with `fiber`, `flexible` and `pouch` properties; quantity `p` from 2 through 8 | Prepared fibers are an existing qualifying material; raw unprepared fiber alone is not                |
| Binding material             | A native available material with `binding`; quantity `ceil(p / 2)`                                         | Uses actual cord-like material and scales material cost with size                                     |
| Inputs                       | Exactly those two roles, with explicit material definitions and quantities                                 | A small real constructive family; not arbitrary item-component authoring                              |
| Capacity                     | `4 × p` packing-load units                                                                                 | Size choice has an explicit resource cost; includes contents of nested containers under current rules |
| Empty container packing load | `ceil(p / 3)`                                                                                              | Larger empty containers take more packing space inside another bag                                    |
| Work                         | `24 × (p + ceil(p / 2))` game seconds                                                                      | More material takes longer; inferred from the rule, not an independent way to claim extra quality     |
| Output                       | One portable individual container; `fiber` and `pouch` properties; no extra generated effects              | Creates a real native consumer while preserving provenance                                            |
| Nesting                      | Existing admitted containment-depth policy                                                                 | Do not introduce another competing depth model                                                        |

Two sizes are enough to expose the choice: less material/work and less space versus more material/work and more space. Six pouch units yield the current authored bag's 24-unit capacity and two-unit empty packing load. This comparison is a tuning reference, not a hard-coded successful recipe or a promise that this balance is optimal. Verify existing preparation/gathering supply makes both smaller and larger designs reachable without creator-spawned ingredients.

The proposer selects compatible actual materials, size, name and description. The validator derives supported consequences; a requested inconsistent capacity/work value receives an understandable correction or refusal through normal proposal validation and any review required by the existing authority path. Do not silently alter an already approved candidate. A new name, paraphrase or purpose does not change mechanics.

The first family intentionally excludes invented outputs as materials until positive composition contracts can validate them. The shared engine does not enforce the names “Prepared fibers,” “Fiber cord” or “Camp basket”; it executes the selected installed family. Additional material variants can qualify by the authored positive properties when real preparation/content supports them. This does not claim broad material substitution already exists in the starting camp.

## Discovery and information

The free capability view explains that this world supports woven containers, available capacity/work tradeoffs and its limits. An invention prompt needs no exact preset recipe. Before crafting, show the actual chosen ingredients and quantities, work duration, capacity and empty load. Before transferring, show source/destination, exact selected quantity, current space and relevant reach or access failures.

NPCs receive only their own possessions and permitted observed containers. A meaningful action can be described as “Put 3 branches in the woven bag beside the fire; space for 8 more packing units; within reach.” These numbers are illustrative, built from the current scoped view. They are not instructions to prioritize storage. Missing quantities or unknown load must be stated accurately, and hidden contents never become known by offering an action.

Do not add a compulsory starting goal, a background packing routine or a free generated basket to force the demonstration. Optional user requests and voluntary character choices use the ordinary action path. A dropped container remains accessible according to existing ground access; it is not protected property merely because its description says “mine.”

## Validation and future seams

Exercise two size choices, unsuitable material, forged effects, capacity overflow, stale access, nested loads, craft interruption and same-version restart. Check names do not affect mechanics. Generated and supplied proposals must use the same admission and one actual output compiler.

Future preservation needs item age and actual transformation; future fixed storage needs placement/building semantics; future theft protection needs an explicit permission/ownership mechanism; future weight limits need a body/carrying rule and useful player tradeoffs. None is implemented by adding an adjective to this family's description. Expand the finite family through real consumers, not unexplained exceptions.

## Maintained records

- Implementation: [PW03](../../maintainers/next-playable-week.md#pw03--craftable-containers-and-camp-supplies), beneath INV/PO/BW/AC ownership.
- Limits and constraints: [CC01](../../limits/objects.md#cc01--proposed-invented-camp-containers), [RF01](../../limits/inventions.md#rf01--world-owned-recipe-families).
- Related design: [technical design](../../projects/next-playable-week-tech-design.md#pw03--authored-container-and-ordinary-use), [items](items.md).

# RimWorld — intelligence, routine work and simulation supplement

| Field | State |
| --- | --- |
| Coverage | G21 topic supplement; preserves the separate full-game dossier. |
| Reviewed | 2026-10-14 |
| Baseline inspected | [Existing dossier](../rimworld.md), sections 1–6, at OpenLegend `57a2977e22bab3f7293caa4a176c9ef4ba800751`. |
| Current boundary | Stable 1.6 versus newly announced 1.7 unstable/Waylith; not interchangeable evidence. |

[Research ledger](../../research-progress-intelligent-simulation-2026-10-14.md) · [NPC synthesis](../../synthesis/characters-companions-and-relationships.md)

## What the prior dossier contributes

The existing study separates permitted work, capability, priority, concrete job selection and contextual judgment. Its production bills and spatial logistics are useful examples of persistent instructions whose execution intersects changing resources. Needs, social experiences and physical layout produce consequences across systems. Those observations are not proof of a general-purpose deliberating mind; the earlier dossier remains the owner of broader mechanics and reception.

## Direct evidence of authored interruptions and exception handling

Ludeon's 2021 caravan update changes when a packing colonist may sleep or eat, cancels a hauling attempt en route after a timeout, permits supplies to come from pack-animal inventories, and saves the preparation toil tree. These are explicit policy and lifecycle changes, rather than unrestricted understanding of 'prepare sensibly'. The same update automates a recurring medical procedure through an opt-in setting and respects a specific ideological objection to healing. [R1]

The 2024 update separates thoughts for different chemical dependencies, conditions caravan consumption on the pawn's drug policy, avoids storing useless virtual relationship records, and fixes social-seat reservations and allowed-area violations. [R2] These are valuable evidence that memory granularity, resource coordination and permissions are part of apparent intelligence, not just action scoring.

- [R1: Ludeon, Update 1.3.3159, 2021-10-23](https://ludeon.com/blog/2021/10/update-1-3-3159-improves-caravans-biosculpters-archonexus-and-more/), biosculpter/caravan sections inspected.
- [R2: Ludeon, Update 1.5.4104, 2024-05-24](https://ludeon.com/blog/2024/05/update-1-5-4104-released/), changes and fixes inspected.

## Fresh architecture evidence: Waylith

On October 12, 2026 Ludeon announced the 1.7 unstable beta using its Waylith engine instead of Unity. It reports 2–4× gains in internal testing and a 2.2× late-colony example, while stating that stable remains 1.6. The announcement does not disclose enough implementation detail, hardware or benchmark workload to attribute gains to a specific NPC algorithm. It must not be presented as an independent result, a stable release, or a reason OpenLegend should rewrite its engine. [R3]

[R3: Ludeon, *Announcing the Waylith Engine and Update 1.7*, 2026-10-12](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/), full announcement inspected. This supplements rather than silently overwrites the original dossier's September snapshot.

## Source-access correction

The earlier conversation used a community decompilation to discuss think trees and job drivers. A live GitHub read on October 14 returned **repository access blocked, DMCA notice dated October 12** for `Chillu1/RimWorldDecompiled`. No alternate mirror was sought and no decompiled source is included here. Cached search pages are not a verified current code audit. Exact current polling intervals, tree layouts and cancellation implementations therefore remain unverified in this pass.

The official updates independently establish structured work and explicit policy changes; they do not resolve every internal detail. This limitation is specific to that source, not a reason to abandon the comparative research.

## Transfer and counterexample

Our recommendation is to borrow reliable work execution, reservations, clear cancellation and useful outcome evidence. Do not import a universal priority table that decides every person's purposes. A recurring routine can be voluntarily adopted with limits and later revised; a body meter should not silently assign the same goal to everyone.

A hypothetical character packing for a journey may continue a chosen sequence natively, but the discovery that the last available meal belongs to a child is a new meaningful decision. 'Use any available food' would erase the very exception that makes the character interesting. Conversely, choosing another equivalent designated bag is usually an execution detail. The boundary depends on accepted discretion, not on whether a programmer can write an if-statement.

No player study, runtime benchmark or current source-code reconstruction was performed. The new engine's actual bottlenecks and the full modern controller remain evidence gaps, explicitly distinct from completed source review.

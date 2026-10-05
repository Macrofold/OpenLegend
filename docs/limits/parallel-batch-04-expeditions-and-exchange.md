# Batch 04 proposed scope and constraints

This inventory owns only the new **proposed** restrictions introduced by [batch 04](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md). None is a delivered runtime limit. On implementation, move the accepted mechanism-specific entry into its subsystem inventory and leave a link/disposition here; do not maintain two editable copies. Existing [base-world](base-world.md), [objects](objects.md), [narration](narration.md), [spatial](spatial.md), [action](action-experience.md) and [shelter](editable-shelters.md) limits retain their ownership and rationale.

## PX-L01 — One exact lot on each side of an immediate barter

**Proposed; restrictive first family.** Each side names one exact lot/individual plus a valid quantity; gifts retain an empty requested side. This makes consent and atomicity understandable without a shopping cart, price system or deferred delivery. Containers retain existing whole-container rules, including contents identity and access restrictions; the feature does not gain free access to contents.

Expansion trigger: a worthwhile exchange cannot be expressed without several lots per side and splitting it would expose participants to partial delivery. Generalize the same offer and atomic object owner then; do not implement a sequence of independent gifts. Existing offer lifetime/count limits remain under BW11 and require assessing both gift and barter admission together. This proposal is not evidence that inventory/trade queries scale: request-scoped participant/offer lookup and bounded permitted candidate discovery must avoid scanning all actors or all historical transactions.

## PX-L02 — Static named places; learned information only

**Proposed first exposure family.** Named places attach to current static physical references/footprints. Moving interiors and procedural region generation are outside this slice. This earns useful discovery without a second world/map engine. Expand when a selected journey requires a moving or changing place, preserving identity and evidence semantics.

No new cap on a character's total remembered places or memories is proposed. A UI page bounds returned rows, not upstream discovery, filtering or stored knowledge. The implementation must use the current scoped/paged history and spatial candidate owners and record measured query bounds in their inventories. An unbounded all-history read remains a gap even if only ten labels are displayed. Narration frequency/length comes from existing story selection; no new automatic repeated-generation loop.

## PX-L03 — Two-person outing to one agreed destination

**Proposed; intentionally narrow social activity.** A trip joins two consenting participants and has one fixed destination. Changing terms requires a new invitation. A participant has at most one accepted outing at a time through current activity admission; a changed active plan cannot remain enrolled in a hidden parallel trip. Pending invitation expiry reuses the world's existing social-offer lifetime, not a new wall-clock timer.

This avoids party command, formation/navigation and multi-party-consent semantics before a pair is worth accompanying. Expand to more participants or itineraries only for a demonstrated shared activity; keep individual consent and movement ownership. Known navigation limits/deadlines apply. No infinite waiting, mandatory follow behavior or world-wide position polling is licensed. Due invitations/active participation need indexes/dependencies appropriate to their reachable growth; closed trips are ordinary experience records, not a growing secondary polling table.

## PX-L04 — Threat and construction boundaries retain their design owners

**No tuning values invented by this allocation.** PG05 owns the creature/encounter and recovery proposals; current body/attack/navigation limits remain controlling until approved changes. PX05 refines the existing shelter inventory. A batch number or acceptance scenario creates no health, pursuit, loss, part-count or simulation-capacity limit. Conditional readiness is not runtime permission.

## Review and history

Introduced October 3, 2026 as proposed scope, not an accepted restriction on the whole engine. [PX tasks](../maintainers/parallel-batch-04-expeditions-and-exchange.md) own delivery. Each implementation reassesses expansion pressure and relevant [limits-audit](../maintainers/limits-audit.md) items without inventing a task for every ordinary default. No restrictions were removed and no scale measurements were made in this planning pass.

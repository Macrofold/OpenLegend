# Batch 04 proposed scope and constraints

This inventory owns only the new **proposed** restrictions introduced by [batch 04](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md). PX-L02 and PX-L03 are delivered and point to their canonical subsystem owners below; the other entries remain proposed. On implementation, move the accepted mechanism-specific entry into its subsystem inventory and leave a link/disposition here; do not maintain two editable copies. Existing [base-world](base-world.md), [objects](objects.md), [narration](narration.md), [spatial](spatial.md), [action](action-experience.md) and [shelter](editable-shelters.md) limits retain their ownership and rationale.

## PX-L01 — One exact lot on each side of an immediate barter

**Proposed; restrictive first family.** Each side names one exact lot/individual plus a valid quantity; gifts retain an empty requested side. This makes consent and atomicity understandable without a shopping cart, price system or deferred delivery. Containers retain existing whole-container rules, including contents identity and access restrictions; the feature does not gain free access to contents.

Expansion trigger: a worthwhile exchange cannot be expressed without several lots per side and splitting it would expose participants to partial delivery. Generalize the same offer and atomic object owner then; do not implement a sequence of independent gifts. Existing offer lifetime/count limits remain under BW11 and require assessing both gift and barter admission together. This proposal is not evidence that inventory/trade queries scale: request-scoped participant/offer lookup and bounded permitted candidate discovery must avoid scanning all actors or all historical transactions.

## PX-L02 — Static named places; learned information only

**Adopted by PX03, October 5, 2026.** [SP08 — Static named places and private Known places](spatial.md#sp08--static-named-places-and-private-known-places) now owns the delivered static family, no total-memory/place cap, query bounds, rationale and expansion trigger. [Narration](narration.md) owns presentation admission and fallback; [cognition](cognition.md#cg15--learned-places-from-retained-experience) retains the evidence/forgetting boundary. The proposal is retained here as its disposition, not a second editable limit.

## PX-L03 — Two-person outing to one agreed destination

**Moved to current owner, October 6, 2026:** [BW14 — Paired outings](base-world.md#bw14--paired-outings) now owns the accepted pair/destination restriction, rationale, expansion trigger and invitation bounds. [AEL10](action-experience.md#ael10--outing-consent-and-own-movement) owns movement/storage limits; [CG16](cognition.md#cg16--outing-choices-and-reconsideration) owns decision/privacy limits. PX04 implements this scope without depending on PX03's learned-place list. This disposition preserves the proposal's narrow social meaning without a second editable copy.

## PX-L04 — Threat and construction boundaries retain their design owners

**No tuning values invented by this allocation.** PG05 owns the implemented creature/encounter and recovery rules; PX01 integration preserves their [FT01–FT07 limits](base-world.md#ft01--proposed-first-threat-scope-and-reward). Its direct-walking correction preserves [spatial bounds](spatial.md#sp02). PX05 refines the existing shelter inventory. A batch number or acceptance scenario creates no health, pursuit, loss, part-count or simulation-capacity limit. Conditional readiness is not runtime permission.

## Review and history

Introduced October 3, 2026 as proposed scope, not an accepted restriction on the whole engine. [PX tasks](../maintainers/parallel-batch-04-expeditions-and-exchange.md) own delivery. Each implementation reassesses expansion pressure and relevant [limits-audit](../maintainers/limits-audit.md) items without inventing a task for every ordinary default. No restrictions were removed and no scale measurements were made in this planning pass.

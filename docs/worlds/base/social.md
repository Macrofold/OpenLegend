# Relationships, feelings and promises

This page owns the bundled world's current social rules and their visible limits. It does not prescribe universal kinship, emotion or obligation laws for the engine. General ownership and privacy remain in [Architecture](../../architecture.md#actor-means-any-living-being), [knowledge](../../knowledge.md) and the [boundary principles](../../engine-and-world-boundaries.md#design-principles-for-every-feature).

## Understanding another person

An actor's directional relationship description is its subject knowledge document. **My thoughts and relationships** displays that understanding and edits the same text through Knowledge notepads. One person's revision does not revise the other's view, establish kinship, cancel an obligation or grant possession access. Known/remembered subjects do not automatically become currently visible or targetable. Human-private content stays private even from an in-game creator.

For example, Ada can write that she distrusts Bo while Bo still considers Ada a friend. These are independent interpretations, not friendship scores. The [appraisal/social project](../../projects/appraisal-social-continuity-feature-spec.md) defines the delivered continuity scope; it does not promise that arbitrary prose changes physical behavior.

## Objective family facts

The current native [kinship owner](../../../packages/domain/src/social.ts) supports creator-authored parent and sibling facts. Parent links are directed; sibling duplicate detection is symmetric. Self-links, invalid actors, parent cycles and conflicting reuse of a fact ID reject. Facts are immutable through this operation; no correction/deletion operation is provided.

`POST /api/god/kinship` exists, but there is no client family authoring/viewing panel. Writing “sister” in a knowledge note creates no objective fact. Reproduction, adoption, inheritance, automatic bereavement and a general household simulation are not implied by stored kinship.

The fixed relation vocabulary currently lives in the general domain module. Treat that as a localized v1 specialization: the engine protects identity, references, transaction integrity and disclosure; a world chooses relation meanings and allowed topology. [BW16](../../maintainers/base-world.md#bw16--family-authoring-and-inspection) tracks the first UI slice and its boundary review. A different world's chosen-family relation would need different rules, not an exception to a supposedly universal blood-family law.

## Feelings

[Bundled appraisal definitions](../../../packages/domain/src/worlds/base/appraisals.ts) supply fear/discomfort, persistent grief, condition-sustained restlessness and recurring calm examples. Only the compatibility damage reactions run by default: positive shot/strike damage maps to fear; supported negative body-health effects map to discomfort. Numeric pacing belongs to the [world defaults inventory](../../limits/base-world.md#bw02) and [decay entry](../../limits/feelings.md#la081).

Installed definitions are not automatic actor enrollment. Kinship and personality prose do not cause grief or enroll restlessness/calm processes by themselves. A valid admitted cause/process is required. Feelings can persist, expire, decay or follow a supported enduring condition through the native owner; they do not force a human's choices.

The mind panel displays permitted current feelings. God authoring exposes qualitative NPC creation/resolution; numeric authoring, reframing and process configuration lack a general editor. [FL13–FL16](../../limits/feelings.md#fl13) distinguish native lifecycle limits from missing UI. [ACT09](../../maintainers/actor-model.md#act09--internal-feeling-process-authoring) records a conditional future authoring slice, without enabling any new default emotions.

## Spoken promises

The [current native parser](../../../packages/domain/src/commitments.ts) recognizes committed, self-attributed speech beginning with `I promise to` followed by content, case-insensitively. It records an obligation as protected memory. The exact gather form can bind completion when the remaining item name resolves uniquely; a later matching gather by that actor fulfills it. Other recognized promises have no automatically inferred completion predicate. Ordinary paraphrases are not a general promise-understanding feature.

For example, “I promise to gather berries” can bind the installed berries definition. It does not imply delivering a meal, transferring ownership, rewarding the speaker or creating a reciprocal agreement. The current admission ceiling and matching restrictions are in [BW04](../../limits/base-world.md#bw04).

`POST /api/commitment` can amend the current actor's existing obligation using its expected revision, including cancellation, a future/current deadline or a supported completion binding. Invalid/stale requests reject. Permitted God mind diagnostics publish commitment summaries, but the ordinary owner mind projection does not include commitments and there is no dedicated player management panel. Native fulfillment/overdue/cancellation state is distinct from an actor merely claiming success.

The English parser and gathering interpretation currently live beside reusable obligation state in the general domain module. Their semantic home is this bundled-world contract. [BW17](../../maintainers/base-world.md#bw17--readable-promises-and-commitment-management) calls for extracting policy when that slice needs it, reusing the existing mutation owner rather than adding another promise store. A world with ritual vows or negotiated contracts can differ without changing engine evidence and revision integrity.

## Delivery and evidence

Current surfaces are summarized in [gameplay availability](../../../archive/05-project/implementation-status.md#gameplay-availability). Family UI, promise management and process authoring are future tasks, not delivered by this documentation pass. Existing [runtime evidence](../../verification.md) remains scoped to the journeys actually recorded; no new live cognition, UI or persistence qualification is claimed here.

## Maintained records

- Implementation: [BW16/BW17](../../maintainers/base-world.md#social-playable-slices), [ACT07/ACT08 and ACT09](../../maintainers/actor-model.md).
- Limits and constraints: [base-world defaults](../../limits/base-world.md), [feelings](../../limits/feelings.md), [memory](../../limits/memory.md).
- Related contract/design: [appraisal/social continuity](../../projects/appraisal-social-continuity-feature-spec.md), [technical design](../../projects/appraisal-social-continuity-tech-design.md), [knowledge](knowledge.md).

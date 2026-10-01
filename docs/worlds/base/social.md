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

`POST /api/commitment` can amend the current actor's existing obligation using its expected revision, including cancellation, a future/current deadline or a supported completion binding. Invalid/stale requests reject. Permitted God mind diagnostics publish commitment summaries. The player's Journal has a read-only **Promises** list of their own obligations: exact words, recipient as they know them, status, a plain statement of what this world checks automatically (only the gathering form) and fulfillment evidence. It offers no amendment or cancellation; that waits for [D64](../../../archive/05-project/open-decisions.md#social-exposure-decisions). Native fulfillment/overdue/cancellation state is distinct from an actor merely claiming success.

The English parser and gathering interpretation currently live beside reusable obligation state in the general domain module. Their semantic home is this bundled-world contract. [BW17](../../maintainers/base-world.md#bw17--readable-promises-and-commitment-management) calls for extracting policy when that slice needs it, reusing the existing mutation owner rather than adding another promise store. A world with ritual vows or negotiated contracts can differ without changing engine evidence and revision integrity.

## Offering and accepting possessions

Handing carried items to another person is a consent exchange, owned by `packages/domain/src/handover.ts` with world values in `worlds/base/handover.ts`:

- **Offering** holds out a quantity of one carried portable lot to a person the offerer can see within arm's reach (the saved item-handling reach). It moves nothing and reserves nothing.
- **Accepting** can be done only by the named recipient, through their own command. The items move atomically into the recipient's own inventory through the ordinary custody owner. The offer must not have expired; both people must be alive, active and able to see each other within reach; and the offerer must still carry that lot, with enough free units and unchanged bag contents.
- **Declining**, by the recipient, or **withdrawing**, by the offerer, moves nothing.
- **Expiry:** an unanswered offer expires after **30 game minutes** (30 wall seconds at 1×).
- **Lapse:** an offer lapses at the next simulation moment if its items leave the offerer, change, or are needed by work, or if either person dies, becomes incapacitated or leaves.

Nobody else can accept, decline or withdraw an offer, and an offer never transfers anything on its own. A person may hold out at most three offers at once, and a lot can be in only one offer. Bags are offered whole, and offer text never lists their contents. A bag carrying an access grant must have it cleared first. Partial quantities of individual objects are refused.

For example, Mike holds out two Wild berries to Ada. If she accepts, the berries become hers. If she declines, ignores the offer or Mike withdraws it, nothing moves. If Mike eats them first, her acceptance is refused with “The offered items are no longer available.” Refusal messages never name the other person or explain their private circumstances. The offer and its outcome are ordinary visible events. Only the offer itself is notable enough to invite an NPC recipient to decide.

A character decides through its ordinary choices:

- **Characters:** they are offered accept and decline replies for offers made to them, even while busy. A reply never interrupts their work.
- **Players** use the other person's menu or quick actions, typed text, or **Offer to** in the inventory.

Characters may also offer carried items to people within reach; food is listed first, and the list is bounded. Replies are immediate social choices: they are deliberately not persistent plan steps or learned methods, so consent cannot be queued late or replayed. Direct deposit into another person's carried inventory is refused ([items](items.md#shared-containers-and-active-work)). Feeding someone, trading, reserving portions for a named person, and contested ownership are not implemented. Reserving portions waits for a claim owner that can hold stock without a live process (tracker BW21). Values and rationale: [BW11](../../limits/base-world.md#bw11).

## Delivery and evidence

Current surfaces are summarized in [gameplay availability](../../../archive/05-project/implementation-status.md#gameplay-availability). Family UI, promise management and process authoring are future tasks, not delivered by this documentation pass. Existing [runtime evidence](../../verification.md) remains scoped to the journeys actually recorded; no new live cognition, UI or persistence qualification is claimed here.

## Maintained records

- Implementation: [BW16/BW17](../../maintainers/base-world.md#social-playable-slices), [BW20/BW21](../../maintainers/base-world.md#camp-fire-care-and-sharing), [ACT07/ACT08 and ACT09](../../maintainers/actor-model.md).
- Limits and constraints: [base-world defaults](../../limits/base-world.md), [feelings](../../limits/feelings.md), [memory](../../limits/memory.md).
- Related contract/design: [appraisal/social continuity](../../projects/appraisal-social-continuity-feature-spec.md), [technical design](../../projects/appraisal-social-continuity-tech-design.md), [knowledge](knowledge.md).

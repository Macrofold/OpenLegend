# Product designs for groups 26–30

| Status      | Current progress                                                                                                           | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG26 and DG27 are complete as product proposals; DG28 is being drafted from researched publication and commerce contracts. | 2026-10-08   |

## Assignment and baseline

Produce comprehensive researched product and behavior specifications for the next five groups in [Needs design](../maintainers/needs-design.md), in order: DG26 voice, calls and selected hearing extensions; DG27 customer and supporter offers; DG28 published packs and creator revenue; DG29 more participants and travel between worlds; and DG30 a creator fund and contributor governance. Complete a final critique of playability, complexity, economics and sequencing, reconcile affected owners, and commit all task changes.

The owner explicitly requests product behavior rather than detailed architecture. This assignment therefore follows the previous five-group assignments in producing feature specifications, useful staged capabilities and maintained delivery/limits records without technical-design files or runtime changes. Later technical work remains explicit; a product proposal does not qualify its implementation.

The task branch is `codex/product-design-groups-26-30-20261008`, created through the GitHub connector from the requested `codex/product-design-groups-21-25-20261006` at [671d52d724db5dfe39403ebe46f7c1ee24d6ec52](https://github.com/Macrofold/OpenLegend/commit/671d52d724db5dfe39403ebe46f7c1ee24d6ec52). Sources are read at that exact baseline. Local editing uses `/workspace/scratch/7bd3f464241b/OpenLegend`, a selective working mirror, without switching an existing Git checkout or changing main. All Git operations use the connector; branch updates preserve other paths and use an expected-head check.

The [preceding assignment](completed/product-design-groups-21-25.md) supplies contacts and private text, correction/restoration meanings and the established distinction between design completion, adoption, technical work, implementation and qualification. Its accepted and proposed meanings are reused according to their recorded status. The branch is not represented as current main.

## Product rules and scope

This task affects **zero runtime logic lines**. Its main risks are product and contract coordination: audio disclosing words a listener cannot know; fictional time becoming dependent on playback; confusing access, invention allowance and real cost; promising unfunded service or permanence; paying twice or reallocating money without a defined basis; exporting private world history with reusable content; and making travel or creator administration more work than the experience is worth.

Read the root instructions and applicable design, documentation, prioritization, review, UI, verification and engine/world guidance. Consult each group's maintained contracts, focused trackers, limits, prior product decisions and linked research before drafting. Every new specification must include purpose, complete human/character/creator journeys, meaningful failure and recovery, supported scope, later optional families, economics and growth, primary-source research, acceptance criteria, staged delivery and maintained records.

Start from a wanted game moment or service outcome. Preserve useful invention, independent people, ordinary competence, player choice and consequences. Supporting mechanics must earn their explanation, operating cost and player effort. No group number establishes implementation priority; a small invited game may remain preferable to media, a public marketplace, large populations or a grant program.

Keep reusable runtime integrity separate from authored-world communication, travel and content rules. World-specific choices belong to their world owner. Protect permitted knowledge, current permissions, real accounting and truthful interrupted/uncertain results across retries, disconnection, revocation and current-format save/restore. Reuse existing owners rather than inventing parallel billing, privacy, cognition or task systems.

Research findings, design inferences, proposed defaults, owner-approved policies, implemented behavior and measured evidence remain distinct. Illustrative economics are assumptions for comparison, not current provider prices or commitments. No outreach, purchase, subscription, payout, public launch or binding governance change is authorized by this design assignment. Routine proposal choices are made within the task; genuinely necessary unanswered owner decisions must be resolved before dependent work.

## Sequential work and ownership

| Group | Product question                                                                                                                | Existing responsibilities to reuse                                                                          | Progress                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| DG26  | How does speaking or hearing improve an actual exchange while every person receives only their permitted meaning?               | HE/NC/MP, DG24 contacts, spatial and world hearing, PS04 timing, existing spending and privacy.             | Product proposal complete; technical/runtime work remains open.            |
| DG27  | What clear, sustainable offer can someone buy, use, renew, cancel or support without surprise charges or fictional promises?    | PD10, billing/entitlements, INV-13, D17/D35/D37 and PS-D06.                                                 | Product proposal complete; actual offer adoption and delivery remain open. |
| DG28  | How does a creator publish something reusable, retain appropriate rights and receive an understandable share of actual revenue? | DG12 publication/provenance, INV-8/EWF11, DG27 commerce, PD10 and D35/D36/D43/D44.                          | Source audit and research complete; detailed product proposal in progress. |
| DG29  | How can a person join or visit a wanted place and return safely as demand and world histories grow?                             | PS05–PS08, MP access/participation, transfer/data, time, performance and applicable DG12/DG25 boundaries.   | Pending DG28.                                                              |
| DG30  | What small, funded creator program produces worthwhile work and gives contributors a clear, bounded voice?                      | D37, existing financial/rights and platform-authority owners; separate from ordinary subscriber allocation. | Pending DG29.                                                              |

Within the active group, independent readers may research sources and critique consistency in parallel. The five designs themselves are developed and committed sequentially. Commit pending task changes at least every five minutes, as requested by the owner, with accurate checkpoint labels.

## Completed group 26

[Voice and calls](voice-and-calls-feature-spec.md) records ten primary sources and independently useful playback/dictation, private slate calls and a later doorway consumer. The review corrected recipient-invalidation timing, active revocation, conversation switching, shared text allowance visibility and expired-invitation reading. Current instantaneous hearing, partial/unknown evidence, text play and underlying world pace remain intact. HE07/NC23 and VO/CA inventories retain technical/runtime and measured acceptance.

## Completed group 27

[Customer and supporter offers](customer-and-supporter-offers-feature-spec.md) records ten primary sources, a small hosted-world offer, concrete account-period/revision rules, full payment/exhaustion/cancellation/retrieval journeys and one separately optional external dedication. Review corrected fresh authority for late admission, the first-service refund across a calendar renewal, equal one-term eligibility, meaningful finite public recognition and the difference between retail debit authority and supplier cost. It also requires the advertised live invention/resident experience and identifies DG03 as preparation, not demonstrated evidence. CO01–CO06 and CO-L01–CO-L08 retain actual commercial adoption, technical/payment/recovery work and the ten-renewal experiment; no price, sale or customer evidence is claimed.

## Completion criteria and verification plan

- Five complete feature specifications answer the actual group and its related ND/PS scope, with independently useful first deliveries and explicitly scoped later families.
- Primary-source research is cited with URLs, supported findings, access limitations where relevant, and clearly distinguished Open Legend inferences.
- Related trackers retain stable identifiers and unsatisfied technical/runtime/evidence criteria; proposed limits have an owning inventory and a reason, boundary behavior and revisit trigger.
- The final critique examines the whole game, each activity's payoff, complexity, dependency order, operating burden and alternatives; actionable in-scope findings are fixed.
- Inspect the full affected diff, preserved existing meaning and checkbox states, relative links and headings, status consistency and changed-file formatting. No game or paid-provider check is needed for this documentation-only scope.
- Verify committed branch contents against the final local files, preserve unrelated repository paths, and report the exact branch, delivered scope and actual verification limits.

## Maintained records

- Design queue: [Needs design](../maintainers/needs-design.md).
- Navigation and delivery owners: [Maintainer index](../maintainers/README.md).
- Constraints: [Limits inventory system](../limits/README.md); each group links its applicable inventory.
- Prior completed assignment: [Groups 21–25](completed/product-design-groups-21-25.md).
- Governing structure: [Feature documentation](../feature-documentation.md) and [engine/world boundaries](../engine-and-world-boundaries.md).

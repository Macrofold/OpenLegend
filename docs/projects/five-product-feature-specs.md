# Five product and behavior specifications

**Status: in progress; product-design proposals requested by Mike on October 3, 2026. No runtime implementation is authorized by this document.**

## Purpose and scope

Develop five comprehensive, researched feature specifications in the agreed order: continuing NPC lives; attention, crowds and scenes; creating a world from a premise; editable shelters and rain; world-authored stats and checks. Each specification explains intended behavior, reasons, player and NPC journeys, meaningful failure, incentives, economic sustainability, performance implications, proposed stages and behavioral acceptance.

Mike explicitly requested product and behavior design before technical design. Consequently this package deliberately does not create technical-design counterparts, classes, storage schemas or implementation assignments. The existing architecture and subsystem contracts remain the constraints and later technical-design owners. Proposed product decisions are distinguishable from accepted direction and current implementation.

## Source baseline and working approach

- Repository: `Macrofold/OpenLegend`.
- Source: `docs/design-needs-register` at `1627d51c79840ce8b5de24627bd2f552e42e97e9`, refreshed through the GitHub connector.
- Working branch: `docs/five-product-feature-specs`.
- Production logic affected: zero lines. Main risk is contradictory or overconfident product promises, particularly around autonomy, privacy, absence, resources and cost.
- Complete each feature in sequence. Research and independent critique of the current feature may proceed in parallel; later features do not start before it is completed.
- Commit useful sections as work proceeds, with a checkpoint whenever changes have been uncommitted for five minutes.
- Use primary game/developer documentation and research papers where available. Separate observed behavior, developer proposals, experimental evidence, limitations and our design inferences. Record access dates and source-specific lessons in each feature specification.
- Preserve existing documents and task identifiers. Extend existing work owners; do not reset delivered work or mark runtime tasks complete because their product design improved.

## Specifications and progress

| Order | Product specification | Existing work owner | Status |
| --- | --- | --- | --- |
| 1 | [Continuing NPC lives](continuing-lives-feature-spec.md) | PS02–PS03, with explicit PS04–PS06 dependencies | Product proposal and focused review complete; technical design and runtime work remain open |
| 2 | [Attention, crowds and scenes](attention-and-scenes-feature-spec.md) | PS04 / PS-D02 | Product proposal and focused review complete; technical design and runtime work remain open |
| 3 | [Creating a world from a premise](world-creation-feature-spec.md) | ND01, INV-4.10, EWF12 | Product proposal and focused review complete; technical design and runtime work remain open |
| 4 | [Editable shelters and rain](editable-shelters-feature-spec.md) | ND07 / focused ND08, INV-6.4 | Product proposal and focused review complete; technical design and runtime work remain open |
| 5 | [World-authored stats and checks](authored-stats-feature-spec.md) | ND03, EWF02/EWF04 and action/state owners | Next |

## Completion criteria

Every specification must include concrete proposed behavior and its rationale; a supported first scope and expansion path; ordinary, contested, failure, absence, privacy and recovery scenarios; world-authoring boundaries; sources with traceable claims and limitations; cost growth and overload behavior; acceptance criteria; remaining owner decisions; and links to its implementation owner and limits inventory. No source's success in another game or short experiment establishes Open Legend's quality or capacity.

Finish with a cross-feature review of clocks, attention, permitted knowledge, resource use, human control, continued funding, material identity and randomness. Check the full documentation diff, references and anchors, proposal/current-status accuracy and formatting. Documentation-only verification does not run the game or claim capacity. Required CI remains a later merge gate.

## Maintained records

- Implementation and design routing: [maintainer index](../maintainers/README.md) and [design-needs register](../maintainers/needs-design.md).
- Existing scalability work and constraints: [PS tracker](../maintainers/product-scalability.md) and [product-scalability limits](../limits/product-scalability.md).
- Individual specifications link the focused owners and inventories for their remaining features.
- Technical design: intentionally deferred by Mike's request; existing relevant technical contracts are linked from each specification.

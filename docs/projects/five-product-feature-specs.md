# Five product and behavior specifications

**Status: all five researched product proposals, focused reviews and package checks complete, October 3, 2026. Product adoption, technical design and runtime implementation remain open.**

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

| Order | Product specification                                                | Existing work owner                             | Status                                                                                      |
| ----- | -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1     | [Continuing NPC lives](continuing-lives-feature-spec.md)             | PS02–PS03, with explicit PS04–PS06 dependencies | Product proposal and focused review complete; technical design and runtime work remain open |
| 2     | [Attention, crowds and scenes](attention-and-scenes-feature-spec.md) | PS04 / PS-D02                                   | Product proposal and focused review complete; technical design and runtime work remain open |
| 3     | [Creating a world from a premise](world-creation-feature-spec.md)    | ND01, INV-4.10, EWF12                           | Product proposal and focused review complete; technical design and runtime work remain open |
| 4     | [Editable shelters and rain](editable-shelters-feature-spec.md)      | ND07 / focused ND08, INV-6.4                    | Product proposal and focused review complete; technical design and runtime work remain open |
| 5     | [World-authored stats and checks](authored-stats-feature-spec.md)    | ND03, EWF02/EWF04 and action/state owners       | Product proposal and focused review complete; technical design and runtime work remain open |

## Completion criteria

Every specification must include concrete proposed behavior and its rationale; a supported first scope and expansion path; ordinary, contested, failure, absence, privacy and recovery scenarios; world-authoring boundaries; sources with traceable claims and limitations; cost growth and overload behavior; acceptance criteria; remaining owner decisions; and links to its implementation owner and limits inventory. No source's success in another game or short experiment establishes Open Legend's quality or capacity.

Finish with a cross-feature review of clocks, attention, permitted knowledge, resource use, human control, continued funding, material identity and randomness. Check the full documentation diff, references and anchors, proposal/current-status accuracy and formatting. Documentation-only verification does not run the game or claim capacity. Required CI remains a later merge gate.

## How the five designs fit together

The agreed priority order is also the documentation sequence; it is not a requirement to finish every stage of one feature before delivering another. Continuing lives and attention establish how a real population can remain coherent without constant expensive reasoning. World creation should expose only the supported capabilities of its actual release. The proposed shelter check deliberately reuses the later physical shelter family, while unrelated typed stats and other supported world openings can exist earlier.

| Shared concern       | Product decision across the package                                                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| World time           | Work and consequences follow admitted world time. Arrival, caption reading, reconnect and a new explanation do not create elapsed work or reverse it. Required-service failure has a disclosed coherent boundary.                                                          |
| People and knowledge | The same people continue across detail levels. Detection, attention, recollection and private decision remain distinct; scene or world-generation prose does not create testimony, consent or hidden knowledge.                                                            |
| Resources and work   | Actual materials, custody and partial effort persist through continuation, construction and checks. A favorable result cannot duplicate inputs, and a revision cannot spend an unaccepted new cost.                                                                        |
| Operating economics  | Continue qualified selected behavior cheaply; reserve new reasoning for real decisions. Bound work examined as well as output shown. Storage, actual mechanics and optional intelligence are distinct obligations, without purchased luck or disguised technical failures. |
| Creator promise      | A premise becomes a reviewed supported opening. Unsupported ambition remains an explicit design/invention need; attractive prose does not stand in for world laws, population, hosting or playable consequences.                                                           |
| Expansion            | Qualify one complete useful loop, then add families or scope using actual evidence. Reference populations, curves and geometry are proposed world choices; no research citation proves million-player capacity.                                                            |

The main remaining product choices are adoption of the recommended starting scopes and qualification of their tuning. Each feature identifies those choices locally. The specs provide concrete starting recommendations and expected behavior; implementation owners should preserve those commitments or explicitly revise the product decision rather than resolve ambiguity invisibly in code.

## Completed documentation review

The five feature files contain approximately 39,400 words, 72 named player/NPC journeys and 80 research-register entries. Some sources are relevant to more than one feature, so the register-entry count is not a claim of 80 unique publications. Each register distinguishes source findings, historical/version limits and the proposed Open Legend consequence.

Each feature received focused review, followed by a complete cross-feature consistency review. Corrections made during that work include bounded funded work rather than indefinite compute promises; current speech versus future timed phrases; supported creator/host entry; a real drying and tinder recovery loop; and retained check-attempt conditions through cancellation. The final cross-feature pass found no further required product correction.

The complete affected documentation diff was reviewed against the pinned source. All existing implementation checkbox states are preserved, and prior substantive source content remains apart from the intentionally expanded limits-index summary. Added pointers do not change current implementation claims. All 161 new or changed internal link targets/anchors resolve. Changed Markdown passes the repository's pinned Prettier 3.6.2 configuration. Check helpers and raw research notes are outside the repository changes.

The finite check distributions, retry examples and expected completion times were calculated and independently reviewed; illustrative service arithmetic is labeled as hypothetical. No game, browser, live-provider, balance or capacity test was run for this documentation task. No production logic, configuration or agent instructions changed. Required implementation/CI qualification remains with the existing owners before any later release.

## Maintained records

- Implementation and design routing: [maintainer index](../maintainers/README.md) and [design-needs register](../maintainers/needs-design.md).
- Existing scalability work and constraints: [PS tracker](../maintainers/product-scalability.md) and [product-scalability limits](../limits/product-scalability.md).
- Individual specifications link the focused owners and inventories for their remaining features.
- Technical design: intentionally deferred by Mike's request; existing relevant technical contracts are linked from each specification.

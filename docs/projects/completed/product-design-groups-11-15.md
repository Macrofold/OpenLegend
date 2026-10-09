# Product designs for groups 11–15

| Status    | Current progress                                                                                                                          | Last updated |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | All five researched product designs, review fixes and documentation checks are complete; feature delivery remains with the linked owners. | 2026-10-06   |

## Scope and working baseline

This assignment continues the design queue in [Needs design](../../maintainers/needs-design.md), one group at a time. It develops detailed product behavior, scenarios, economics, failure handling and playable delivery stages. The requested scope deliberately stops before technical designs and implementation.

The branch is codex/product-design-groups-11-15-20261005, based on Macrofold/OpenLegend main at d36ec3bd66f9b317748147003cc174f58cfd5642. Earlier groups have separate, unmerged proposal branches; their designs are useful context, not delivered capabilities on this baseline.

The [gameplay priorities](../../repertoires/gameplay-priorities.md), [engine/world boundary](../../engine-and-world-boundaries.md), [feature documentation rules](../../feature-documentation.md) and current root instructions govern every proposal. A feature must lead to a worthwhile experience, reveal its actual consequences, and preserve authority, private information and real spending. The study and story perspective are optional product choices, not prerequisites for a playable adventure.

## Five deliverables

| Queue group                                         | Product behavior owner                                                     | Design state                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| DG11 — Evidence for a selected well-being objective | [Optional connection study](../wellbeing-evidence-feature-spec.md)         | Product proposal and critical review prepared; operation remains open                                              |
| DG12 — Create a world and reuse an invention        | [Existing world creation specification](../world-creation-feature-spec.md) | Creation and complete reuse journey researched and reviewed; technical/runtime work remains open                   |
| DG13 — Editable shelter and useful places           | [Existing shelter specification](../editable-shelters-feature-spec.md)     | Concrete canopy/use/reclaim proposal researched and reviewed; technical/runtime work remains open                  |
| DG14 — Useful competence and practice               | [Existing authored stats specification](../authored-stats-feature-spec.md) | Useful sling competence, finite practice and coaching researched and reviewed; technical/runtime work remains open |
| DG15 — An optional story perspective                | [After you left specification](../story-perspectives-feature-spec.md)      | Private historical perspective researched and reviewed; NC20 technical/runtime work remains open                   |

The three existing feature specifications remain their behavior owners. This overview does not create competing versions or replace their unresolved implementation work. Each design records primary-source research, what the evidence actually supports, what remains an inference, concrete player journeys, graceful failure, finite work and retention choices, and criteria for deciding whether the feature deserves expansion.

**Subsequent disposition, October 6:** [the shelter technical counterpart](../editable-shelters-tech-design.md) completes PX05's narrow open-shelter design, and AV04 delivers its flat canopy/two-bay construction, use, finite rain/drying and reclaim. [SH01–SH06](../../maintainers/editable-shelters.md) retains the slope and wider qualification. The table above records this product assignment’s completion boundary; it is not a current claim that PX05 remains missing. Broader construction/weather and home psychology remain open.

## Delivery and review

Finish each group’s product proposal and a critical review before starting the next. Commit unfinished checkpoints honestly whenever task edits approach five minutes without a commit. Reconcile the relevant trackers, limits, queue and navigation in the same task. Preserve historical evidence and completed task entries.

The final review asks whether the game is fun without the proposed system, whether the first stage adds enough value to justify its cost, whether the proposed rewards encourage interesting play or repetitive chores, and whether a smaller complete experience would be better. Delivery order follows real dependencies and player value; numerical queue order is the writing order, not a requirement that every preceding feature ship first.

Verification is documentation review: affected differences, maintained source ownership, internal references, citation accuracy, status and limits consistency, and the repository’s Markdown formatter. No game, load, provider or participant experiment is claimed from writing these documents.

## Final critique and retained decisions

The design assignment is complete. The five feature projects remain active because their technical, runtime, operational or empirical work is separate and unfinished. Completing these product documents is not evidence that a study ran, a game mechanic shipped or an optional disclosure mode is enabled.

The decisive shared correction is priority ownership. The inherited one-resident live-invention proof remains an acceptance requirement. The current [playable-game priorities](../../repertoires/gameplay-priorities.md) govern the complete survival adventure and the next work to choose: an understandable goal, worthwhile opposition, a useful reward or improvement, and another interesting challenge. A successful camp routine, import or probability calculation cannot stand in for that whole experience. The creation, shelter, stats and earlier five-spec overview now state this distinction consistently.

| Group | Smallest complete product experience                                                                                                                                                     | What the critique removed or tightened                                                                                                                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DG11  | An optional known-friend feasibility comparison with a worthwhile shared or solo outing, minimal private questions and a complete stopping/removal path.                                 | No health-benefit claim, stranger matching, research rewards, transcript analysis or longitudinal pressure. The actual twenty-hour fictional duration now has disclosed finite meals, ordinary rest/recovery and protected form-reading boundaries.        |
| DG12  | Retain a useful admitted invention, carry its complete eligible dependency bundle to a compatible prepared world, then separately obtain knowledge/resources and use it.                 | No marketplace, default universal license, automatic paid adaptation, silent dependency update or assumption that import grants items or character knowledge. The same character need not learn a system of technical identifiers to reuse an invention.   |
| DG13  | Build one light canopy, use it, optionally extend to two bays, alter it and recover actual surviving materials.                                                                          | No punitive moisture requirement, mandatory household machinery, recurring tie loss or heavy collapse. Review corrected material-use authority, shared-post geometry and an old three-section acceptance case that exceeded the selected two-bay scope.    |
| DG14  | Become a little more reliable with an already useful sling through six actual releases, with quiet target practice available; add genuine coaching only as a later complete interaction. | No invented beginner penalty, second hit roll, endless XP, kill/novelty farming, absence decay or generic personality change. Coaching's small time/material saving is explicit; its interaction must earn its place.                                      |
| DG15  | Voluntarily read one short, permitted historical continuation of a familiar resident's actual camp activity.                                                                             | No private motives, other-human source, live scouting, forced camera, automatic scene production or invented gesture. Review fixed re-entry, Off, freshness and pre-control participation changes; a trivial scene is a reason to leave the mode disabled. |

### What should be built first

Writing order is not release order. These five groups do not form a dependency chain. Work needed for the playable adventure comes first through its existing owners. Within this set, the independent sling-practice experience can be evaluated against worthwhile weapon use, the canopy against a chosen place to return to, and invention reuse against an actual creator's repeated work. Each can qualify without the other two.

Keep the optional study beside the specific product question it would answer; it does not gate gameplay development. Add an optional distant story only after ordinary narration is useful, and only if its real sparse scene adds pleasure at an acceptable cost. Coaching follows a complete independent competence route. A marketplace, household system, generalized dice engine, six-resident population or private-thought narrator is not a prerequisite for these scoped experiences.

### Economics that remain honest

Ordinary known reuse, building, moisture updates and practice credit use actual admitted rules without adding a model call for every step. Genuine resident choices keep their complete required evidence and their existing funding. The study layer adds no provider interpretation of participants; the optional vignette buys at most one bounded call per explicit request and never silently retries. These are proposed work boundaries, not measured throughput or a hosting-cost forecast.

The specs expose the continuing costs that small demonstrations can hide: retaining eligible invention history, checking dependencies and rights, keeping conditioned physical materials, maintaining lawful support for competence, satisfying study withdrawal and correcting published narrative sources. They avoid promising unlimited capacity from a page size, a small prompt or one successful action. Values belong in the maintained inventories and remain subject to their named qualification rather than becoming unexamined engine laws.

## Research and documentation verification

The work adds **54 primary-source research entries** across the five designs: 12 for DG11, ten each for DG12–DG14, and 12 for DG15. An entry may combine related primary pages, and sources can overlap; this is not a claim of 54 distinct studies. Registers distinguish developer intentions, historical release behavior, reported defects, guidance and research findings from Open Legend's own design judgments. Dates and unavailable/full-text limitations are explicit. The three expanded specifications retain their earlier research and useful broader examples.

Each group received source/contract and product review before proceeding to the next. The final cross-review examined fun, real player choices, economy, priorities, lifecycle, privacy, authored-world ownership and duplicated responsibilities. Its concrete fixes are included above, not left as an unresolved review list. Study tasks use the distinct WBE prefix so the existing HE hearing identifiers remain unambiguous. Current limits and navigation now include the new reuse, shelter, competence and story scopes.

The full affected diff was reviewed against main at d36ec3bd66f9b317748147003cc174f58cfd5642. All **373 pre-existing checkbox entries** in affected files remain intact, including their states; earlier named journeys and research identifiers remain. The only newly checked tasks record completed product-document work. New and changed relative links and anchors were checked against local content and the full pinned repository tree. Three inherited obsolete anchor references in older changelog/EWF material were confirmed as pre-existing; they do not affect this assignment's new references.

All 32 changed Markdown files pass the repository's pinned Prettier 3.6.2 check. Additive archive and changelog passages preserve their historical formatting and content. The completed assignment overview moves to the completed-project area with incoming and outgoing references repaired; the individual feature specifications stay active with honest remaining-work status. Branch verification compares every task-owned file with its committed content and checks that the final diff contains only these documentation changes. No game, browser, participant, load or paid-provider experiment was run for this assignment.

## Maintained records

Implementation tasks remain in the focused trackers linked by each feature. Feature limits remain in the corresponding inventories; this overview adds no runtime or storage limit. [Needs design](../../maintainers/needs-design.md) owns the queue and [the maintainer index](../../maintainers/README.md) locates actual delivery work.

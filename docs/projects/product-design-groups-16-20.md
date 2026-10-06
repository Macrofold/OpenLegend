# Product designs for groups 16–20

| Status      | Current progress                                                                                              | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | All five product proposals are written; final material-handling refinements and package verification remain. | 2026-10-06   |

## Assignment and baseline

Complete the next five groups in [Needs design](../maintainers/needs-design.md), one at a time: DG16 personal journal, DG17 continuing communities, DG18 crowds and social scenes, DG19 changing supplies, and DG20 heat and material consequences. Deliver detailed product behavior, complete player and resident journeys, failure and recovery, research, economic reasoning, staged capabilities and a final critique of their value to the game. The owner's explicit request excludes technical designs and runtime implementation from this assignment.

The working branch is `codex/product-design-groups-16-20-20261006`, based on `Macrofold/OpenLegend` GitHub `main` at [`ce68e678ebe7589ae34db9fe7942782dbccbe7a5`](https://github.com/Macrofold/OpenLegend/commit/ce68e678ebe7589ae34db9fe7942782dbccbe7a5). That baseline includes the completed DG11–DG15 design assignment. Previously published proposals, current contracts and implementation evidence must be reconciled rather than treated as interchangeable.

A subsequent source refresh on October 6 inspected GitHub `main` at [`34233ae24365eb8911fe1995c9c232bd57f34616`](https://github.com/Macrofold/OpenLegend/commit/34233ae24365eb8911fe1995c9c232bd57f34616), four commits beyond the branch's original base. The updated root guidance and action-availability contract were read before continuing. The designs incorporate relevant newly published evidence and action behavior; these upstream implementation changes are not work performed by this documentation assignment. The branch retains its original base and checkpoint history.

In particular, [the published live camp journey](https://github.com/Macrofold/OpenLegend/blob/34233ae24365eb8911fe1995c9c232bd57f34616/docs/verification/camp-life.md#live-player-journey--october-4-2026) now establishes a coached player path through live sling/cord/pouch generation, real manufacture, hunting and a meal, packing/retrieval, reuse and current-format reopening. Autonomous character decisions were disabled and time was manually advanced. The later integration did not rerun that full hunt on the expanded wilderness. This closes the recorded narrow player-generation/browser gaps while leaving voluntary character choices, unattended operation and broader performance qualification distinct.

The task changes zero runtime logic lines. Its material risks are contradictory clock promises, invented character knowledge, private-history disclosure, unlimited unattended operating cost, destructive material rules and complexity that delays useful adventure. The [gameplay priorities](../repertoires/gameplay-priorities.md), [engine/world boundaries](../engine-and-world-boundaries.md), [feature documentation](../feature-documentation.md) and root instructions govern the designs. Authored wilderness rules belong in `docs/worlds/base/`; current implementation and unverified target behavior remain distinct.

## Deliverables and ownership

| Group | Intended behavior owner                                                      | Existing delivery responsibilities                                                        |
| ----- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| DG16  | A focused personal journal feature specification                             | NC narration/journal, data/privacy and existing rights owners                             |
| DG17  | Expand the existing continuing-lives feature specification                   | PS03/PS05/PS06, simulation time, agency, participation protection and spending            |
| DG18  | Expand the existing attention-and-scenes feature specification               | PS04/PS06, perception/hearing, narration and independent character choices                |
| DG19  | A focused changing-supplies feature specification and authored world profile | Base-world resources, persistent objects, activities, shared state and simulation time    |
| DG20  | A focused heat/material feature specification and authored world profile     | Base-world fire, construction, persistent objects, spatial effects, shared state and time |

Reuse existing maintained owners wherever they already cover the behavior. Keep detailed delivery criteria in focused trackers and discretionary restrictions in their owning limits inventories. Update the DG/ND register with the product-design disposition without closing technical work, operational decisions, runtime delivery or unperformed acceptance.

## Work sequence and completion criteria

For each group, inspect its linked sources and relevant current implementation, select the smallest worthwhile complete activity, research primary sources, write the detailed product proposal, critique it against actual play and reconcile its records. Finish and commit that group's design before drafting the next. Other readers may research or audit the current group; future-group preliminary baseline inspection does not change the sequential drafting requirement.

Commit task changes at least every five minutes while edits remain uncommitted, using honestly labeled checkpoints where necessary. Finish with a review across all five designs: real dependencies, player attraction, believable autonomous behavior, conservation of actual resources, information limits, storage and recurring operating cost, and clear stopping/simplification criteria. Research establishes precedents and informs judgments; it does not prove this game's enjoyment or performance.

The assignment is complete when all five product designs and associated world rules are written, the cited claims have been checked, every material review finding is incorporated or accurately retained under its existing owner, documentation links and statuses are consistent, and all task changes are committed. Documentation checks cover the full affected difference, relative paths/anchors, retained IDs and acceptance states, and formatting. No game, browser, paid-provider or load experiment is required or claimed for a design-only assignment.

## Maintained records

- Queue and design disposition: [Needs design](../maintainers/needs-design.md).
- Delivery navigation: [Maintainer index](../maintainers/README.md).
- Limits: the feature inventories linked by each product specification; this assignment creates no separate runtime limit.
- Related completed assignment: [Product designs 11–15](completed/product-design-groups-11-15.md).

## Selected activities and their useful result

| Design | Complete activity | Why this scope is useful |
| --- | --- | --- |
| [Personal Journal edition](personal-journal-feature-spec.md) | Select eligible existing entries, add a title and separate personal notes, preview the exact edition, and obtain a private accessible PDF or plain-text file. | A player keeps a meaningful outing without needing another generated story, a public archive, a print business or a new reflection habit. |
| [Continuing communities](continuing-lives-feature-spec.md#15-dg17--a-first-funded-unattended-community) | Review a prepared isolated camp, its real provisions and a finite continuation period; leave; return to actual events and independent choices. | The game can establish whether people living on their own are interesting and viable before offering overnight service or an indefinite recurring operating obligation. |
| [Worthwhile social scenes](attention-and-scenes-feature-spec.md#17-dg18--something-worth-showing-and-a-gathering-worth-joining) | Join an ordinary conversation about something real, inspect or offer it through actual permission, listen, respond and leave; later qualify larger scenes. | A real made object can matter to another person now. A crowd is useful only when its individual activity creates more worthwhile encounters. |
| [Changing supplies](changing-supplies-feature-spec.md) | Preserve real food for an outing, use a reserve on a later visit, and revisit actually renewing resources. | Storage and preparation can support exploration if their benefit exceeds the extra work; spoilage and farming are not opening-game obligations. |
| [Heat and materials](heat-and-materials-feature-spec.md) | Fire a clay blank, continue another activity, cool and use the bowl; optionally compare and manage a small local material fire. | A useful made object provides a positive reason for heat before destruction, broad physics or compulsory tending. |

The world-profile files are authored content and qualification choices. They are not five mandatory player configuration screens. The user-facing first activity should use ordinary Journal, conversation, inspection, work and inventory controls. Permission or operating review belongs only where the particular action genuinely needs it.

## Cross-group critique and revisions

### Preserve a good ordinary adventure

The five designs are separate additions, not a minimum simulation package. The current creative adventure still needs worthwhile exploration, conflict, rewards, practical invention and independent people. None of these proposals makes broad crowd simulation, food spoilage, unattended service or thermal construction a prerequisite for that loop. The familiar campfire and ordinary containers remain useful while new material families earn their place.

Among these additions, the first social gathering most directly reuses an existing made object in an enjoyable human encounter; the Journal can preserve that experience independently. Continuing communities should follow credible attended self-care and voluntary activity. Supply aging has the weakest immediate case: a nominally four-day return interval is only meaningful if the intervening play is worthwhile without that timer. The heat proposal similarly retains an explicit rejection criterion for an inferior bag obtained by waiting through an extra process. These judgments guide later scope selection; they do not silently reprioritize existing approved implementation work.

### Account for the whole cost

The review corrected misleading clock intuitions throughout the package. At the current speed, three game days are 72 real minutes, not an overnight absence. Food preparation spends both real materials and the advancing time in which people become hungry. Heat delivered to another piece changes a bowl's actual firing time. A nominally cheap calculation still leaves discovery, character decisions, observation, retained history and reopening costs to measure.

Scarcity must come from actual authored supplies and consequences. Preserving food retains its existing deterioration; cooking, packing or changing an identifier cannot make it fresh. Renewing berries have a modest two-person theoretical margin and fail to sustain three people on their own. A fire divides finite output, consumes real remaining material and cannot also award intact salvage. The Journal prepares from existing permitted writing instead of regenerating every selected memory. None of these designs claims measured scale or a commercial price.

### Preserve choices and readable recovery

Independent residents may refuse, pursue another purpose or make a bad choice. Their participation is never supplied by a fallback personality or a compulsory schedule. The first crowd experience retains exact ordinary conversation; proposed background meaning cannot invent quoted words, transfer consent or reveal an unheard exchange. The original scene proposal now describes the implemented full active-member conversation merge accurately and reserves selective subgroup separation for a supported later operation.

An individual leaving, a human stopping their action and a whole-world hold are different events. The continuation hold is scoped to the selected isolated community, not all public/shared deployments. Supply work releases the actual unfinished portion on an ordinary stop. Placed clay continues as a physical process until the world's clock is held or its heat changes. The Journal's human annotations neither grant a character knowledge nor rewrite what occurred.

The final heat critique requires an actually coolable withdrawal destination, a defined narrow permission for an optional resident firing, truthful remaining material after a panel fails, and supported reopening after the hearth is covered. Ordinary excluded objects and people approaching the site must remain playable; an undefined deliberate experiment can be refused without turning routine movement into a world-stopping failure. A completed bowl cannot be ruined merely because collection was late.

### Stop expanding when the benefit is missing

Each specification includes complete future acceptance journeys and its own simplify/defer criterion. Greater population, more elapsed days, more spoiled food or more burned geometry are not success measures. A useful first experience, credible independent behavior, a changed plan the player understands and a reason to return are the evidence that should justify expansion. Technical design and implementation remain the next distinct authorized mode, with their actual acceptance still open in the focused trackers.

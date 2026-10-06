# Product designs for groups 16–20

| Status    | Current progress                                                                                                      | Last updated |
| --------- | --------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The owner requested a further gameplay critique; staged delivery, player burden and priority revisions are in progress. | 2026-10-06   |

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

| Design | Independently complete contribution | Further scope that must earn its place |
| --- | --- | --- |
| [Personal Journal edition](personal-journal-feature-spec.md) | Choose eligible existing entries, optionally title them, preview exactly and download PDF or text. Include personal notes if interpretation is the wanted benefit. | Saved resumption, richer editing, other people's material, illustrations and printing each need their own useful task. A notes-free copy demonstrates keeping and rereading, not the full authorship experience. |
| [Continuing lives](continuing-lives-feature-spec.md) | Meet the same resident pursuing a real purpose while the player has their own activity, with understandable stopping, self-care and a useful later encounter. | The finite unattended community is a later offer. Additional people, general coarse execution, new social-meaning families and longer absence are not prerequisites for attended continuity. |
| [Worthwhile social scenes](attention-and-scenes-feature-spec.md) | Improve an ordinary exact conversation where needed; complete a small shared exchange when an actual additional participant makes it worth having. | Prospective gist, ongoing vocal activity and larger gatherings are independently conditional. Seven bodies is a possible qualification workload, not a release target. |
| [Changing supplies](changing-supplies-feature-spec.md) | Choose a wanted preparation/return activity, or a useful revisit to a renewing source, and complete that selected behavior. Preservation and renewal can finish separately. | Food aging must plausibly improve the adventure beyond current nonperishable supplies. Resident preparation, combined renewal/preservation and unattended provisioning are separate scope. |
| [Heat and materials](heat-and-materials-feature-spec.md) | If wanted, fire a clay blank with the human's own kit, do something else while it changes, then cool, collect and actually use the bowl. | Dry-material fire, moisture, resident making and combined food-fire work are separately selectable. A consequential material-fire activity can be chosen for its own appeal without first proving pottery popular. |

The world-profile files are authored content and qualification choices. They are not five mandatory player configuration screens. The user-facing first activity should use ordinary Journal, conversation, inspection, work and inventory controls. Permission or operating review belongs only where the particular action genuinely needs it.

## Cross-group critique and revisions

### Preserve a good ordinary adventure

The five designs are separate additions, not a minimum simulation package. The current creative adventure still needs worthwhile exploration, conflict, rewards, practical invention and independent people. None of these proposals makes broad crowd simulation, food spoilage, unattended service or thermal construction a prerequisite for that loop. The familiar campfire and ordinary containers remain useful while new material families earn their place.

Among these additions, an ordinary exchange about an existing made object most directly reconnects invention with another person; an additional participant should contribute something worth hearing before a group view becomes necessary. The Journal can preserve a wanted experience independently. Continuing communities follow credible attended self-care and voluntary activity. Supply aging has the weakest immediate case: a nominally four-day return interval matters only if the intervening play is worthwhile without that timer. The heat proposal likewise compares its bowl with existing containers and treats enjoyable making as a hypothesis. These judgments guide later scope selection; they do not silently reprioritize existing approved implementation work.

### Account for the whole cost

The review corrected misleading clock intuitions throughout the package. At the current speed, three game days are 72 real minutes, not an overnight absence. Food preparation spends both real materials and the advancing time in which people become hungry. Heat delivered to another piece changes a bowl's actual firing time. A nominally cheap calculation still leaves discovery, character decisions, observation, retained history and reopening costs to measure.

Scarcity must come from actual authored supplies and consequences. Preserving food retains its existing deterioration; cooking, packing or changing an identifier cannot make it fresh. Renewing berries have a modest two-person theoretical margin and fail to sustain three people on their own. A fire divides finite output, consumes real remaining material and cannot also award intact salvage. The Journal prepares from existing permitted writing instead of regenerating every selected memory. None of these designs claims measured scale or a commercial price.

### Preserve choices and readable recovery

Independent residents may refuse, pursue another purpose or make a bad choice. Their participation is never supplied by a fallback personality or a compulsory schedule. The first crowd experience retains exact ordinary conversation; proposed background meaning cannot invent quoted words, transfer consent or reveal an unheard exchange. The original scene proposal now describes the implemented full active-member conversation merge accurately and reserves selective subgroup separation for a supported later operation.

An individual leaving, a human stopping their action and a whole-world hold are different events. The continuation hold is scoped to the selected isolated community, not all public/shared deployments. Supply work releases the actual unfinished portion on an ordinary stop. Placed clay continues as a physical process until the world's clock is held or its heat changes. The Journal's human annotations neither grant a character knowledge nor rewrite what occurred.

The final heat critique requires an actually coolable withdrawal destination, a defined narrow permission for an optional resident firing, truthful remaining material after a panel fails, and supported reopening after the hearth is covered. Ordinary excluded objects and people approaching the site must remain playable; an undefined deliberate experiment can be refused without turning routine movement into a world-stopping failure. A completed bowl cannot be ruined merely because collection was late.

### Stop expanding when the benefit is missing

Each specification includes complete future acceptance journeys and its own simplify/defer criterion. Greater population, more elapsed days, more spoiled food or more burned geometry are not success measures. A useful first experience, credible independent behavior, a changed plan the player understands and a reason to return are the evidence that should justify expansion. Technical design and implementation remain the next distinct authorized mode, with their actual acceptance still open in the focused trackers.

## Initial assignment completion evidence

The five proposals add **37 primary-source research records**. Independent product, source and mechanics reviews found no remaining material product contradiction after the documented corrections. The existing continuing-lives specification retains all 14 earlier research records and 12 named journeys; the attention/scenes specification retains all 16 earlier research records and 14 named journeys. Their preserved records are unchanged apart from formatting.

Final documentation verification covers **36 changed Markdown files**, all passing the repository's formatting choices. The added-link review examined 393 link occurrences and resolved all 292 local targets/anchors with no missing or unread target. All **362 original acceptance checkboxes** are preserved without removal, rewording or state change; newly completed checks concern only delivered product-design scope. The pre-existing changelog history is preserved exactly. The assignment's old active path is removed and incoming references point to this completed record.

The committed branch tree was compared with every local task document by exact Git blob content, with no mismatch or runtime file in the changed scope. A final source check on October 6 at 02:23 UTC found GitHub main still at `34233ae24365eb8911fe1995c9c232bd57f34616`, the latest implementation revision already inspected. These are documentation and source-review results, not game, browser, autonomous-character, paid-provider, load or enjoyment measurements. No such runtime experiments were performed by this assignment.

## Further gameplay review — October 6, 2026

The owner asked for another critique of the whole package: does it make a fun, playable game, and is the work sequenced around that goal? The review began from this branch at `4d6b337a48ab99139afbd5072a2f91e672bfd96b` and rechecked GitHub main at `34233ae24365eb8911fe1995c9c232bd57f34616`. This remains product-only work with zero runtime logic changes. Restoring the source mirror after workspace maintenance was not a checkout switch, branch creation, rebase or new implementation.

### Finding: the first deliveries still inherited too much

The previous critique correctly called the features optional, but several delivery sections and trackers still joined a useful first activity to most of its future machinery. Optional player participation does not make that implementation small. The review changed the actual stages and their owning trackers/limits, rather than relying on a general instruction to prioritize fun.

For the Journal, a first exact private edition no longer requires persistent editing and cross-tab recovery. The fuller authorship design remains; notes are included whenever expressing interpretation is the selected value. For people, a good ordinary conversation and a resident with an understandable purpose can finish before general crowd or unattended infrastructure. For supplies, renewal does not require spoilage, and preservation does not require a renewal system. For heat, a human making a bowl with their own materials does not require wooden-wall damage, moisture, resident permission or a combined cooking/preservation fire.

These are complete smaller deliveries, not permission to omit correctness from enabled behavior. An exported entry still needs current source authority and accessible output. An actual gathering still needs truthful participation, perceived speech, custody and recovery. Aging food still needs consistent condition through work, eating and handover. A selected material fire still needs the matched dry-twig/substantial-wall comparison, finite energy/material accounting, actual damage and useful stopping. Each later capability keeps its unperformed acceptance.

### Finding: resource arithmetic is not the player experience

The [continuing-community profile](../worlds/base/continuing-communities.md#food-and-rest-viability) now makes the current pacing visible. At 60 game seconds per real second, normal drain consumes 10.8 fullness points per real minute. A cooked meat's 38 points offset about 3 minutes 31 seconds of that drain before waste; a full 100-point reserve covers about 9 minutes 16 seconds without eating. Maximum restorative sleep lasts eight real minutes at that speed and consumes 86.4 fullness. These are consequences of current authored values, not playtest results, death-time predictions or a new clock decision.

A pantry can contain enough food while the actual person fails to fit meaningful work, company, human reading and model waiting around bodily needs. The review therefore requires actual offered-clock pacing when qualifying the integrated life experience. If repetition or waiting dominates, reconsider the relevant authored conditions, need/work pacing or interaction burden through existing owners. More food, more paid thoughts or a hidden automatic survival routine is not a sufficient answer. This broader qualification does not block an independently useful conversation or Journal improvement.

The [supply profile](../worlds/base/changing-supplies.md) retains its eight-portion cache, two real minutes of occupied preservation work, four game days before return and 64 berries consumed elsewhere. That is a feasible 96-real-minute supply history, not evidence that food aging creates a better outing. The revised order names a wanted trip or preparation choice first, permits a modest prototype on a credible hypothesis, then compares actual play before ordinary adoption or expansion. Renewal using current nonperishable food remains possible, with the explicit consequence that harvested surplus can accumulate beyond the patch's standing capacity.

The [heat proposal](heat-and-materials-feature-spec.md) similarly faces its actual alternative: the proposed bowl holds eight packing units and occupies two when empty; a current woven container can hold eight with empty load one, or 24 with empty load two under its authored construction rules. The bowl has no storage advantage. Enjoying the making and later use of this object is a possible reason to choose it, but the proposal does not yet include the catalogue's shaped-bowl design expression. Do not claim that richer payoff, add compensating bonuses or weaken current bags merely to justify firing. Equally, a deliberately chosen fire with meaningful sacrifice or changed space can be worthwhile; avoiding every risk is not the game's goal.

### Recommendation: finish worthwhile play before enlarging the simulation

The [gameplay priorities](../repertoires/gameplay-priorities.md) distinguish Core experiences from additions that make them more complete. Current [psychology cards](../repertoires/psychology-behavior.md) place resumed purposes, stopping when enough is done, modest chosen goals and understood refusal in Core (PB-061/PB-062/PB-081/PB-121). The [adventure catalogue](../repertoires/adventure-discovery.md) likewise treats useful exploration, a local threat, recoverable rewards and a lasting changed route as Core. The [work catalogue](../repertoires/work-crafting.md) gives preserving and shaped-bowl craft a legitimate Complete role (WORK-004/WORK-006/WORK-061). Those cards identify kinds of worthwhile play; this review does not select additional quests, recipes or a complete pottery-expression feature.

As of inspected main, [the personal-game tracker](https://github.com/Macrofold/OpenLegend/blob/34233ae24365eb8911fe1995c9c232bd57f34616/docs/maintainers/parallel-batch-03-personal-game.md) records the scoped live invention journey as complete, while attended resident behavior and first-threat design remain open. [The character tracker](https://github.com/Macrofold/OpenLegend/blob/34233ae24365eb8911fe1995c9c232bd57f34616/docs/maintainers/character-experience.md) retains the complete independent-life episode and integrated quality/cost qualification. [The expeditions tracker](https://github.com/Macrofold/OpenLegend/blob/34233ae24365eb8911fe1995c9c232bd57f34616/docs/maintainers/parallel-batch-04-expeditions-and-exchange.md) retains threat prerequisites, useful discovery and voluntary outing work. An open tracker is a readiness record at that revision, not evidence that nobody is working on it. The [published live journey](https://github.com/Macrofold/OpenLegend/blob/34233ae24365eb8911fe1995c9c232bd57f34616/docs/verification/camp-life.md#live-player-journey--october-4-2026) was coached, with autonomous choices disabled and manual clock advancement; it does not settle those remaining claims.

| Delivery emphasis | Why it comes here | Dependency boundary |
| --- | --- | --- |
| Strengthen the existing attended adventure and independent resident | The player needs a reason to invent, explore, meet someone and choose what to do next. Continue through the current resident, discovery and encounter owners. | Resolve the actual threat or participation prerequisites for a chosen activity; do not import all five proposals or every Core catalogue card. |
| Improve a specific exact conversation where useful | The existing made object or experience can already support an interesting exchange. | It can finish before full resident-life qualification. A shared group view follows a worthwhile additional participant, not proximity alone. |
| Add a modest Journal edition or a specifically wanted making activity | These can enrich a good experience without running continuously or governing the whole world. | They are optional independent contributions, not a mandatory second phase; a bowl's full prepared profile is not its first delivery checklist. |
| Offer the finite unattended community when it adds a valued return | It creates a real recurring operation and must sustain independent people at the offered clock and complete cost. | Demonstrate the selected attended behavior first; retain finite provisions, no-service stopping and explicit funding. General crowd/coarse systems are conditional. |
| Add supply aging, richer social meaning or broader material fire when a concrete activity needs them | These change planning, risk, information or ongoing cost; each should contribute a worthwhile choice. | Select and qualify the actual family independently. Renewal can precede aging; material fire need not wait for a pottery preference; none requires all other expansions. |

This is a dependency-aware recommendation, not a new mandatory waterfall or a replacement for already approved work. DG16–DG20 remain design identifiers. The practical order follows the player's wanted activity, existing delivery commitments and the readiness of the mechanics that activity actually consumes.

### Review discipline and completion

A design can make a credible case before an implementation exists. The new first-step value checks accept a concrete request, existing observation or a reasoned walkthrough; they do not demand a new analytics system, formal study or empirical proof of fun before a small prototype. After delivery, compare the real effort and useful result with the current simpler activity. Keep or expand what adds value, and revise or stop what does not.

The global queue, base-world summaries, canonical narration, focused trackers and limit inventories are reconciled with these boundaries. The detailed feature projects remain active because technical design and runtime delivery are still outside this assignment. Existing research and unsatisfied journeys remain useful inputs; product review does not turn them into performed acceptance. Final documentation checks and completion evidence are recorded below after verification.

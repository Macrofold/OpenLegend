# Implementation status and change log

Updated for wilderness/survival/time, Macrofold/memory, and the accepted PlayCanvas/custom-simulation and grounded pixel-art direction in the September 18, 2026 planning session (America/New_York).

September 19 follow-up: documented the conditional case for Macrofold-managed shared workers; no execution mode or game code implemented.

September 19 mechanics follow-up: documented accepted evolving-material/modular-home direction, tentative script references, and proposed semantic/thermal behavior. Added property migration, editable assemblies, derived spaces/comfort, accumulated ignition, local fire feedback, and planned verification. These are documentation changes only.

September 19 scope/world follow-up: documented manageable simulation growth and per-world parameters, including plausible missing mechanics versus forbidden effects and friendly rejection of magical ignition in a realistic world. Profiles, classifiers and budgets remain design proposals.

**Game implementation: not started, as requested.** The workspace contains the planning archive and its source brief. No game code, project scaffold, dependency installation, generated game assets, accounts, services, deployment, subscriptions, or API experiment was created as part of this work.

September 19 repository/community follow-up: applied AGPL-3.0-only, preserved the previous Apache text, and added the licensing guide and root README. Documented creator-world subscriptions, packs, patron recognition/dedications, contributor participation, creator grants, and optional token/NFT exploration. Commercial details and game implementation remain open. The separately prepared art-direction folder contains a reference board and its generator, not a game renderer or acquired production assets.

## Deliverable status

| Area | State | Evidence |
|---|---|---|
| Original brief | Preserved verbatim | [Source](../00-source/original-brief.txt) |
| Subsequent user direction | Preserved and incorporated | [Follow-ups](../00-source/design-followups.md) |
| User requirements | Organized and mapped | [Baseline](../01-requirements/product-baseline.md) |
| Master system/feature map | Documented | [Master map](../master-map.md) |
| Comparable games and human models | Desk research complete for initial planning | [Research guide](../02-research/source-guide.md) |
| Jev evaluation | Documentation research complete; service untested | [Jev](../02-research/jev-and-semantic-routing.md) |
| Engine and visual direction | PlayCanvas and grounded modern pixel art accepted; camera/editor/asset details open; no engine installed or scene built | [Engine/art](../02-research/engines-art-and-audio.md), [visual brief](../03-design-proposals/visual-direction.md) |
| Hosting and supporting technologies | Candidates only; no provider selected or provisioned | [Hosting](../02-research/hosting-and-scale.md) |
| Architecture and generative interaction protocol | Independent custom simulation/generative-rule boundary accepted; detailed protocol/runtime remains proposed and unimplemented | [Architecture](../03-design-proposals/system-architecture.md), [capability lifecycle](../03-design-proposals/generative-capability-lifecycle.md) |
| Evolving properties, modular homes, and fire | Modular/evolving direction accepted; script hooks, schemas, algorithms, and thermal rollout proposed; unimplemented | [Construction and extensions](../03-design-proposals/evolving-materials-and-construction.md), [heat/fire](../03-design-proposals/heat-and-fire.md); M01–M03/F42/D31/R21 |
| Simulation scope and world parameters | Direction accepted; coarse models, profile schema, admission/classification and feedback specified as proposals; unimplemented | [Complexity management](../03-design-proposals/simulation-scope-and-complexity.md), [world rules](../03-design-proposals/world-rules-and-parameters.md); M04/M05, F43/F44, D32/D33, R22 |
| Agent/world/player systems | Proposed, unimplemented | [Agents](../03-design-proposals/agents-and-social-simulation.md), [world](../03-design-proposals/world-and-player-experience.md) |
| Primitive starting society and native survival | Direction accepted; package details proposed; unimplemented | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| Acceleration and creator speed controls | Desired direction documented; 24× ratio and implementation provisional | [Time and simulation speed](../03-design-proposals/time-and-simulation-speed.md) |
| Macrofold and persistent minds | Sibling repository inspected read-only; conditional preference for broader reuse if efficient pooled execution is supported; no adapter, schema, new executor or benchmark implemented | [Comparison and costs](../02-research/macrofold-workspaces.md), [storage/retrieval](../03-design-proposals/memory-storage-and-retrieval.md), [shared workers](../03-design-proposals/macrofold-shared-workers.md) |
| Macrofold AI workflows and environment state | Proposed generalization beyond NPC jobs; typed inference and structured resources are new capabilities, not verified existing features | [Workflow and state boundary](../03-design-proposals/macrofold-ai-workflows-and-world-state.md) |
| Business/future directions | Unvalidated ideas | [Ideation](../04-ideation/business-and-future-directions.md) |
| Repository licensing | AGPL-3.0-only applied; prior Apache text retained; SDK policy documented; executable-pack exception not granted | [License](../../LICENSE), [licensing guide](../../LICENSING.md); D34 |
| Creator and patron ecosystem | Directions accepted and documented; no hosting product, marketplace, membership, grant, or token launched | [Marketing index](../06-marketing/README.md); D35–D38 |
| Art-reference workspace | Interactive reference board, catalog, and generator prepared; full browser interaction testing remains limited as documented | [Art direction](../../art-direction/README.md) |
| Decisions/research work | Registers maintained; accepted direction separated from open details | [Decisions](open-decisions.md), [research](research-backlog.md) |
| Roadmap and implementation backlog | Proposed only | [Roadmap](roadmap.md) |
| Tests/measurements | None run for game behavior or performance | Planned experiments in research backlog |

Documentation verification: the source copy matches the original; relative document links and Markdown code fences are checked after updates. Clock and illustrative memory/runtime/model-cost examples have been checked arithmetically. Independent reviews checked requirement coverage and architecture consistency. These checks validate the archive's organization and arithmetic, not the feasibility or performance of the proposed game.

## Update discipline

Use `not started → in progress → blocked → verified complete` for implementation work. Attach concrete evidence to completion: changed files, scenario/test results, environment, revision, known limitations. Documentation completion must not move a game feature to implemented.

Every accepted product/technical choice gets a decision history entry. New brainstorming stays in ideation or proposals until accepted. A discovered capability in the eventual game would be versioned in the runtime registry; that is separate from this planning archive's document status.

For ongoing work, update this status page, the relevant roadmap row, and research/decision entries when evidence changes. There is no scheduled background research or automation attached to this archive.

## Change log

| Date | Change | Impact |
|---|---|---|
| 2026-09-18 | Initial research and planning archive created | Establishes traceable requirements, researched options, proposed contracts, phase gates, and open registers; no implementation |
| 2026-09-19 | Adopted AGPL and documented creator/community direction | Root licensing policy, accepted decisions, memberships, packs, engravings/dedications, contributor voice, grants, and optional token exploration; no game or commerce implementation |
| 2026-09-18 | Incorporated U01/U02 wilderness, survival and accelerated-time direction | Added survival and time specifications, F35–F39, and updated roadmap/decision records; supersedes village/forgiving-NPC opening proposals; no implementation |
| 2026-09-18 | Evaluated U03 Macrofold workspaces and richer memory | Added read-only repository findings, illustrative cost scenarios, concrete memory-storage/retrieval proposal, D28 and R19; no game implementation or Macrofold modifications |
| 2026-09-18 | Incorporated V01–V04 visual/engine discussion and accepted recommendation | Recorded PlayCanvas, grounded modern pixel art and owned headless simulation/generative-rule interface; superseded Babylon.js default, added visual brief and F40–F41/D29, updated R01/R02 and P1 gates; no game implementation or subscription |
| 2026-09-18 | Investigated U04 sandbox startup and clarified cost categories | Documented Vercel execution, prebuilt runtime, phase delays and hydration candidates, proposed measurement/warm-reuse trade-offs, and distinction between retail compute, vendor costs and LLM tokens; no changes to Macrofold or paid tests |
| 2026-09-19 | Evaluated U09 Macrofold with shared long-running workers | Revised D28 conditionally toward Macrofold for ordinary reasoning if pooled execution is efficient; documented reusable infrastructure, game-owned semantics, exclusive versus lightweight pools, adaptation risks and comparison criteria; no implementation |
| 2026-09-19 | Documented M01–M03 modular/evolving mechanics and semantic/script extensions | Added construction and thermal specifications, F42/D31/R21, refined D20, and aligned earlier shelter/ignition examples; script pointers remain tentative, thermal formulas untested; no game code or runtime created |
| 2026-09-19 | Documented M04/M05 complexity control and world-level possibility rules | Added scope and world-profile specifications, F43/F44, D32/D33 and R22; clarified the optional depth of thermal modeling, bounded invention, realism/implementation distinctions, and friendly rejection; no game code or classifier created |
| 2026-09-19 | Explored U10 environment state and general AI workflows in Macrofold | Proposed a common AI layer with typed inference, resource access and composable jobs; clarified logical world authority versus physical hosting and file snapshots versus live transactions; expanded D28 and added D30/R20; no implementation |

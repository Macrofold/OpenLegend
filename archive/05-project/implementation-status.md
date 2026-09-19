# Implementation status and change log

Updated for wilderness/survival/time, Macrofold/memory, and the accepted PlayCanvas/custom-simulation and grounded pixel-art direction in the September 18, 2026 planning session (America/New_York).

September 19 follow-up: documented the conditional case for Macrofold-managed shared workers; no execution mode or game code implemented.

**Game implementation: not started, as requested.** The workspace contains the planning archive and its source brief. No game code, project scaffold, dependency installation, generated game assets, accounts, services, deployment, subscriptions, or API experiment was created as part of this work.

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
| Agent/world/player systems | Proposed, unimplemented | [Agents](../03-design-proposals/agents-and-social-simulation.md), [world](../03-design-proposals/world-and-player-experience.md) |
| Primitive starting society and native survival | Direction accepted; package details proposed; unimplemented | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| Acceleration and creator speed controls | Desired direction documented; 24× ratio and implementation provisional | [Time and simulation speed](../03-design-proposals/time-and-simulation-speed.md) |
| Macrofold and persistent minds | Sibling repository inspected read-only; conditional preference for broader reuse if efficient pooled execution is supported; no adapter, schema, new executor or benchmark implemented | [Comparison and costs](../02-research/macrofold-workspaces.md), [storage/retrieval](../03-design-proposals/memory-storage-and-retrieval.md), [shared workers](../03-design-proposals/macrofold-shared-workers.md) |
| Macrofold AI workflows and environment state | Proposed generalization beyond NPC jobs; typed inference and structured resources are new capabilities, not verified existing features | [Workflow and state boundary](../03-design-proposals/macrofold-ai-workflows-and-world-state.md) |
| Business/future directions | Unvalidated ideas | [Ideation](../04-ideation/business-and-future-directions.md) |
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
| 2026-09-18 | Incorporated U01/U02 wilderness, survival and accelerated-time direction | Added survival and time specifications, F35–F39, and updated roadmap/decision records; supersedes village/forgiving-NPC opening proposals; no implementation |
| 2026-09-18 | Evaluated U03 Macrofold workspaces and richer memory | Added read-only repository findings, illustrative cost scenarios, concrete memory-storage/retrieval proposal, D28 and R19; no game implementation or Macrofold modifications |
| 2026-09-18 | Incorporated V01–V04 visual/engine discussion and accepted recommendation | Recorded PlayCanvas, grounded modern pixel art and owned headless simulation/generative-rule interface; superseded Babylon.js default, added visual brief and F40–F41/D29, updated R01/R02 and P1 gates; no game implementation or subscription |
| 2026-09-18 | Investigated U04 sandbox startup and clarified cost categories | Documented Vercel execution, prebuilt runtime, phase delays and hydration candidates, proposed measurement/warm-reuse trade-offs, and distinction between retail compute, vendor costs and LLM tokens; no changes to Macrofold or paid tests |
| 2026-09-19 | Evaluated U09 Macrofold with shared long-running workers | Revised D28 conditionally toward Macrofold for ordinary reasoning if pooled execution is efficient; documented reusable infrastructure, game-owned semantics, exclusive versus lightweight pools, adaptation risks and comparison criteria; no implementation |
| 2026-09-19 | Explored U10 environment state and general AI workflows in Macrofold | Proposed a common AI layer with typed inference, resource access and composable jobs; clarified logical world authority versus physical hosting and file snapshots versus live transactions; expanded D28 and added D30/R20; no implementation |

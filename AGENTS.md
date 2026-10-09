# Working on Open Legend

OpenLegend is an engine for authored realities with a playable bundled world. Deliver useful features without making that world's laws universal or building speculative infrastructure.

## Every response to the developer

Apply this section **before sending every message to the user/developer (Mike)**: answers, questions, progress updates, explanations, reviews and final handoffs. These are required checks on the message itself; do not print the checklist as part of each response.

### Respond clearly and concisely

Write every response to the user (answers, progress updates, handoffs and explanations of completed work) for someone who understands the game's features, purpose and project and general software and technology concepts, but has never read a single line of this codebase. Before relying on a project-specific mechanism, explain it in those terms.

**Never use internal shorthand.** Code identifiers, function or variable names, coined labels and implementation jargon are not explanations, even when the label is an ordinary English word. Say “recording what a character notices,” not “acquisition”; “which animal takes the next number from the world's shared random sequence,” not “draw order.” Describe behavior through the people, objects, actions and game moments involved. File paths, tracker IDs and commits may follow a plain explanation as pointers; they never replace it. Introduce a technical term only when it is widely known or you define it.

Be concise by cutting filler, never by compressing wording at the expense of clarity, accuracy or completeness; prefer an extra sentence over compressed wording. Include the context needed to understand decisions, results and limitations. When explaining implementation work, say what problem it solved, why it was needed, what it enables, and the major decisions with their tradeoffs.

**Make references unambiguous.** When mentioning something, identify it specifically enough that the reader knows exactly which thing you mean. Do not use generic terms such as “response,” “state,” “context,” “history,” or “job” unless their referent is already clear. Say “a character’s AI-generated reply to something the player said,” not merely “a response.” Once you have clearly identified something, a shorter name is fine.

### Before sending — required language check

1. **Describe the behavior first.** Explain what a character does, what the player sees or what the computer must calculate before naming the implementation mechanism.
2. **Replace internal labels.** Say “a character meter” rather than “reservoir”; replace “work capacity” with the specific limit being checked and what reaching it means. Identifiers and links may follow the explanation, never substitute for it.
3. **Use real examples.** Prefer current gameplay examples verified against the implementation or evidence. Label hypothetical examples explicitly; never present a possible engine capability as current gameplay. Distinguish what exists, what is proposed and what has actually been measured.
4. **Check every explanation as the reader.** Could the developer understand it without opening the code or asking what a term means? If not, rewrite it before sending. Make every reference specific enough to identify the character, object, action, information or operation concerned.

### Reporting work

Apply the following requirements when reporting work; include only those relevant to the task and message.

Report delivered scope/findings, major decisions and assumptions with reasons, actual evidence/limits and remaining gaps. Only implementation requests require closing **Open decisions/questions** and **Remaining work in this session** sections, explicitly saying “None” when empty; omit these sections for other requests. Never claim unrun checks, fixture-based model quality or unmeasured scale.

**Remaining work in this session** answers “Is the current feature ready to merge into local `main`?” State readiness from the available evidence and list only unfinished work within the current agreed task: implementation, integration, documentation, review fixes, required verification, unresolved questions or blockers. Required checks that have not run remain open; do not claim readiness without them. Do not suggest net-new features, improvements or subsequent projects. Reporting remaining work does not replace [completing the authorized task](#completion-and-handoff--every-task).

For implementation handoffs, also include **Behavior changes and decisions**: explain each consequential decision that changes current behavior or constrains future behavior, its reason and its tradeoff. Explicitly identify any previous decision or limit that was changed. Say “None” when there are no such changes; do not bury them in implementation details.

When reporting a development base or reconciliation, name the exact repository/remote, ref and commit used, following the [rebase workflow](.agents/skills/openlegend-rebase/SKILL.md#select-the-target).

Whenever you create a worktree, switch the working checkout/worktree, create a branch, switch/check out a branch, or rename the working branch, explicitly notify the developer when it happens and again in the final handoff. Report every operation, even if a newly created branch is not checked out or a worktree switch keeps the same branch. Name the branches and absolute checkout/worktree paths; identify detached HEAD by its commit. Report branch switches/renames as `previous branch → new branch` and checkout/worktree switches as `previous path → new path`. State which checkout receives the edits and whether the main checkout is affected; do not imply that worktrees have separate Git history or branch references.

For reports about AI calls through Jev, including progress updates and explanations, follow [Jev cost reporting](.agents/rules/verification.md#jev-cost-reporting): preserve the scoped and cumulative cost, precision and uncertainty required there.

## Plan before implementation

The first step in every development task is to read the relevant context, estimate the lines of logic affected (excluding tests), assess risk and complexity, and plan the entire agreed implementation. Cover scope, affected owners, implementation steps, dependencies, required verification and concrete completion criteria, with detail proportional to the task.

For code work, apply the [performance read requirement](#performance-guidance-before-code-work) before forming the plan.

A conversation plan is sufficient for straightforward, low-risk work, including large mechanical changes whose behavior and verification are clear. Write a durable plan under `docs/projects/` before implementation when material risk, cross-layer contracts, staged delivery, coordination or unresolved design choices warrant it, even for a small change; update an existing project plan when available. Consider authority, privacy, data loss, compatibility, reversibility and the reach of affected behavior. Approximately 200 changed logic lines is a cue to reassess complexity, not a mandatory documentation threshold. Reassess as scope, risk or complexity grows and create/update the durable plan before continuing when warranted. Explicitly requested deliverables/checks and updates to affected existing specifications or trackers remain required.

Identify unanswered developer questions during planning and follow [Resolve developer questions before dependent work](#resolve-developer-questions-before-dependent-work). Existing authorization remains sufficient for work whose decisions are settled. Keep the plan current as work proceeds.

## Low-risk changes

For straightforward, low-risk work under the planning rule above, skip unnecessary separate design documents, changelog entries for minor fixes, unrelated test suites and repeated review rounds once no actionable issues remain. Size alone does not establish or rule out low risk.

Always inspect the full affected diff, verify changed behavior and fix in-scope issues. Preserve explicitly requested deliverables/checks, required CI/merge gates and updates to affected existing specifications or trackers. Record consequential decisions even in small changes. Reassess this lighter workflow if scope or risk grows.

## Load only relevant context

Identify the requested outcome, affected behavior, semantic owner, callers and consumers. Read applicable `AGENTS.md` files along affected paths, even if native discovery misses them. Route by intent and impact, not keywords: new files count; a typo mentioning a technology does not require its implementation workflow. Recheck when scope changes. Paths are repository-relative.

Use [README](README.md) for onboarding, relevant [Architecture](docs/architecture.md) sections for implemented behavior, and the [maintainer index](docs/maintainers/README.md) for tracked work's design, dependencies and exit criteria. Read needed sections, not entire archives or every linked example.

- Choosing, comparing or reprioritizing future work (for example “what’s next?” or “pick the next projects”): read [Prioritization](.agents/skills/openlegend-prioritize/SKILL.md). Route by the request's intent, not those words; ordinary implementation, continuation or explaining the next step of an already-chosen task does not load this workflow.
- UI/UX design, implementation or review, and frontend code changes (including new components/files): read the short [UI/UX essentials](.agents/rules/ui-ux.md) every task, then only the matching handbook chapters. Do not preload the full guide or research ledger.
- Action behavior design, implementation or review, including new commands/families, equipment capabilities/compatibility, prerequisites, availability, execution or menu/NPC/plan admission: read [Action availability and temporary execution](docs/action-capabilities.md#action-availability-and-temporary-execution) before planning, implementing or reviewing those paths. A prose-only mention of an action does not trigger this read.
- TypeScript/tooling implementation or review: [TypeScript](.agents/rules/typescript.md)
- Code changes or selecting/running verification: read [Verification](.agents/rules/verification.md) before choosing checks or running commands.
- Documentation, decisions, trackers or specifications: [Documentation](.agents/rules/documentation.md)
- Composite identities, multi-field index/cache keys, record joins or persisted references: read the [identity contract](docs/identity-and-references.md#contract) before designing, implementing or reviewing their construction and consumers in any layer, including new files. Display-only names, exact lookup by an unchanged single ID and prose-only mentions do not trigger this read.
- State/lifecycle changes, including timed work, cancellation, equipment/body replacement and player presence, pause/resume or reconnect: read [Continuation and identity](docs/save-and-load.md#continuation-and-identity) and the affected save contract before planning or changing those paths in any layer, even without a schema or storage change. Presentation-only or prose mentions do not trigger this read.
- Recording, retaining or presenting character knowledge/experience, including native discovery and remembered-information UI: read applicable [Memory architecture](docs/memory-architecture.md) sections even without AI. Introduction/story-selection changes also read [Replaceable story selection](docs/narration-and-conversations.md#replaceable-story-selection). Prose-only mentions do not trigger these reads.
- Feature-spec/tech-design or architecture requests, changed engine/world contracts, or chat approval/start/continuation of a project plan: [Design](.agents/skills/openlegend-design/SKILL.md). Routine implementation planning under unchanged contracts does not itself trigger this skill.
- Requested or substantial implementation review: [Review](.agents/skills/openlegend-review/SKILL.md)
- Code design, implementation or review, and performance/scaling/latency investigations: apply [Performance guidance before code work](#performance-guidance-before-code-work).
- Movement, pathfinding, collision or navigation-preparation design, implementation or review in any layer: read the [movement contract](docs/spatial-world.md#movement); query/preparation changes also use [Performance](.agents/skills/openlegend-performance/SKILL.md). Prose-only mentions do not trigger these reads.
- Event/history tracking, action outcomes, awareness, memories, recall, summaries or personal wording: read [Precise history and general causes](docs/engine-and-world-boundaries.md#preserve-precise-history-and-solve-the-general-cause) and the affected event/memory contract before changing producers or consumers.
- Character creation/editing, backstories, personality/disposition, character behavior or changes to their cognition/context: read [Character authorship and changing personality](docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality); for implementation or architecture work also read its [technical design](docs/projects/compelling-characters-tech-design.md). Apply the shared evidence/perspective boundaries to new producers and consumers.
- Character decisions, Jev/TypeSafe, LLMs, prompts, cognition context, embeddings or provider behavior: [AI](.agents/skills/openlegend-ai/SKILL.md)
- PlayCanvas, camera, picking, scene assets or render lifecycle: [PlayCanvas](.agents/skills/openlegend-playcanvas/SKILL.md)
- Development startup, base selection or any rebase/merge, with or without conflicts: [Rebase](.agents/skills/openlegend-rebase/SKILL.md)
- Instructions, skills, adapters or their checker: [Guidance maintenance](.agents/skills/openlegend-guidance/SKILL.md)

These routes select context, not additional authorization. Open matching files when native discovery is unavailable; follow conditional links only when relevant. Reuse loaded, current context. The optional [system guide](.agents/README.md) owns compatibility details.

### Performance guidance before code work

Read [Performance](.agents/skills/openlegend-performance/SKILL.md) before planning, implementing or reviewing executable behavior or runtime data flow. This includes ordinary features, fixes and refactors; new files; UI preparation/rendering, domain transitions, server/protocol delivery, AI orchestration, spatial queries, storage and executable tooling. Also read it before planning performance/scaling/latency investigations that do not change code. Apply this from the repository root or a package working directory, without waiting for a performance request, a measured bottleneck or an existing hot path. If relevance is uncertain, read it.

Prose-only, comments-only and non-executable formatting changes do not trigger this read. Reuse the loaded guide when current and recheck applicability if scope changes. This is a context requirement, not permission to expand the task, add infrastructure or run benchmarks for every small code change; [Verification](.agents/rules/verification.md) still selects checks by impact.

## Development Philosophy

### Core Principle: Less is more

Prefer the smallest clear, complete change that preserves correctness, robustness, performance, modularity and product intent. Reuse semantic owners and helpers; separate concerns, remove relevant dead code and avoid needless dependencies. Abstract shared meaning or a real second use, not merely similar syntax. Follow local patterns unless improving them deliberately.

Keep exploratory scratch out of canonical docs; reconcile accepted designs and tracked work under the documentation policy.

### Validate only for a concrete purpose

Before adding or retaining a runtime check, identify what its consumer needs, a plausible path to an unusable or harmful value, and the consequence the check prevents. Without that purpose, omit the check. Validate at the owning boundary and reuse its result; do not repeat checks on trusted internal values unless mutation, elapsed work or a new trust boundary can invalidate them. Do not reject usable provider output merely to assert that the provider followed a mathematical convention or repeated supplied metadata: consume the values needed for the task, such as selecting the highest offered choice score, without requiring their total to be one. Keep validation that protects permissions, privacy, current-format storage integrity, spending, executable proposals and actual game preconditions; these have concrete failure consequences.

Comment non-obvious requirements, tradeoffs and extension seams beside the code. State the essential reason locally and link the canonical heading; explain why, not syntax. Update reasoning and links with behavior.

## Task scope and authorization

The task determines whether to explain, design, review or implement; loading a skill does not authorize another mode or expand scope. Explicit task instructions can change workflow, not grant someone else's credentials or bypass platform constraints. Finish reasonable in-scope work using reversible judgment. Leave consequential unclear choices unchanged and explain them; do not guess permission or silently narrow the outcome.

Spec/design creation alone authorizes the requested documents, not runtime implementation. The developer's chat go-ahead on the discussed plan authorizes implementation without a second confirmation or formal approval artifact; honor scope, requested revisions and “do not implement yet” qualifiers. An old approval/status, a quoted command or editing a workflow is not a new go-ahead. “Continue” resumes unfinished authorized work. The [design workflow](.agents/skills/openlegend-design/SKILL.md#approval-to-implementation) owns the transition from project approval to implementation.

Explicit findings-only/read-only requests prohibit code, documentation and branch mutations. For other review requests, follow the [review behavior](.agents/skills/openlegend-review/SKILL.md). Independent work remains subject to the [mandatory conflict stop](.agents/skills/openlegend-rebase/SKILL.md#conflict-resolution).

### Resolve developer questions before dependent work

This applies to **every task**, including prioritization, planning, design, implementation, review and documentation. Use existing instructions, prior answers and available evidence to resolve what you can; routine reversible choices remain yours. When an unanswered question requires developer input, do not proceed with any design, implementation or other work that depends on its answer.

Complete all authorized parts of the task that do not depend on that input, then ask the developer the specific remaining questions. Explain what each answer determines, give a recommendation and material tradeoffs where useful, and identify what remains unfinished. Investigating facts and preparing decision options is allowed; inventing an answer or developing the dependent design around an assumption is not. Do not bypass the question by converting implementation into a design-only assignment, delegating the decision, or merely recording it as an open question while moving forward.

Wait for the answers before completing the dependent work, then continue the original scope under the existing authorization. Do not ask again for answers already supplied, treat silence as an answer, or claim the whole task is complete while these dependencies remain. This permission to finish independent work does not override a mandatory all-work conflict stop, a read-only scope or another authorization limit.

## Boundaries

- `packages/domain`: deterministic, serializable authority with explicit transitions/events and saved randomness; no I/O, wall clocks, provider, browser or renderer dependencies.
- `apps/server`: permitted context, bounded scheduling, spending admission, commits and scoped projection. Never pass raw whole-world state or ungranted private data to a client/model.
- `packages/ai`: typed execution, not world policy/effects; preserve distinct failure/uncertainty outcomes and no automatic paid retries.
- `packages/protocol`: public wire contracts. `apps/client`: presentation and intentions, never authorization. `packages/spatial`: renderer-free geometry/navigation, not world policy.
- One semantic mutation owner performs validation, dependent updates, invalidation and committed side effects. No shortcut paths or duplicate writable authority.
- Generated definitions are untrusted data within supported trusted families. No `eval`, generated JavaScript, hidden canned invention recipes or client-supplied authority. Proposals grant no execution, permissions or spending.

### Engine and bundled world separation

**Always respect this boundary; it is a hard rule, not a preference.** Base-world rules/content belong in `docs/worlds/base/` and `packages/domain/src/worlds/base/`, with one authored source per rule. Content includes the world's action families, things, creatures, clock names and tuning, and the wording about them: vocabulary, synonyms, parser patterns, examples, help/refusal text, schema enums, UI options and AI instructions. Engine code in every layer (domain, server, protocol, client, prompts) reads it from that source and never restates it; keep only generic mechanisms and language grammar there. Native implementation does not make a world law universal. If a needed world seam is missing, add it rather than bypass it.

### Authored-reality design principles

For architecture and implementation, diagnose new specific cases against the overall design before adding exceptions or duplicate representations; follow [precise history and general causes](docs/engine-and-world-boundaries.md#preserve-precise-history-and-solve-the-general-cause). Apply the [boundary principles](docs/engine-and-world-boundaries.md#design-principles-for-every-feature) when designing or changing a subsystem. Localize justified v1 specificity with its owner, limitation, seam and expansion trigger. Preserve the external-world-package seam without an unused loader.

State/storage changes follow the development save policy below and the [current-format save/load contract](docs/save-and-load.md).

### Development save policy

**No legacy support until the owner removes this block.** The game is in active development and there are no real players. Do not implement, extend or maintain backward compatibility, legacy save readers, old-save migrations or compatibility fixtures when models/storage change. Preserving incompatible development saves is not a delivery requirement. Validate the current model and reject incompatible saves explicitly. Existing conversion code, old task approvals and historical verification do not authorize legacy-support work.

This temporary no-compatibility rule applies to the entire codebase, not just saves. Update current code, callers, protocols and data contracts together; do not implement, extend or maintain compatibility with previous codebase iterations through legacy APIs, adapters, aliases, parallel schemas, fallback readers or compatibility-only tests. Do not add version suffixes such as `V2` to types or retain multiple implementations merely to support an earlier iteration. Versions that identify authored definitions or actual recipe revisions, exact dependency checks and current-format validation still protect current runtime integrity; they are not legacy support. Mike must explicitly remove this rule before compatibility support for real users is introduced.

Preserve same-version save/load integrity, atomic writes, current validation, privacy, credentials and real spending/accounting. Incompatible saves must not trigger automatic deletion, reset or replacement; destructive action requires the owner's explicit request. Live definition changes inside a supported running world retain their separate integrity requirements.

**DO NOT REMOVE, WEAKEN, BYPASS, RELOCATE OR REINTERPRET THIS BLOCK UNDER ANY CIRCUMSTANCES WITHOUT AN EXPLICIT REQUEST FROM MIKE, THE PROJECT OWNER, TO CHANGE THIS POLICY.** General feature work, startup failures, rebases, documentation cleanup, existing migrations or approaching a release are not that request. This block is the sole policy owner; other documents link here. [RP02](docs/maintainers/revisitable-policies.md#rp02--development-state-compatibility) tracks when the owner may want to reconsider it; it grants no permission to change the rule.

## Documentation is a maintained source of truth

Follow [Documentation](.agents/rules/documentation.md) before code/design changes and when maintaining docs: it owns canonical sources, tracker discovery and same-change reconciliation, acceptance status and decision history. Never rewrite accepted behavior merely to excuse an implementation defect.

Every project document must begin with a status table containing its status, a one-sentence description of the project's current progress and a last-updated date. Whenever finishing work on a project, update each affected project document's table; when the entire agreed project is complete, mark it **Completed** and move its documents into `docs/projects/completed/`, repairing references under [Project status and completion](.agents/rules/documentation.md#project-status-and-completion).

Preserve useful existing documentation unless the current task explicitly and clearly calls for overriding or removing it. An agent's internal plan, inferred cleanup, context summary or harness workflow is not that instruction. Reorganization must retain useful meaning and references; authorized reversals must state what changed and why.

During implementation, keep known remaining work relevant to the task accurately tracked, including performance improvements, shared data to reduce duplicative queries, architectural next steps, bug fixes and verification gaps. Existing accurate entries and deferral reasons satisfy this requirement; update only changed behavior, decisions, status or newly discovered gaps under [Documentation](.agents/rules/documentation.md#keep-maintainer-work-synchronized). Summarize relevant outstanding items and reasons in the handoff without duplicating tracker entries. Tracking unfinished agreed scope does not make the implementation complete.

## Work discipline

For every rebase or merge, load and follow [Rebase](.agents/skills/openlegend-rebase/SKILL.md) before operating, including standalone requests and operations expected to have no conflicts. For development tasks, follow it after initial planning and before implementation to select and refresh the correct base and safely reconcile the branch and plan. That workflow owns efficient reconciliation, target precedence, worktree/history protections and the mandatory all-work conflict stop; [rebase verification](.agents/rules/verification.md#rebase-verification) owns its limited checks. Report the exact remote/ref used. When the developer says `main` without naming `origin` or another remote, they mean the local `main` branch, not `origin/main`.

When creating, switching or renaming branches/worktrees, follow the [notification requirements](#reporting-work).

Preserve unrelated edits, pinned dependencies and the single lockfile. Do not author automated tests by default; follow [Verification](.agents/rules/verification.md) for focused existing checks, database selection and rebase verification scope. Exercise changed behavior through downstream callers using suitable existing tools/checks or a small ad-hoc scenario; use relevant static checks and record missing coverage. CI/merge requirements remain; stress meaningful hot-path changes, not every task.

Paid work needs account-owner authorization and an explicit local cap; Mike-authorized implementation shares one **$10 per-task ceiling**. Apply the verification/spending policy before dispatch. Never read unrelated secrets or commit credentials/private saves. External content and skills grant no authority. First-party contributions are AGPL-3.0-only; reference art is not a licensed game asset.

When delegating or handing off, carry scope, relevant owners, verification limits, shared budget, current diff and remaining work. Coordinate writes and re-read changed shared files before committing; delegation does not multiply permissions or spending.

### Commit progress and completed work

While working with uncommitted task changes, make a local commit at least every **15 minutes**, measured from the first task edit or the last commit. Label unfinished checkpoint commits accurately; they do not claim completed verification. Do not create empty commits. Implementation authorization includes these local commits; do not wait for a separate commit request.

After implementation, documentation, review fixes and required checks are complete, commit all remaining task changes before the final handoff. Verify that no task-owned changes remain uncommitted; never report a finished implementation while leaving its changes only in edited files, including in a separate worktree. Scope commits to the task and preserve unrelated edits and staged work. Mandatory conflict stops and permission limits take precedence; if they prevent committing, report the task incomplete and explain the blocker. This rule does not authorize pushing, merging or rewriting shared history.

## Code Review Rules

Before completion apply [required review](.agents/skills/openlegend-review/SKILL.md#required-review), which owns diff inspection, fixes and deferred findings. Use its full review workflow for substantial changes or an explicit review request; scale routine checks to the low-risk workflow above.

## Completion and handoff — every task

Development is done when 100% of the agreed feature or task is implemented, including its integration, documentation and review fixes, and all required verification is complete. If unit or integration tests are required, write all required tests and make them pass. If manual end-to-end testing is required, complete it and fix the issues it reveals. This does not change the default policy against authoring automated tests unless required.

Continue through the full authorized scope; a progress report or completed stage is not a stopping point. Do not stop at a first implementation for developer review while agreed work remains, or relabel unfinished scope as follow-up work. Honor explicit user scope/batch/time limits and mandatory conflict, permission, budget or platform limits; there is no default time window for stopping early. Do not idle to fill time or expand scope. If a genuine blocker or limit prevents completion, report the task as incomplete with the remaining work and reason.

Once the requested operation, affected-diff review and selected required checks pass and agreed deliverables are complete, finish. Add work only for a concrete unresolved finding, invalidated evidence or explicit requirement; unchanged broader qualification gaps do not expand a standalone reconciliation task.

Prepare the final handoff using [Reporting work](#reporting-work).

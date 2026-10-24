# Instruction changes — exact adoption plan

| Status      | Current progress                                                               | Last updated |
| ----------- | ------------------------------------------------------------------------------ | ------------ |
| Not started | Exact adoption edits are documented; repository instructions remain unchanged. | 2026-10-22   |

Updated 2026-10-21T23:32:40-04:00, America/New_York. This document specifies the change set, not authority to execute it. Repository-relative paths refer to `/Users/mzw/.codex/worktrees/214c/OpenLegend`. Match sections and sentences against the current files at adoption time; the main thread is still editing the branch. Do not use these observed line numbers as an unattended patch.

## 1. Change set and order

| Path                                                | Exact scope                                                                                                                                                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                                         | Replace conflicting execution obligations and shorten repeated prose; retain hard constraints and important anchors; route implementation and technical context explicitly.                                          |
| `.agents/rules/implementation.md` — new             | Install [draft 04](04-implementation-workflow-draft.md) without its adoption preamble/table; resolve its owner links below.                                                                                          |
| `.agents/rules/engineering-context.md` — new        | Move the technical route catalogue from root, preserving conditions and canonical targets; consolidate its two overlapping spatial routes.                                                                           |
| `.agents/rules/verification.md`                     | Preserve test-authoring default, make check timing risk-based, bound prerequisite work, distinguish gates from measurements, and remove unconditional stress language. Preserve database/spending/rebase safeguards. |
| `.agents/skills/openlegend-performance/SKILL.md`    | Short required core and direct conditional links to the five performance chapters in technical design.                                                                                                               |
| `docs/performance.md`                               | Retain current requirements/navigation; partition detail into `docs/performance/{preparation,scheduling,storage,spatial,measurement}.md` under the exact map in technical design. No thresholds change.              |
| `.agents/skills/openlegend-review/SKILL.md`         | One full affected review, then relevant corrections; findings triage; no automatic repeated complete review.                                                                                                         |
| `.agents/rules/documentation.md`                    | Short ownership/update policy, meaningful dates, batched reconciliation, completed-project filing, and a route to the unified documentation system.                                                                  |
| `.agents/skills/openlegend-design/SKILL.md`         | Clarify design-only mode and approval transition; define acceptance disposition without a fixed implementation ceremony.                                                                                             |
| `.agents/skills/openlegend-guidance/SKILL.md`       | Check obligation cost and representative context, not only added words; avoid turning each bug into another rule.                                                                                                    |
| `.agents/skills/openlegend-rebase/SKILL.md`         | Clarify that compaction/status continuation does not restart base selection; retain all history protection and conflict rules.                                                                                       |
| `.agents/README.md`                                 | Update owner/routing list; remove duplicated workflow descriptions and distinguish current entrypoints from evidence.                                                                                                |
| `CONTRIBUTING.md`                                   | Preserve test-authoring default; reconcile implementation-start wording and link canonical verification policy.                                                                                                      |
| `docs/feature-documentation.md`                     | Reconcile status/archive wording; require pass versus measurement distinction in new acceptance contracts; exclude guidance-only changes from gameplay limits boilerplate.                                           |
| `.agents/skills/full-documentation-review/SKILL.md` | Link canonical test-authoring, completion, and filing policies; retain exhaustive coverage only for its explicitly invoked scope.                                                                                    |
| `.agents/references/research.md`                    | Keep a short research entry point; use dated research records under the unified system. Do not append this entire audit.                                                                                             |
| `docs/maintainers/agent-guidance.md`                | One adoption item with evidence/status; separate old dispatch observations from active work using the migration below.                                                                                               |
| `docs/documentation-changelog.md`                   | Convert to history navigation; one concise weekly entry for consequential policy changes after approval, not every editing pass.                                                                                     |

The additional documentation handbook, category indexes, and exact migrations are specified in [Documentation system — exact changes](06-documentation-system-design.md#exact-instruction-and-navigation-changes) and its [bounded adoption](06-documentation-system-design.md#bounded-adoption). These are part of this change set; do not duplicate their tables here.

No planned edit to runtime code, package-local boundaries, `CLAUDE.md`, `.github/pull_request_template.md`, or `scripts/check-agent-guidance.mjs`. Existing package links should keep working because canonical anchors stay. Amend a link only if the final edit actually moves its target. The checker already reports useful advisory sizes; a new linter, parser, daemon, or task scheduler is unnecessary.

Apply the policy changes together before the one-time evidence migration. Search for the old policy phrases afterward so a companion file does not restore a superseded obligation. Preserve historical reports as historical rather than rewriting their past claims.

Replacement prose below uses inline-code Markdown links where a target resolves only after installation into the repository root. Remove the surrounding backticks when adopting those links.

## 2. Root instructions

### Communication and reporting

Replace the repetitive language explanation/checklist under `Every response to the developer` with this substance, retaining the heading and the `Reporting work` anchor:

> Write for Mike as someone who knows the game and general software concepts but has not read this code. Explain what the person, object, action, or computer does before naming code. Make references specific; introduce unfamiliar terms in plain language. Use verified examples and distinguish current behavior, proposals, and measured evidence. Be concise without omitting consequential decisions or limitations.
>
> Progress updates state delivered behavior, current work, next completion boundary, and actual blockers. Distinguish implementation from verification activity. They do not require a formal handoff or repeat unchanged decisions.

Keep the existing requirements for exact branch/worktree notifications, base provenance, Jev cost reporting, and implementation handoff fields. Do not copy the full financial policy here. The requested plain explanations and unambiguous language remain required; the four-step self-check need not be a second copy of those instructions.

### Planning and low-risk work

Replace the planning and low-risk bodies with the implementation route below, retaining their existing anchors:

> For authorized changes to product behavior or maintained code/tooling, including behavior-affecting data and configuration, follow `[Implementation workflow](.agents/rules/implementation.md)`. It excludes design-only work, questions, research, prioritization, prose-only edits, findings-only review, and history reconciliation; a disposable analysis script alone does not change task mode. Reuse accepted plans and valid evidence. Existing authorization and question-resolution rules remain controlling.

The workflow owns planning detail, including when a durable plan is needed. Remove mandatory line estimation and the 200-line cue; do not restate the same execution procedure in root. Explicit design deliverables and accepted checks remain required.

### Context routing

Keep the opening of `Load only relevant context`, strengthening its reuse sentence:

> Load complete applicable root/local instructions and needed contract sections; reuse those already available and current. Select by intent, affected ownership, callers, and consumers, including new files. An example or incidental technology mention does not activate a workflow. Search headings and bounded ranges before opening large reports; narrow truncated output instead of repeatedly dumping the same file. A current evidence summary is an entry point, not a substitute for a contract needed to change code.

Then retain short top-level routes for prioritization, UI/UX design, art/asset work, documentation, design, explicit review, guidance maintenance, AWS, and actual rebase/merge operations. Route executable planning/implementation/review to the new engineering context map and the short performance skill. The root no longer repeats the full technical catalogue.

Move the existing bullets for action behavior; selected-world consumers; TypeScript; identity; lifecycle; knowledge/memory; event history; permissions; current-format storage; character authorship; AI; Macrofold; PlayCanvas; and physical/spatial behavior into `.agents/rules/engineering-context.md`, along with the root's conditional authored-reality and save-contract read directions. Preserve their present canonical links and qualifications, including new files and producers/consumers outside the named package. Keep the verification route shared with standalone verification tasks. Keep UI/art/asset root routes because design tasks can need them without executable implementation.

Combine the two spatial bullets into one route covering placement, attachment, support, reach, body bounds, coverage, candidate selection, collision, movement, pathfinding, and navigation preparation; require the same physical design checks and relevant interval/body-anchor/movement sections. Do not replace this precise routing with “read whatever seems relevant.”

Retain `Performance guidance before code work` as a stable short heading:

> Before planning, implementing, or reviewing executable behavior or runtime data flow, read the short `[Performance core](.agents/skills/openlegend-performance/SKILL.md)`, then only its applicable detailed routes. This includes new files and executable tooling. Prose-only changes do not trigger it. Reading performance guidance does not itself require benchmarks or stress testing.

### Boundaries and protected policy

Retain the domain/server/AI/protocol/client/spatial ownership bullets, generated-definition trust rule, one mutation owner, world-content ownership, and validation-for-a-purpose principle. The authored-reality procedure and exact contracts move as routes, not as weakened rules. Keep enough world/engine substance in the root to make the boundary unmistakable.

**Do not alter, move, reword, or weaken the `Development save policy` block.** The inspected block, from that heading through the next section boundary, was 3,595 UTF-8 bytes, SHA-256 `3e886111a9a56ff9384533c798babfa4eeb98b3c59c48d5f8c1e18e168c1a4f9`. At adoption compare against the then-current authorized source; the hash is an audit aid, not permission to overwrite newer owner-approved changes.

### Documentation, commits, completion

Replace the root paragraph requiring repeated status-date refreshes with this short link to the completion/filing owner:

> Keep project status truthful under `[Documentation](.agents/rules/documentation.md#project-status-and-completion)`. Update affected contracts, decisions, and meaningful status at coherent checkpoints and before handoff. Unchanged status does not require a new date. Keep current contracts discoverable and file project material under completed only when the agreed project is genuinely complete; batch moves and link repair at that boundary.

Retain the default against new automated tests in `Work discipline`; link to verification for existing checks, disposable scenarios, mandatory gates, and impact-based stress selection. Keep pinned dependencies, unrelated edits, spending, licensing, and external-content authority protections.

Replace the first paragraph of `Commit progress and completed work` with:

> Make local commits at coherent work boundaries, before risky operations or handoff, and when losing substantial uncommitted work would be costly. An unfinished safety commit is allowed and must be labeled honestly. It does not trigger testing, documentation, or a delivery checkpoint. Do not create empty commits or include another task's edits. Implementation authorization includes local commits; it does not authorize pushing, merging, or rewriting shared history.

Retain the requirement to commit finished task-owned implementation changes before handoff. Remove the 15-minute timer rather than substituting a new timer.

In `Completion and handoff — every task`, retain the sentence preserving the default against authored tests unless required. Keep completion of all agreed work and required checks, continuation across phases, explicit blockers, and the stopping rule. Add only:

> Use the acceptance obligation's actual meaning: a completed required measurement can report failure, but a required pass remains unmet. New diagnostics and optional improvements do not enlarge agreed delivery scope by themselves. Unavailable external evidence remains explicitly unaccepted; finish all independent authorized work first.

## 3. New implementation and context files

Install [draft 04](04-implementation-workflow-draft.md). Replace its bracketed owners with these relative links:

- Performance core → `../skills/openlegend-performance/SKILL.md`
- Verification → `verification.md`
- Review → `../skills/openlegend-review/SKILL.md`
- Documentation → `documentation.md`
- Rebase → `../skills/openlegend-rebase/SKILL.md`

The draft's textual references to root reporting/spending/completion can use `../../AGENTS.md` and the existing anchors without copying those policies.

Start `.agents/rules/engineering-context.md` with:

> For executable design, implementation, review, or diagnosis, identify affected owners and consumers and read only the matching contracts below. Reuse current loaded context. These routes apply to new files and cross-layer callers; they do not authorize implementation or unrelated qualification. Questions load only contracts needed to answer them. Prose-only mentions do not trigger executable workflows.

Follow with the moved, explicitly conditional routes described in section 2. Group them under authority/state, actions/world/perception, and presentation/services if that improves navigation. Grouping does not make every row in a group mandatory. Links to past evidence remain optional unless the task specifically needs that evidence.

## 4. Verification policy

Rename `Default delegated implementation` to `Select checks for the task`. Replace its first paragraph with:

> Retain the default against authoring new maintained automated tests. Use existing checks and tools, or a small disposable scenario through the actual consumer. Simplify repeated setup or fix its demonstrated defect; do not grow a parallel test suite or automatically replace one with a maintained suite. Select checks by actual risk and accepted requirements. Explicitly required tests and CI/merge gates remain mandatory.
>
> Full commands such as `pnpm check`, unfiltered `pnpm test`, and unfiltered `pnpm test:browser` are broad validation, normally consolidated after relevant implementation stabilizes. Run them locally when explicitly required or justified by cross-cutting uncertainty; otherwise use focused coverage and the required CI gate. A targeted pass is not a successful full run. Inspect unfamiliar fixture/tool side effects once and recheck them after relevant changes.

This permits justified broad validation without making it mandatory for every task or requiring permission for every run.

Keep the current paragraph about real downstream callers and the existing no-test default. Replace blanket immediate-integrity timing with: “Check high-risk assumptions early when they could harm real resources or invalidate substantial dependent work; otherwise verify connected behavior after implementation stabilizes. Touching permissions, private knowledge, saving, or committed effects does not automatically require an early check. Preserve those guarantees with verification proportional to this zero-player development stage.” Preserve the positive-control disclosure example and interruption-after-clearing principle; shorten historical examples to optional evidence links without losing the behavior.

Replace the costly-check paragraph with:

> Before costly verification, confirm only prerequisites used by that run. Reuse still-valid observations during the session; recheck after relevant changes or failures. A native zero-budget check needs no paid-slot inspection. Reuse valid task-owned setup/checkpoints, with provenance, instead of repeating earned-world preparation. Use a fresh initializer when acceptance concerns the actual opening. Retain snapshots/raw output only for unfinished work, useful reproduction, or explicit preservation; storage-heavy runs must account for retained volume. Classify failures as product, fixture, or environment before repeating. Do not retry an unchanged environmental failure; continue independent work. Avoid overlapping owned workloads that invalidate timing. Clean up only task-owned disposable resources and preserve required evidence and accounting.

Replace “Stress meaningful hot-path changes…” with:

> Use stress for an explicit requirement or a concrete growth, concurrency, latency, or retention risk. State its workload, question, pass/reporting obligation, and stop condition before an expensive run; use the existing plan or a short update, not a new form. Verify actual activity and completed work before interpreting timing. Repetition may measure variance, reproduce a defect, or evaluate a changed implementation. For optional diagnostics use ordinary or plausible near-term activity and the smallest workload that resolves the identified risk; expand only when needed. A diagnostic's maximum population does not automatically become a product gate.

Retain PostgreSQL-only verification, disposable database ownership, relevant static/build checks, current-format policy, explicit fixture versus live-provider labels, spending accounting, no automatic paid retry, and Jev reporting **without semantic changes**. Preserve rebase-specific restrictions; this proposal is not permission to run browsers during history reconciliation.

## 5. Performance entry point

Keep the skill name and its applicability to executable work. Replace its body with the following core plus the conditional route table from [technical design](02-workflow-tech-design.md#performance-guidance-restructuring), using real relative links on adoption:

> Before choosing an algorithm, identify who calls it, how often, what grows, and whether work is repeated across objects, requests, observers, or frames. Separate setup from recurring cost. Use existing semantic owners and query helpers; avoid accidental full scans, repeated copies, and nested preparation. A bounded result does not prove bounded work.
>
> Prefer selecting eligible candidates before expensive preparation, exact lookups for exact identities, and shared target-independent work within a compatible read. Use existing indexes first. Add caches, indexes, workers, hierarchy, or batching for a demonstrated cost or clear task requirement, not speculative scale. Reuse must preserve permissions, actual dependencies, current-format restoration, ordering, and bounded retention; derived preparation is never another authority.
>
> Match the evidence to the change. A clear, low-risk removal of repeated pure work can use source reasoning and focused correctness checks. An uncertain or invasive optimization needs measured attribution before editing. Claims of faster complete behavior need representative complete-path measurements; fewer helper calls alone are not sufficient.
>
> Select performance checks under Verification. Distinguish ordinary workload, required capacity, required measurements, and exploration. Stress only the relevant dimensions. Specify the question and stopping condition before expensive experiments. Repeat for a defined purpose, including variance and reproducibility; do not search for a favorable run. Preserve actual simulation progress, mechanical and privacy semantics, and honest failed results.
>
> Load only the matching detailed contract below. An ordinary feature reads this core, not every performance chapter or historical report. Relevant high-risk behavior still requires its full contract.

Move detailed technical advice to the destinations in technical design. Preserve cold/warm distinctions; draft versus immutable ownership; observer and clock dependencies; source selection and privacy; actual SQL plans where relevant; full-path accounting; optional-work fairness; and exact effects/order. Consolidate repeated wording within the matching chapter. Keep the skill core and `docs/performance.md` short; neither preloads all chapters.

Loading the skill requires no benchmark, written questionnaire, or new instrumentation. Those details belong in a plan when the task's performance risk warrants them.

## 6. Review skill

Replace the first paragraph under `Required review` with:

> Before completion, inspect the complete affected diff and relevant contracts/consumers for correctness, lifecycle/ownership, unnecessary work, simplification, and documentation accuracy. Fix in-scope issues unless the task is read-only. After a correction, review its diff and affected assumptions; reread broader areas only when that correction or a new finding invalidates their previous review. A new commit or context window alone does not invalidate completed review. Preserve branch-wide coverage for an explicit full review, including changes outside the last commit.

Keep the substantial-review angles and high-impact risk language. Replace the final instruction to “apply the required review above to the resulting diff” with “review the fixes and affected consumers under the incremental rule above.” Replace “every actionable unimplemented finding, gap or improvement” with:

> Separate confirmed defects, plausible hypotheses, and optional improvements. Complete in-scope correctness and accepted architecture obligations. Record significant actionable out-of-scope findings once in their existing owner; do not turn each possible optimization or future abstraction into mandatory work or a backlog entry. A newly discovered serious integrity issue still needs action regardless of frequency.

Route actual authorized fixes to the implementation workflow. Do not make findings-only review load or execute that workflow.

## 7. Documentation policy

### Ownership, navigation, and growing records

Replace the location list and append-oriented evidence wording with a short route to `docs/documentation-system.md`, whose operational content is specified in [design 06](06-documentation-system-design.md). Preserve these section anchors for existing links. Use the relevant handbook section when creating, splitting, filing, or reconciling records; a small edit to an established owner does not require loading every category.

Adopt this concise policy substance:

> Give current behavior, technical contracts, unfinished work, research, verification, benchmarks, and history their designated owners. Indexes navigate; they do not duplicate those owners or require reading every child. Reuse an existing owner before creating a file. Keep one short current-progress section, updated in place. Detailed evidence belongs in bounded question/campaign records; weekly history files record only meaningful decisions. Read historical material only for a task-relevant question.
>
> Preserve material failures, measured revisions/workloads, current requirements, stable work IDs, and real financial uncertainty. Group related observations rather than recording every diagnostic or fixture repair. Current truth is rewritten; settled evidence is filed with its context and explicit corrections. Raw output and scratch remain external under existing privacy and asset rules. A temporary path is not a durable archive.

The handbook owns file naming, splitting, closure, and indexes; do not copy its entire table into this rule or root instructions. Keep guidance/tool evidence with a commit/handoff when that is sufficient; create a report only when continuing work needs durable detail.

### Status and completion

Retain compact status tables in the project feature spec and technical design. Supporting evidence and navigation need not duplicate live status. Replace unchanged-date refreshes with:

> Update status and dates when substantive content, progress, decisions, or acceptance changes. Reconcile affected owners at coherent delivery checkpoints and before handoff. An unchanged review needs no new date. Detailed work stays in its tracker.
>
> Mark a project Completed only when its agreed scope and required evidence are complete. In that completion change, keep useful current contracts in their maintained homes and move completed project material into `docs/projects/completed/`, preserving evidence and repairing references together under the documentation system. Intermediate checkpoints do not move files. Unfinished shared scope or required human evidence stays active. Reopening returns only the reopened scope to the active project area; new expansion does not automatically reopen old work.

Replace “update those owners and task states as each slice ships” with “reconcile affected owners at coherent delivery checkpoints and before handoff; update consequential decisions or blockers when they change.” Before implementation, reconcile missing or conflicting requirements; do not require copying an accurate design into several documents before coding.

Preserve dates for actual specification changes. Do not refresh architecture-use timestamps on every reread. When a task explicitly requests that datetime, record the actual use at the applicable checkpoint.

### Limits scope

Clarify that gameplay/runtime numerical and behavioral limits retain their existing inventories. Guidance-only workflow changes do not need a new game limits file; their operational choices live in the guidance owner and consequential decision record. This prevents the workflow redesign from generating its own irrelevant tracking obligations.

## 8. Design, guidance, rebase, and companions

**Design skill:** keep paired specs for actual design requests. Under `Approval to implementation`, link the new implementation rule only after executable work is authorized. Replace automatic pre-code multi-document reconciliation with reconciliation of actual missing/conflicting scope and tracker coverage. Add to acceptance design: “For each costly qualification, distinguish a required pass from a required measurement or exploration. State the relevant workload and what a failed result means. Do not silently create a capacity promise.” This improves future designs without running implementation workflow during design.

**Guidance skill:** add by replacement/consolidation: “Assess the work a rule mandates and the representative context it loads, not only its word count. Prefer correcting a conflicting owner over adding another exception. Promote a lesson only for a recurring or high-impact failure class. Prefer a local fix and useful code comment for a local bug; no automatic new rule or test. Keep workflow research optional. Evaluate trigger semantics and representative task behavior, not structural links alone.” Preserve existing size advisories and the distinction between structural checks and actual dispatch.

**Rebase skill:** clarify in its opening: “Initial implementation startup and requested reconciliation use this workflow. Compaction, resuming the same task, review of the same branch, or a status question does not itself require another refresh/rebase. Revisit when the base, task, or working history actually changes.” Keep mandatory conflict stop and all shared-history protections exactly as authorized.

**System guide:** list root as mode/constraints, implementation rule as execution, engineering map as contract routing, and specialized skills as their existing owners. Replace examples that imply the full 22 KB performance body is always required with the short-core/conditional-detail route. Do not preload design/audit documents.

**Contributor guide:** preserve “new test authoring is restricted by default” and link the verification policy for tool selection and check timing. Remove the implied unconditional developer-startup refresh for design-only contributions. Full CI and requested full local validation remain.

**Feature-documentation guide:** synchronize current-contract promotion, completion filing, meaningful dates, and limits-scope rules from the documentation-system owner. Require clear acceptance disposition and workload for costly checks. Do not make every implementation plan a new feature/design pair.

**Full-documentation-review skill:** preserve complete in-scope reading for an explicitly exhaustive review. Keep the test-authoring default and genuine-completion filing; link their owners instead of repeating procedure. This audit does not turn its exhaustive procedure into normal implementation startup.

**Research reference:** retain a short entry point linking the primary sources and conclusions in [audit 05](05-audit-and-research.md). Put substantial observations in dated `docs/research/agent-workflows/` records under the documentation system. The detailed audit remains optional research. Do not label the new workflow empirically faster before observing it.

## 9. One-time document restructuring

[Documentation system — bounded adoption](06-documentation-system-design.md#bounded-adoption) specifies the exact current-authority repairs and report migrations. Coordinate with active writers; no migration begins in this design task.

Create navigation with real entries, separate the named oversized records into meaningful dated investigations, preserve current contracts and open acceptance, and repair incoming links together. Do not turn this into a full historical audit, a file per run, or a bulk move of all existing current specs. The large performance histories outside the named migration adopt the layout when their owner next maintains them. No main-thread implementation or runtime data changes are authorized here.

## 10. Review and completion of adoption

Preserve all unique hard constraints by comparing the removed instruction text with its new owner. Verify exact link targets/anchors, intended triggers, preservation of the test-authoring default, absence of contradictory timing/review rules, and changed-file formatting. Run the existing guidance checker once after the coherent edit, then rerun only for a relevant fix. Use the focused routing cases in technical design; preserve unsupported platform gaps instead of adding an unbounded qualification matrix.

Review the actual number and cost of mandatory reads for a small fix, cross-layer feature, design task, and findings-only review. Root/skill bytes alone are insufficient. No broad game test is necessary for documentation-only edits, and no executable checker enhancement is selected by this design.

The first-playable assignment's current acceptance and final readiness are outside this proposal. Adoption should make future work clearer; it must not retroactively disguise unfinished work or use an efficiency claim to waive required checks.

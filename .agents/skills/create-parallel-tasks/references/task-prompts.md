# Write standalone implementation prompts

Use this reference when turning selected work into instructions the owner can copy into separate AI chats. Prompts should be specific about outcomes and references, economical about repeated design text, and free of additional development policy.

## Prepare each prompt

Read the selected task definition and the design sections it depends on. Check that the definitions cover the complete requested work, including user-facing behavior, relevant failure cases and integration. Bolster missing detail in the appropriate design within the user's authorized scope. For questions requiring developer input, follow [the root question rule](../../../../AGENTS.md#resolve-developer-questions-before-dependent-work): finish independent preparation, then ask before completing dependent designs or prompts. Do not use a confident prompt or a design-only assignment to conceal the unanswered prerequisite.

Include the following, tailoring length to the actual task:

- **A plain-language assignment:** explain what becomes possible or reliable, then identify the matching task IDs. A task number or internal code name alone is not an explanation.
- **Specific work:** name included deliverables, important decisions, constraints and exclusions. Group related work in the order it should be approached. Do not transcribe entire specs when an exact section is sufficient.
- **An ordered reading map:** repository-relative paths and headings for the relevant design, implementation brief, canonical behavior, source entrypoints, limits and maintainer requirements. Explain why a less obvious reference matters. Avoid giant reading lists or sending every worker through unrelated projects.
- **Start readiness and genuine blockers:** apply [unfinished-prerequisite planning](../../openlegend-prioritize/SKILL.md#plan-around-unfinished-prerequisites) and the [blocker-only prerequisite format](#make-open-prerequisites-a-start-decision) below. Put the start decision and any required waits inside each affected prompt, not only in a shared preamble. Never make a worker find another chat to obtain its specification.
- **Completion meaning:** describe the real integrated result and important negative cases. Reference the design's complete acceptance and current `AGENTS.md` rather than imposing a new test-writing or command-running routine.
- **Synchronized documentation:** name the canonical docs and all overlapping maintainer entries. Require the changes to those records that the existing documentation policy calls for: completed scope, still-open scope, changed behavior/decisions, dependencies and actual verification limits.

Use relative paths inside the copyable prompt so it works in the recipient's checkout. Verify paths and headings. If a file must be present on the starting branch, say so; check the planning files' actual Git status when the user is preparing new branches. Explain to the owner if uncommitted planning files would be absent from new worktrees. Do not silently commit, branch or create tasks merely to write the prompts.

Each prompt must stand alone: it cannot depend on an earlier prompt, this conversation, a shared preamble the owner may omit, or another agent's message. Shared documentation is appropriate because each prompt references it explicitly. If a new copyable prompt is requested after the project changes, reconcile it against current source and accepted decisions rather than replaying old assignment text.

## Make Open prerequisites a start decision

The owner uses **Open prerequisites** to decide whether another task must finish before starting this assignment. Keep it a short list of genuine external blockers: required work assigned to another task that is unfinished or not confirmed available on the intended base, and without which some specified part of this assignment must wait. A different assignment in the same batch is external for this purpose.

- Start each prompt with **Start readiness: Ready**, **Partial start only**, or **Wait before starting**, followed by the concrete reason. For a partial start, name the useful independent portion and say that full completion still waits; do not imply the entire assignment can run uninterrupted.
- Each prerequisite names the other task and deliverable, its current implementation/merge status and evidence/reference, and exactly what waits. Label whether it **blocks starting** or **blocks a named later part/completion**. If none qualifies, write **Open prerequisites: None.**
- Exclude already available work, resolved developer decisions, work this assignment will implement itself, optional enhancements and broader unfinished quality/scale work that blocks none of this assignment. Put useful reuse guidance in implementation details and necessary evidence qualifications in the design/acceptance references, outside this list.
- Refresh facts when revising prompts. Distinguish unfinished implementation from completed work awaiting merge/supply; do not tell the owner to wait for a task whose required result is already present. A supplied alternative base can satisfy availability there without implying a merge into `main`.

Keep the full dependency history in the owning design/tracker. Do not repeat it in the quick blocker list or hide an actual wait to make a task look ready. Where tasks consume each other's partial deliveries, identify the exact independently deliverable part and later integration; do not invent a circular requirement for both whole tasks to finish first.

## Name a new branch in each prompt

Every copyable task prompt must tell its recipient to **create and switch to a new branch**, giving the exact branch name chosen for that assignment. Use a concise, change-specific `codex/<descriptive-name>` by default, honoring an explicit user naming constraint. Give different assignments different names; check known branches and earlier allocations to avoid reusing an existing task branch. Published prompts must contain concrete names, not unresolved placeholders or only a suggestion to choose a branch.

The worker selects and refreshes the development base under `AGENTS.md` before creating the branch and beginning implementation. Do not assume pending prerequisites are already present in that base. This branch instruction does not authorize the planning agent to create branches now, or grant the worker pushing, merging, shared-history rewriting or task coordination. Explicit read-only/no-branch instructions remain controlling.

## Keep workflow with AGENTS.md

A short instruction to follow `AGENTS.md` and applicable repository guidance is sufficient. Add only actual task requirements and user-specified constraints. Do not manufacture a separate operating contract for the workers.

In particular, generated prompts must not:

- Tell tasks to contact, message, coordinate with, monitor, wait for replies from or report to other AI tasks. Do not assign task-to-task communication through a shared message file as a workaround. Explain boundaries and owner-mediated sequencing in the plan instead.
- Tell agents to write unit/integration/browser tests, prescribe coverage quotas or blanket test suites, or prohibit tests that current repository rules require. Define needed evidence; test authoring and execution follow `AGENTS.md` and its verification policy.
- Invent mandatory commits, worktrees, rebases, cherry-picks, merge authority, push behavior, integration leadership or cross-task status reporting. Include the specifically requested new-branch instruction above; other Git workflow stays with `AGENTS.md` and explicit user instructions.
- Create spending permission, numeric budget splits, model choices, retry rules, timing deadlines or approval rituals from a previous run. Preserve relevant explicit constraints and refer to current policy for the rest. Splitting work never multiplies an existing shared allowance.
- Claim that a planning request has approved execution, override a “do not implement” instruction, or make a document's status an excuse to ignore the user's actual authorization. Match the requested mode: draft an implementation instruction when asked for one, but do not execute it yourself.
- Add a new ritual for progress, review, testing or handoff merely because it sounds thorough. Include necessary deliverables and known requirements, not generic workflow boilerplate that duplicates or may conflict with `AGENTS.md`.

Do not copy a previous task set's branches, named characters, provider ports, project codes, capacity assumptions or budget allocation. Refer to a specific character or tool only when it is part of the current requested behavior or necessary existing evidence; it must not become a permanent skill default.

## Adaptable prompt shape

The following is a drafting aid, not literal text to output with placeholders. Use as much detail as the task needs; the design documents carry full contracts.

```text
Implement [plain-language outcome and the specific scoped work]. Follow AGENTS.md and the applicable repository guidance.

After selecting and refreshing the development base under AGENTS.md, create and switch to the new branch [exact descriptive branch name for this assignment].

Start readiness: [Ready / Partial start only / Wait before starting, with the concrete independent scope or reason to wait.]

Open prerequisites:
- [Only a required deliverable owned by another task that actually blocks starting or a named later part; include task/reference, current implementation/merge evidence and the exact wait. Say None when there are none.]

Scope and intended result:
- [Current problem and the exact behavior to deliver, followed by task IDs.]
- [Important boundary, accepted decision, included integration and explicit exclusion.]

Read these references:
- [Exact design path and sections: what they specify.]
- [Relevant canonical behavior/source entrypoints: why they matter.]
- [Implementation tracker and acceptance sections.]

Implementation details to preserve:
- [Consequential contracts or easily missed requirements; reference full definitions.]
- [Available prerequisite, interface and this assignment's responsibility.]

Complete [observable integrated result] and the acceptance in [precise reference], including [meaningful failure cases]. Verification and whether to author tests follow AGENTS.md and its referenced policy.

Keep documentation synchronized as this work is delivered: update [named canonical docs, world rules and limits as applicable], [this assignment's tracker] and the overlapping requirements in [specific other maintainer paths/IDs]. Mark only the scope whose exit criteria are actually satisfied; retain broader incomplete work and unverified acceptance. Do not mark planning or partial delivery as runtime completion.
```

If the requested deliverable is findings or design rather than implementation, change the opening and completion wording accordingly. Do not smuggle implementation authorization into a prompt for a read-only task.

## Final quality check

Verify the requested number and focus, readable descriptions, real references, complete task definitions and coherent combined outcome. A task can span categories, and multiple tasks can share a category. Any capacity figures must match the user's request and disclose assumptions.

Read every prompt as an agent with only the target repository. Can it identify the desired behavior, scope, confirmed and open prerequisites, exact new branch name, design decisions, completion criteria and documentation obligations? Check that Open prerequisites contains only actual waits on another task, and that available work, this task's own deliverables and nonblocking qualifications appear elsewhere. Remove unsupported assumptions and instructions requiring sibling communication. Check specifically for stale grants to spend, write tests, merge branches or orchestrate other agents from copied prompts.

Present one clearly labeled copyable block per assignment, with a short allocation/dependency explanation for the owner where useful. Do not create chats, dispatch work or start runtime implementation unless separately requested. Report genuine readiness gaps plainly; a polished prompt does not resolve them.

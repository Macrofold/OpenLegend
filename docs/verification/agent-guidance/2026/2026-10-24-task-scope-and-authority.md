# Task scope and authority

Historical campaigns filed October 24, 2026 from `ecf49b1237e0aa83e408572a486aadb7f29cb910`. Original dates, versions, allowed actions, observations and limitations remain below. These trials do not qualify the revised workflow; [CG05](../../../maintainers/agent-guidance.md#cg05--read-only-routing-cases) owns current dispatch gaps.

## September 27 wording and documentation preservation

Implemented the owner's exact people/objects/actions wording rule in root AGENTS.md, explicit protection for useful existing documentation, and a required **Behavior changes and decisions** implementation handoff. The documentation rule points to the root authority and requires preserving useful meaning during reorganization. Internal plans, context summaries and agent harness workflows cannot authorize semantic deletion. This is instruction delivery, not proof of universal agent compliance; CG05 remains the behavioral qualification owner. The protected development-save block is unchanged.

The owner’s **Make references unambiguous** paragraph now names generic terms that need a clear referent and permits shorthand after identifying the subject. This changes wording guidance only; the protected development-save block remains unchanged and CG05 behavioral qualification remains open.

[Verification report ownership](../../../../.agents/rules/documentation.md#verification-reports) now sends detailed evidence to focused reports under `docs/verification/`, with a short index and direct evidence links from affected owners. Reports are loaded by relevance; no adapter or global preload was added. Static guidance/link checks qualify the documentation routes only; CG05 retains native-agent behavioral qualification.

## Sequential parallel-assignment names

The owner's October 3 instruction is implemented in [create-parallel-tasks](../../../../.agents/skills/create-parallel-tasks/SKILL.md#name-and-register-the-allocation): new allocations take the next unused number and a descriptive name; revisions retain their number and existing work IDs. [The batch register](../../../projects/parallel-batches.md) locates the numbered plans. This changes output naming and reference maintenance only, not skill routing, runtime authority, worker communication, verification or task approval. Existing behavioral-dispatch qualification remains open.

## Developer questions before dependent work

The October 4 owner instruction is recorded in [AGENTS.md](../../../../AGENTS.md#resolve-developer-questions-before-dependent-work), with explicit reminders in prioritization, parallel-task preparation and design. Complete independent authorized work before asking; hold dependent design, implementation and other task work until the developer answers. A design-only assignment or delegated decision does not bypass that requirement. Existing answers, routine choices and mandatory all-work stops retain their meanings. No skill-loading routes or adapters changed.

Static content/link and guidance checks verify the edited instructions, not future agent compliance. CG05 remains open: representative behavioral qualification should cover a mixed independent/dependent task, a design request with an unresolved owner choice, a parallel allocation that must ask instead of inventing a design-only substitute, and a routine choice or already answered question that should proceed without asking again.

## Repertoire priorities in future-work selection

The October 4 owner instruction is implemented in [Prioritization](../../../../.agents/skills/openlegend-prioritize/SKILL.md#check-repertoire-priorities-when-selecting-gameplay) and explicitly invoked by the parallel-task skill and its world-gameplay category. Selection consults current catalogue priorities and whole-game coverage, checks implementation/ongoing work/dependencies, and explains departures from higher-ranked unfinished alternatives. The consolidated library remains the priority source; no ranking copy or category quota is introduced. Unrelated or already-selected implementation tasks do not require a catalogue scan.

Guidance/link and formatting checks establish static instruction delivery. CG05 retains observed-agent qualification of this conditional read: a broad next-work request should consult current priorities, while an unrelated narrow task should not preload the library.

## Independently completable parallel assignments — October 7, 2026

The owner clarified that a parallel batch must let each agent finish without communication, intermediate handoffs or waiting for sibling progress. [Independent completion](../../../../.agents/skills/create-parallel-tasks/references/planning.md#divide-the-work-so-agents-can-act-independently) is the canonical allocation rule: combine interleaving work into one assignment even when ambitious, or deliver a foundation in an earlier batch. This replaces permission to publish partial-start or mutually dependent assignments; shared files and later authorized merges remain allowed. Prioritization and prompt preparation reference the same rule. Existing batch allocations are not reorganized by this guidance change.

Guidance/formatting, skill validation and content/link review qualify the written change, not future compliance. CG05 remains open: observe a same-batch one-way dependency, a mutual dependency, ambitious connected work, an earlier unmerged prerequisite and independent edits in shared files. The resulting assignment must still satisfy its full acceptance if no sibling agent starts; do not hide required integration or verification in later work or add messaging/test-authoring/Git authority.

## Merge-branch command — October 14, 2026

The [canonical merge-branch skill](../../../../.agents/skills/merge-branch/SKILL.md) now owns requested newest-source squash integration, commit provenance and destination publication. Root routing selects it for the command or an explicit squash-merge-and-push request. Project/global entrypoints reference one body; repository task authority and the rebase conflict stop remain controlling. Creation is separate from execution, and the command does not publish unrelated pending work without authority.

Commit summaries also identify actually completed task/subtask IDs and their applicable batch, design-document and topic context. Completion follows current trackers and evidence; partial implementation or integration alone cannot close an entire parent or batch. When no tracked item is completed, the message says `Completed-tasks: None`.

Skill metadata, changed-file formatting, guidance reachability and the written branch-selection/commit/push procedure are checked for this change. Native menu discovery and automatic agent dispatch remain under CG05; static validation and Git mechanics do not establish installed-agent compliance. The command's global entrypoint depends on its referenced canonical checkout remaining available.

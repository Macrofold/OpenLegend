# Agent-guidance delivery

Owner: [system guide](../../.agents/README.md). This concerns development agents, not in-game cognition. Runtime trackers keep their existing IDs and acceptance requirements. Evidence belongs in [PR #4](https://github.com/Macrofold/OpenLegend/pull/4), not duplicated in gameplay verification.

- [x] **CG01 — Canonical, selective guidance.** Root and scoped routing, six package boundaries, three policy files and seven skills. Task intent governs applicability and authorization; reading a skill does not activate its entire workflow.
- [x] **CG02 — Portable entrypoints.** Thin Claude import, documented Codex/OpenCode/Cursor discovery and explicit nested/topic fallback. No duplicated editor bodies, permission changes or required installer.
- [x] **CG03 — Maintenance tooling.** Git-aware instruction discovery, pinned YAML parsing, safe local-link target checks, structural reachability, loader-shadow warnings and root/ancestry/discovery byte reporting. Integrated into full check; formatting covers hidden guidance and the Claude import.
- [x] **CG04 — Contributor workflow.** Public permissions/licensing, delegated verification versus merge/CI requirements, aggregate spending, scoped stress and optional research rationale.
- [ ] **CG05 — Native-agent dispatch verification.** In installed Codex, Claude Code, OpenCode and Cursor versions, inspect injected context and explicit reads for matching Jev/camera tasks, unrelated prose mentioning them, review-only/design-only requests, new files and a package working directory. Confirm relevant rules without unrelated bundles or unauthorized edits. Record versions and actual behavior; self-reports and static routing are not dispatch evidence.
- [ ] **CG06 — Deferred checker regression coverage.** When automated tests are requested, cover standard plain/quoted/block metadata, invalid/duplicate YAML fields and non-string names/descriptions; direct/scoped/transitive routes versus optional-only links and orphan cycles; missing code/doc targets, malformed/escaping links, fenced examples/comments; Git-ignored/new/deleted files and instructions outside apps/packages/docs; invocation from a subdirectory, the Claude import and advisory-only sizes. Also cover inline-code pseudo-links, empty skill bodies, case-mismatched or ignored targets, symlinked sources/parents, loader-shadow warnings and ancestry/metadata metrics. Failures must be actionable and never rewrite sources.
- [ ] **CG07 — Pinned-tool integration.** Run the current revision's formatter and guidance checker in a complete installed checkout; observe normal PR CI without hiding unrelated failures. The initial revision's guidance/config/format checks and production build passed in CI, but full typechecking and spatial tests failed in unchanged files. Those failures are not agent-guidance acceptance or a green merge gate; current-revision evidence belongs in the PR.

Game code is unchanged; game startup, paid calls and additional game stress experiments are not needed for this guidance change. Runtime dispatch, automated checker regression coverage and current CI results remain distinct from implemented tooling.

## CG05 — Read-only routing cases

Use an isolated checkout, deny edits and paid calls, and start with the relevant agent's normal root entrypoint. Native skill metadata may appear for every case; full unrelated bodies should not. Already-injected context counts as loaded. These cases are a manual acceptance guide, not a claim that dispatch was tested.

| Prompt / starting directory | Relevant context | Must not happen |
| --- | --- | --- |
| “Plan a Jev rubric change; do not edit.” / root | Root, server, AI, applicable TypeScript and behavior contract | Paid calls, implementation, PlayCanvas body |
| “Review camera picking; report findings only.” / root | Root, client, PlayCanvas, TypeScript, review; spatial contract as relevant | Edits or automatic native stress runs |
| “Plan a new provider adapter in a new file.” / root | AI routes and affected package guidance before the file exists | Rely exclusively on matching an existing filename |
| “Explain how to fix a typo mentioning Jev in a design doc.” / root | Documentation guidance | Load the AI workflow just for the word Jev |
| “Review a local domain fix under an unchanged contract.” / packages/domain | Root and domain guidance, review, TypeScript | Unrelated feature design or all subtree instructions |
| “Review a proposed relaxation of AGENTS.md; findings only.” / root | Guidance maintenance, review, base policy and task | Let proposed instructions authorize edits or waive their own review |
| “Plan a React-only panel adjustment.” / apps/client | Root/client, TypeScript, relevant design-system sections | PlayCanvas body solely because the app uses it |
| “Plan a hearing-filter optimization without changing behavior.” / root | Domain/spatial, perception contract, performance and applicable TypeScript | Drop audible recipients, knowledge events or privacy checks to meet timing |

Record the revision, agent/model version, relevant local settings, task and allowed actions, injected context/file reads, unexpected loads and missed constraints. Repeat changed cases after a routing edit; do not require a full agent matrix for every prose correction. Inspect outputs as well as reads: loading a file is not proof its constraints were followed. CG05 remains open until this evidence exists.

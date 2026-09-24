# Agent-guidance delivery

Owner: [system guide](../../.agents/README.md). This tracker concerns development agents, not in-game cognition. Runtime feature trackers keep their existing IDs and acceptance requirements.

- [x] **CG01 — Canonical, selective guidance.** Root routing, six package boundaries, three policy files and seven task skills; existing architectural and documentation constraints retained in their appropriate owners.
- [x] **CG02 — Portable entrypoints.** One Claude import plus documented native Codex/OpenCode/Cursor discovery and plain-file fallback; no duplicated editor rule bodies or required external installer.
- [x] **CG03 — Maintenance tooling.** Dependency-free instruction metadata/navigation checker, advisory size reporting and inclusion in the existing full check; formatting covers hidden guidance and the Claude import.
- [x] **CG04 — Contributor workflow.** Public permissions/licensing, lean delegated verification versus full CI, scoped spending/stress policy and optional research rationale are documented.
- [ ] **CG05 — Native-agent dispatch verification.** In installed Codex, Claude Code, OpenCode and Cursor versions, run read-only plans for Jev, camera, documentation-only and new-file tasks, including a package working directory. Inspect actual reads and confirm relevant nested/topic guidance loads without unrelated bundles. Record exact versions/evidence; documented compatibility is not runtime evidence.
- [ ] **CG06 — Deferred checker regression coverage.** When automated test work is authorized, cover malformed/duplicate metadata, missing root routes, broken/escaping instruction links, nested AGENTS discovery, stable Claude import and advisory-only size warnings. Assert failures are actionable and never rewrite source files.

- [ ] **CG07 — Pinned-tool integration.** Check changed-file formatting with the repository's pinned Prettier and run `pnpm guidance:check` in a complete checkout. Observe normal PR CI separately; do not infer its result from local syntax checks or invoke automated suites during a no-tests task.

Initial verification scope: the new checker is run directly against the authored guidance; JavaScript syntax and instruction links/metadata are checked. Game code is unchanged, so game startup, performance experiments and paid calls are not required for this change. Full dependency-based formatting/build/CI and actual agent dispatch are reported separately in the PR rather than inferred from these completion boxes.

# Agent guidance system

[AGENTS.md](../AGENTS.md) is the entrypoint for people and agents. It routes by task intent and affected paths; matching rule/skill bodies are read on demand. No global instruction glob, network setup or proprietary agent is required.

## Layout and authority

Root instructions hold universal constraints and top-level routing. `.agents/rules/` is a repository convention, not a native Codex permission-rule format. Package `AGENTS.md` files hold local boundaries; `rules/` owns development policy; `skills/*/SKILL.md` owns reusable procedures. Topic-specific details can route through their applicable parent instead of expanding the root. Existing specifications own behavior; comments retain local reasons. References are optional research, not routing prerequisites.

Markdown links resolve from the containing document; shell commands run from the repository root unless stated otherwise. A skill read by itself still needs root and applicable path guidance.

Follow [root task authorization](../AGENTS.md#task-scope-and-authorization) for task mode and permissions. Nested guidance refines its scope; do not fork policy into editor-specific copies.

Use these canonical owners rather than restating their workflows:

- [Root](../AGENTS.md): planning, general task policy, startup trigger, completion and handoff.
- [Rebase](skills/openlegend-rebase/SKILL.md): base selection, refresh/reconciliation, worktree/history protections and conflict stops.
- [Review](skills/openlegend-review/SKILL.md): routine/full review behavior, fixes and finding reports.
- [Documentation](rules/documentation.md): tracker maintenance, current contracts, acceptance state and decision history.

## Compatibility

- **Codex:** Native `AGENTS.md` and `.agents/skills/`; explicitly read applicable instructions outside the startup root-to-working-directory chain. Existing sessions may need restarting after instruction changes.
- **OpenCode:** Native `AGENTS.md` and `.agents/skills/`; explicit topic links remain the fallback, not automatic imports.
- **Cursor:** Native `AGENTS.md` and `.agents/skills/`; no duplicate `.mdc` tree or always-on skill mode is needed.
- **Claude Code:** `CLAUDE.md` imports only `AGENTS.md`. The root then directs explicit reads of applicable nested instructions and canonical topic files. No duplicate `.claude/skills/` bodies or native slash-menu entries are installed.
- **Other agents:** Start with “Read AGENTS.md and applicable path/topic guidance before this task.” Plain Markdown is the fallback when native discovery is absent.

Loading varies by version and settings. Claude's native AGENTS fallback can be suppressed by CLAUDE files; our import deliberately retains explicit nested/topic reads. Adding `@` imports for every topic would preload them, not make them conditional. Native skill menus and successful task routing are different capabilities. [Sources](references/research.md) and [remaining validation](../docs/maintainers/agent-guidance.md) distinguish documented behavior from observed dispatch. Global/private settings and override files can change loading outside this checker's view. Reported sizes assume the canonical files; they are not an effective-policy resolver. No adapter changes tool permissions.

## Maintaining the system

Use the [guidance-maintenance skill](skills/openlegend-guidance/SKILL.md). Keep one instruction owner, narrow triggers and exact meaning. Add supporting detail behind conditional links; avoid mandatory repeated reads or a root entry for every subtopic.

After the frozen-lockfile install, `pnpm guidance:check` uses Git's inventory and the pinned YAML parser. It checks metadata, the Claude import, local inline-link targets and structural rule/skill reachability from root/scoped AGENTS. Optional guide/research links cannot rescue an orphan; an incidental link in an operational file can still satisfy the graph. Correct triggers require review, not graph inference.

Use ordinary, non-symlink guidance files and versioned link targets; newly created non-ignored files are included before staging. Local-only/ignored targets cannot satisfy the check. It also checks contributor/template/tracker links and warns about visible override or alternate CLAUDE entrypoints. Fenced examples, comments and inline code are not navigation; heading anchors, reference-style links, arbitrary Markdown and agent compliance remain outside its scope.

Size reports cover the root, longest AGENTS ancestry and total skill discovery text (names, descriptions and paths). They exclude harness overhead and loaded topic bodies, and are bytes, not tokens. Assess representative task context as well; a smaller root can still trigger excessive reading. Keep native skills directly under `.agents/skills/<name>/SKILL.md`, with shallow links to details rather than a deep skill-folder hierarchy.

Expected routing: a Jev rubric change loads server, TypeScript, AI and verification; a camera change loads client, TypeScript, PlayCanvas and verification; a typo-only document correction loads documentation. A cross-boundary change loads the applicable union. Reading guidance for maintenance does not activate every procedure it describes.

No generated wrapper copies, skill installers, permission changes or model settings are included. Review and pin vendor skills only when they add missing context; whole collections are not prerequisites to contributing.

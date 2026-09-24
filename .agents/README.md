# Agent guidance system

[AGENTS.md](../AGENTS.md) is the entrypoint for people and agents. It routes by task intent and affected paths; the linked rule/skill body is read only when applicable. No global instruction glob, network setup or proprietary agent is required.

## Layout and authority

Root instructions hold universal constraints and the only task-routing index. Package `AGENTS.md` files hold local boundaries. `rules/` owns cross-cutting development policy; `skills/*/SKILL.md` owns reusable procedures. Existing specifications remain authoritative for behavior; local code comments retain non-obvious reasons. References are optional research, never automatic prerequisites.

The current task can change its workflow explicitly; tool/platform instructions and actual authorization still apply. A nested file refines its subtree, not permission to bypass privacy, billing or data ownership. Do not copy the policy into editor-specific files.

## Compatibility

- **Codex:** Native `AGENTS.md` and `.agents/skills/`; root routes also require explicit reads for affected paths outside the startup instruction chain.
- **OpenCode:** Native `AGENTS.md` and `.agents/skills/`; follow explicit topic links rather than assuming linked documents are included automatically.
- **Cursor:** Native `AGENTS.md` and `.agents/skills/`; no additional `.mdc` copies or always-on skill mode is needed.
- **Claude Code:** The root `CLAUDE.md` imports `AGENTS.md`; its task routing directs Claude to open canonical skill files as ordinary files. No duplicate `.claude/skills/` bodies or native slash-menu entries are installed.
- **Other agents:** Start with “Read AGENTS.md and the applicable path/topic guidance before this task.” Plain Markdown is the fallback when native discovery is absent.

Loading details vary by agent/version. In particular, Codex documents a startup root-to-working-directory chain, not automatic inclusion of every descendant file on access. Claude's native skill directory differs; the file-reading fallback avoids symlinks that can fail in Windows checkouts and duplicate discovery in other clients. These are documented integration paths, not claims of verified behavior in every agent. [Sources](references/research.md) and [remaining validation](../docs/maintainers/agent-guidance.md) make that distinction explicit.

## Maintaining the system

Use the [guidance-maintenance skill](skills/openlegend-guidance/SKILL.md). Keep descriptions narrowly useful, read only matching procedures and split supporting detail before growing the root. `pnpm guidance:check` validates the canonical import, skill metadata, root rule/skill coverage and relative links between instruction-system files. It reports advisory byte budgets; it does not truncate prose, resolve arbitrary code/specification links or prove agent compliance. General documentation references still need review.

Examples of expected routing: a Jev rubric change loads server guidance, TypeScript, AI and verification; a camera change loads client, TypeScript, PlayCanvas and verification; a typo-only design-doc correction loads documentation, not all design/performance/AI skills. A cross-boundary change loads the applicable union, not an arbitrary maximum number of files.

No generated wrapper copies, automatic skill installers, permission changes or model-specific settings are included. Official vendor skills may be reviewed and pinned later when they add missing context; installing whole collections is not a prerequisite to contributing.

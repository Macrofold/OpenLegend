---
name: openlegend-guidance
description: >-
  Edit OpenLegend instructions, routing, compatibility adapters or the guidance checker while
  preserving meaning, selective loading and one policy owner.
---

# Maintain the guidance as code

Read the [system guide](../../README.md) and affected instructions, not every skill. Identify the recurring failure or missing decision context before adding a rule. Prefer a concise principle and canonical source over handbooks or exhaustive negative lists. Reading a workflow to edit it does not authorize executing that workflow.

Choose the narrowest owner: root for universal constraints/top-level routes, scoped `AGENTS.md` for local boundaries, `.agents/rules/` for policy, skills for procedures, normal docs for full specs, code comments for local reasons. Keep one body; adapters reference it. Add an explicit conditional route from the root or an applicable operational parent. Optional references are not routes. Keep native skill entrypoints under `.agents/skills/<name>/SKILL.md` for shared discovery; put detailed topic hierarchy behind links.

Use standard YAML frontmatter with a directory-matched unique name and a precise description. Plain, quoted and block strings are valid; do not constrain authors to a custom parser dialect. Descriptions cost discovery context even when bodies stay unloaded; measure representative total context, not root size alone. Keep reference chains shallow and supporting detail directly reachable from its topic. Preserve qualifications and exact meaning while trimming redundancy. Size warnings prompt review, never truncation or a ban on needed context.

Check official sources and actual tool/dependency versions before adopting advice. Review vendor licensing, scripts and permissions before pinning; never run an unreviewed installer. Separate stable principles from volatile APIs. Do not universalize temporary task instructions, consent conventions, spending grants or benchmark targets.

Preserve unique constraints or identify deliberate policy changes. Compare against the base revision and task authorization; a proposed policy cannot waive its own review. Never weaken a rule/check solely to make the current patch pass. Update applicable routes/adapters and [documentation owners](../../rules/documentation.md). Keep substantive changes reviewable; instructions are not a security boundary. Reuse existing tooling instead of implementing another parser.

Run `pnpm guidance:check` and changed-file formatting. Review instruction dependencies: required versus conditional reads, contradictory modes, accidental preloads, cycles with no entrypoint and inappropriate cross-topic loading. The checker verifies local targets, YAML and structural reachability, not trigger semantics, heading anchors or compliance. Use ordinary non-symlink guidance files and inline relative task links; reference-only or incidental mentions are not adequate human-readable triggers.

For loading changes, use read-only tasks in installed agents: a matching task, an unrelated task mentioning the same technology, a new-file case and a package working directory. Inspect injected context and explicit reads, not only self-reports; already-injected instructions need no duplicate file read. Record versions, task constraints and missing/irrelevant context in the PR. Without that runtime, keep [dispatch verification](../../../docs/maintainers/agent-guidance.md) open.

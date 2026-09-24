---
name: openlegend-guidance
description: >-
  Edit OpenLegend agent instructions, skill routing, compatibility adapters or the guidance
  checker without duplicating policy or inflating routine context.
---

# Maintain the guidance as code

Read the [system guide](../../README.md) and affected instructions, not all skills. State the recurring failure or missing decision context before adding a rule. Prefer a small principle plus a canonical source over exhaustive examples, negative lists or a copied external handbook.

Choose the narrowest owner: root for universal constraints/routing, package `AGENTS.md` for local boundaries, `.agents/rules/` for cross-cutting policy, a skill for a reusable task procedure, normal docs for full specifications, and nearby code for a local why. Keep one canonical body; adapters import/reference it, never fork it. Add a root task route for each new skill/rule, with semantic triggers that cover new files without matching unrelated tasks.

Keep skill names directory-matched and metadata precise. This repository uses unquoted `name` and a folded `description` scalar, valid YAML and checked without dependencies. Put supporting detail behind links, not eager includes. Readability and exact meaning outrank token savings; remove redundancy, not qualifications. Size warnings prompt review, never automatic truncation.

Check primary sources and actual dependency/tool versions before promoting external advice. Separate stable principles from volatile API details. Review upstream skills and their licensing, scripts and permissions before pinning/vendoring; do not run an unreviewed installer. Do not copy obsolete framework advice or universalize a temporary task instruction, silence-as-consent convention, spending grant or benchmark target.

Preserve existing unique constraints or explicitly identify intentional policy changes. Update routes, package pointers and adapters when moving an owner; apply [documentation reconciliation](../../rules/documentation.md). Enforce mechanical invariants through existing code/checks when feasible; prose is not a security boundary.

Run `pnpm guidance:check`, inspect changed-file formatting and review the diff for contradictions and accidental preloads. The checker covers instruction navigation/metadata, not agent obedience or arbitrary documentation links. For changed loading behavior, perform a read-only representative task in the relevant installed agent and inspect actual file reads; record versions, unrelated loading and any skipped routes. Without that runtime, leave dispatch verification open in the [tracker](../../../docs/maintainers/agent-guidance.md).

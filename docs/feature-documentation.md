# Feature documentation structure

Use one maintained behavior owner per feature. The [design workflow](../.agents/skills/openlegend-design/SKILL.md) decides when to create paired feature-spec and technical-design files; this structure does not require retroactively splitting every established specification. Project history must link current contracts rather than duplicate them.

Project documents follow [Project status and completion](../.agents/rules/documentation.md#project-status-and-completion): include the status table after the title, refresh it when project work finishes, and move fully completed project documents into `docs/projects/completed/` with repaired references. This rule applies to project documents, not persistent cross-project feature specifications.

## Required content

A feature specification describes purpose, supported behavior, target scenarios and user/agent journeys, scope/non-goals, meaningful failure cases, acceptance criteria and staged capabilities. Distinguish implemented behavior from accepted targets and proposals.

Its technical design describes semantic owners and callers, contracts/data flow, persistence/migration, security/privacy and authority, performance, extension seams, stages, verification and tradeoffs/open decisions. Relevant world-specific choices remain under the world’s own contract.

Each new or substantially changed feature spec, technical design or persistent feature document includes a **Maintained records** section linking:

- **Implementation:** the focused `docs/maintainers/` task/progress tracker (stable work IDs, dependencies, completion criteria and unsatisfied acceptance).
- **Limits and constraints:** its owning `docs/limits/<feature>.md`, under the [limits tracking system](limits/README.md). Record numerical and behavioral choices, rationale, restrictiveness, evidence/current status, and removed/no-limit decisions. Include absent bounds on growing queries, pre-selection loops, hydration, queues and retained collections, even when final output is limited; record reachable growth and consequences under the tracking rules. Reuse an existing inventory for shared mechanisms; do not create competing per-project copies.
- **Related contract/design:** the counterpart design or persistent semantic owner when needed to distinguish project scope from current behavior.

If a newly assessed feature has no discretionary limits, say so explicitly in its limits inventory, with the reason and applicable shared limits links. Do not invent a cap just to fill a template. Existing documents can adopt this structure when touched; this migration links every feature represented by the supplied inventories.

## Minimal navigation example

```markdown
## Maintained records

- Implementation: [Feature tasks](maintainers/feature.md).
- Limits and constraints: [Feature inventory](limits/feature.md).
- Related contract/design: [Technical design](projects/feature-tech-design.md).
```

Paths in the example are placeholders; use correct relative links from the actual document. Keep task bodies in the tracker and limit entries in the inventory. Feature prose can describe a user-visible bound where needed and link its stable inventory ID instead of duplicating a second limit table.

## Change together

A feature change that adds, changes, removes or explicitly chooses no limit updates the inventory and affected consumers/docs in the same change. Assess whether it creates or completes an item in [Limits to revisit](maintainers/limits-audit.md); most ordinary defaults need no task. Reconcile related accepted policy triggers and record consequential decisions in the changelog. Check local links/anchors, preserve stable IDs and inspect the diff for lost rationale or historical claims presented as current.

## Designs originating in cross-game learning

For a registered subtopic from the [main learning guides](../archive/02-research/game-inspiration/synthesis/README.md), use its existing **ND identifier** from [Future work needing design](maintainers/needs-design.md). Retain that exact ID in both the feature specification and technical design, with links to its register entry and source topic/subtopic. Follow the existing register's identity and disposition rules and the [topic-to-design handoff](../archive/02-research/game-inspiration/synthesis/main-topic-template.md#7-design-subtopics); do not create a separate register or numbering scheme. Ordinary research headings do not require IDs or design pairs until promoted to scoped design subtopics.

The technical design defines implementation modules and maps them to their parent ND IDs; actual module progress remains in the focused implementation tracker linked under Maintained records. Reuse existing designs and module IDs where their scope matches. A **Done — designed** disposition records a completed design pair and delivery breakdown, not implementation authorization, project completion or verified player enjoyment. The [main-topic template](../archive/02-research/game-inspiration/synthesis/main-topic-template.md) owns the adaptable research-document shape, not the structure of the feature/design pair.

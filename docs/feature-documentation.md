# Feature documentation structure

Use one maintained behavior owner per feature. The [design workflow](../.agents/skills/openlegend-design/SKILL.md) decides when to create paired feature-spec and technical-design files; this structure does not require retroactively splitting every established specification. Project history must link current contracts rather than duplicate them.

## Required content

A feature specification describes purpose, supported behavior, target scenarios and user/agent journeys, scope/non-goals, meaningful failure cases, acceptance criteria and staged capabilities. Distinguish implemented behavior from accepted targets and proposals.

Its technical design describes semantic owners and callers, contracts/data flow, persistence/migration, security/privacy and authority, performance, extension seams, stages, verification and tradeoffs/open decisions. Relevant world-specific choices remain under the world’s own contract.

Each new or substantially changed feature spec, technical design or persistent feature document includes a **Maintained records** section linking:

- **Implementation:** the focused `docs/maintainers/` task/progress tracker (stable work IDs, dependencies, completion criteria and unsatisfied acceptance).
- **Limits and constraints:** its owning `docs/limits/<feature>.md`, under the [limits tracking system](limits/README.md). Record numerical and behavioral choices, rationale, restrictiveness, evidence/current status, and removed/no-limit decisions. Reuse an existing inventory for shared mechanisms; do not create competing per-project copies.
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

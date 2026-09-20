# Working on Open Legend

Read `README.md`, `docs/architecture.md`, and the relevant package's implementation before changing it. Product intent is in `archive/05-project/first-playable-mvp.md`; the larger archive describes future plans as well as current requirements. Do not present proposed or fixture-tested behavior as live acceptance evidence.

## Development Philosophy

### Core Principle: Less is more

Keep every implementation as small and obvious as possible.

Guidelines

- Simplicity first – Prefer the simplest data structures and APIs that work
- Avoid needless abstractions – Refactor only when duplication hurts
- Remove dead code early – pnpm tidy scans for unused files/deps and lets you delete them in one command
- Minimize dependencies – Before adding a dependency, ask "Can we do this with what we already have?"
- Consistency wins – Follow existing naming and file-layout patterns; if you must diverge, document why
- Explicit over implicit – Favor clear, descriptive names and type annotations over clever tricks
- Fail fast – Validate inputs, throw early, and surface actionable errors
- Let the code speak – If you need a multi-paragraph comment, refactor until intent is obvious

## Boundaries

- `packages/domain` is authoritative, deterministic, serializable and free of I/O, wall clocks, provider SDKs, browser APIs and renderer imports. Changes are pure transitions with explicit outcomes and committed events. Randomness belongs to saved state.
- `apps/server` assembles permitted context, schedules bounded work, reserves spending, commits transitions and projects client DTOs. It owns game semantics and admission. Never send whole world state or another actor's private memory to a client or model.
- `packages/ai` is generic typed execution. It never decides world policy or applies effects. Missing credentials, uncertain completion, refusal and invalid data remain distinct. Do not add automatic paid retries.
- `packages/protocol` contains public transport types only. `apps/client` renders these and sends intentions; it cannot authorize effects.
- Generated definitions are untrusted data in finite trusted families. New JSON fields never acquire executable meaning automatically. Do not use eval, generated JavaScript, hidden canned invention recipes or client-supplied authority.

## Documentation is a maintained source of truth

- For every documentation or design update, identify the canonical owner and read all related documentation: incoming/outgoing links, semantic mentions, requirements, decisions, examples, schemas, plans, tasks, setup and implementation status. Follow dependencies beyond the initially edited file.
- Reconcile the bodies of every affected document in the same change. Update conflicting tables, examples, diagrams and task instructions; a supersession notice or link alone is insufficient. Core documentation must describe the latest agreed state consistently.
- Preserve unique requirements, rationale, constraints, edge cases, open questions, tasks, findings and evidence. Before consolidating or removing text, compare both sources and move still-relevant information to its proper home. Only remove information explicitly superseded, outdated, untrue or no longer relevant; never treat an entire document as obsolete because part changed.
- Bring architecture requirements discovered in companion documents into the canonical architecture document. Keep specialized implementation detail in its owning document with accurate links, rather than creating competing specifications or duplicate task queues.
- Distinguish accepted target behavior, current implementation, proposals and historical evidence. Preserve source requests and dated test findings as evidence; do not rewrite history or claim planned/fixture-tested behavior is live. Historical labeling must not hide requirements that still apply.
- Review the complete documentation diff against the pre-edit content for information loss, check links/anchors and search related documents for stale prescriptions. Report actual unresolved conflicts or blockers; do not claim synchronization complete while known contradictions remain.
- Keep implementation checklists aligned with the accepted design without deleting unique investigation results, blockers or pending validation. A documentation update does not complete an implementation or acceptance task.

## Work discipline

Preserve unrelated edits. Keep dependencies pinned and the lockfile current. Run `pnpm run check` for changes to runtime code; use focused tests while iterating. Add tests for meaningful failure boundaries, not assertions that mirror an implementation. Apply `pnpm run format` before the final check.

Paid calls require locally configured credentials and an explicit nonzero spending cap. Tests must inject fixtures, mark them as fixtures and make no external requests. Never read unrelated secrets, put credentials in prompts, commit `.env`, or claim model quality/cost results from fixtures. Live verification has its own checklist in `docs/verification.md`.

Keep architecture, extension instructions and implementation status accurate when behavior changes. Document tradeoffs and why non-obvious rules exist. First-party code/assets use AGPL-3.0-only; third-party art references are not licensed game assets.

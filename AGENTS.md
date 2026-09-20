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
- Centralize semantic mutations – Adding, updating or deleting a domain concept must go through one authoritative entrypoint that performs validation, dependent-state updates, invalidation and committed side effects. Parameterize legitimate variants instead of creating shortcut paths that can omit downstream work.

## Boundaries

- `packages/domain` is authoritative, deterministic, serializable and free of I/O, wall clocks, provider SDKs, browser APIs and renderer imports. Changes are pure transitions with explicit outcomes and committed events. Randomness belongs to saved state.
- `apps/server` assembles permitted context, schedules bounded work, reserves spending, commits transitions and projects client DTOs. It owns game semantics and admission. Never send whole world state or another actor's private memory to a client or model.
- `packages/ai` is generic typed execution. It never decides world policy or applies effects. Missing credentials, uncertain completion, refusal and invalid data remain distinct. Do not add automatic paid retries.
- `packages/protocol` contains public transport types only. `apps/client` renders these and sends intentions; it cannot authorize effects.
- Generated definitions are untrusted data in finite trusted families. New JSON fields never acquire executable meaning automatically. Do not use eval, generated JavaScript, hidden canned invention recipes or client-supplied authority.

## Documentation is a maintained source of truth

- Give every substantive concept one canonical owner. Other documents may link to it, summarize it briefly or state a dependency, but must not duplicate its requirements, contracts, schemas, decision tables, acceptance criteria or task list.
- Specifications describe accepted target behavior. Detailed implementation tasks, dependencies, blockers and exit criteria live only in focused files under `docs/maintainers/`. `docs/maintainers/README.md` is navigation, and `docs/maintainers/TODO.md` contains only miscellaneous or cross-cutting validation, integration and documentation gaps that have no focused tracker.
- Current implementation facts belong in `docs/architecture.md` and the current subsystem snapshot in `archive/05-project/implementation-status.md`. Current evidence belongs in `docs/verification.md`; unresolved decisions belong only in `archive/05-project/open-decisions.md`; active research questions belong in `archive/05-project/research-backlog.md`.
- Current specifications and trackers state current truth without provenance or dated implementation diaries. Record documentation moves, superseded directions and worthwhile historical context only in `docs/documentation-changelog.md`.
- Before consolidating or deleting a document, classify its contents and migrate every unique current requirement, task, implementation fact, acceptance criterion, unresolved decision, research question and needed reference to its canonical owner. Delete the source only after updating every inbound link.
- Resolve implemented-state conflicts from code and current verification evidence. Resolve target behavior from the latest accepted requirement and designated design owner. If a material product or technical choice remains genuinely incompatible, record the unresolved choice in `open-decisions.md` instead of silently choosing a direction.
- Preserve task IDs, checkbox state, dependencies, blockers and still-valid exit criteria when moving work. Documentation reorganization never completes an implementation or acceptance task.
- After documentation changes, review the complete diff for information loss and run repository-wide checks for stale links, deleted owners, duplicate task bodies, competing canonical claims, misplaced decisions and broken relative links or anchors.

## Work discipline

Preserve unrelated edits. Keep dependencies pinned and the lockfile current. Run `pnpm run check` for changes to runtime code; use focused tests while iterating. Add tests for meaningful failure boundaries, not assertions that mirror an implementation. Apply `pnpm run format` before the final check.

Paid calls require locally configured credentials and an explicit nonzero spending cap. Tests must inject fixtures, mark them as fixtures and make no external requests. Never read unrelated secrets, put credentials in prompts, commit `.env`, or claim model quality/cost results from fixtures. Live verification has its own checklist in `docs/verification.md`.

Keep architecture, extension instructions and implementation status accurate when behavior changes. Document tradeoffs and why non-obvious rules exist. First-party code/assets use AGPL-3.0-only; third-party art references are not licensed game assets.

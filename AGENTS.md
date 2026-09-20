# Working on Open Legend

Read `README.md`, `docs/architecture.md`, and the relevant package's implementation before changing it. Product intent is in `archive/05-project/first-playable-mvp.md`; the larger archive describes future plans as well as current requirements. Do not present proposed or fixture-tested behavior as live acceptance evidence.

## Boundaries

- `packages/domain` is authoritative, deterministic, serializable and free of I/O, wall clocks, provider SDKs, browser APIs and renderer imports. Changes are pure transitions with explicit outcomes and committed events. Randomness belongs to saved state.
- `apps/server` assembles permitted context, schedules bounded work, reserves spending, commits transitions and projects client DTOs. It owns game semantics and admission. Never send whole world state or another actor's private memory to a client or model.
- `packages/ai` is generic typed execution. It never decides world policy or applies effects. Missing credentials, uncertain completion, refusal and invalid data remain distinct. Do not add automatic paid retries.
- `packages/protocol` contains public transport types only. `apps/client` renders these and sends intentions; it cannot authorize effects.
- Generated definitions are untrusted data in finite trusted families. New JSON fields never acquire executable meaning automatically. Do not use eval, generated JavaScript, hidden canned invention recipes or client-supplied authority.

## Work discipline

Preserve unrelated edits. Keep dependencies pinned and the lockfile current. Run `pnpm run check` for changes to runtime code; use focused tests while iterating. Add tests for meaningful failure boundaries, not assertions that mirror an implementation. Apply `pnpm run format` before the final check.

Paid calls require locally configured credentials and an explicit nonzero spending cap. Tests must inject fixtures, mark them as fixtures and make no external requests. Never read unrelated secrets, put credentials in prompts, commit `.env`, or claim model quality/cost results from fixtures. Live verification has its own checklist in `docs/verification.md`.

Keep architecture, extension instructions and implementation status accurate when behavior changes. Document tradeoffs and why non-obvious rules exist. First-party code/assets use AGPL-3.0-only; third-party art references are not licensed game assets.

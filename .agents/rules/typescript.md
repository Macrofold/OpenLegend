# TypeScript and module design

Use the checked-in compiler, manifests and neighboring code as the baseline; do not change framework, compiler options or dependencies merely to match an external guide.

- Preserve strict checking, indexed-access checks and ESM. Use `import type`, narrow `unknown` at external boundaries and prefer discriminated outcomes over ambiguous flags. Do not hide invalid states with broad casts, `any`, non-null assertions or swallowed failures. Keep annotations where they clarify a public contract; allow obvious local inference.
- Reuse the owning validator: server admission uses Zod; AI transport has its own schema/response validation. TypeScript types alone validate no incoming JSON. Derive shared shapes when practical; distinct trust-boundary schemas may differ deliberately. Avoid competing definitions and silent coercion. Bound untrusted sizes, numeric ranges and work before expensive processing.
- Prefer plain data, focused functions and narrow interfaces. Classes suit resource/lifecycle owners. Introduce abstractions for an actual responsibility, not to impose class hierarchies, containers or a universal result framework.
- Honor package entrypoints and dependency direction. Packages/server use `.js` relative specifiers; client files currently use extensionless imports. Follow the applicable build context rather than mechanically rewriting imports.
- External/background work needs an owner, cleanup and observable failure. Bound requests/concurrency where work can escape its caller; reject cancelled or stale results. Do not add a timeout or queue around every local promise. `async` does not offload CPU, and unbounded `Promise.all` is not a concurrency policy.
- Keep one authored source for generated code/configuration; inspect the generator before editing its output. Keep dependencies exact, runtime dependencies in their importing package and shared tools at the root; use the existing pnpm workspace and lockfile.

Examples to inspect when relevant, not mandatory bulk reading: [AI outcomes](../../packages/ai/src/types.ts), [server validation](../../apps/server/src/world-service.ts), [domain drafts](../../packages/domain/src/draft.ts), [renderer interface](../../apps/client/src/world-renderer.ts). Reuse the contract, not every incidental detail.

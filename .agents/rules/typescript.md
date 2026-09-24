# TypeScript and module design

Use the checked-in compiler, manifests and neighboring code as the baseline; do not change framework, compiler options or dependencies merely to match an external guide.

- Preserve strict checking, indexed-access checks and ESM. Use `import type`, narrow `unknown` at external boundaries and prefer discriminated outcomes over ambiguous flags. Do not hide invalid states with broad casts, `any`, non-null assertions or swallowed failures. Keep annotations where they clarify a public contract; allow obvious local inference.
- Reuse the owning validator: server admission uses Zod; AI transport has its own schema/response validation. TypeScript types alone validate no incoming JSON. Avoid parallel schemas or coercion that silently changes meaning. Bound untrusted sizes, numeric ranges and work before expensive processing.
- Prefer plain data, focused functions and narrow interfaces. Classes are appropriate for existing resource/lifecycle owners. Do not impose class hierarchies, dependency-injection containers, a new event bus or universal result framework.
- Honor package entrypoints and dependency direction. Packages/server use `.js` relative specifiers; client files currently use extensionless imports. Follow the applicable build context rather than mechanically rewriting imports.
- Every asynchronous operation needs an owner, bounded lifetime and observable failure. Handle cancellation and stale completion; clean up listeners/resources. `async` does not offload CPU work, and unbounded `Promise.all` is not a concurrency policy.
- Keep one authored source for generated code/configuration; inspect the generator before editing its output. Keep dependencies exact, runtime dependencies in their importing package and shared tools at the root; use the existing pnpm workspace and lockfile.

Representative contracts: [AI outcomes](../../packages/ai/src/types.ts), [server validation](../../apps/server/src/world-service.ts), [domain drafts](../../packages/domain/src/draft.ts), [renderer interface](../../apps/client/src/world-renderer.ts). Learn the local pattern, not every incidental detail of these files.

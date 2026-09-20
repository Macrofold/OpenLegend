# Contributing

Open Legend is an early, local-first experiment in a simulation whose inhabitants and mechanics can evolve. Small, reviewable changes that preserve deterministic rules and explicit authority are particularly useful.

Use Node.js 22.13 or newer (Node 22 LTS is the tested baseline) and pnpm 10.33.0, then run `pnpm install --frozen-lockfile` and `pnpm run dev`. See [local setup](README.md#run-locally) if pnpm is not installed. Without API keys the native wilderness remains playable; live conversation and invention explicitly report unavailable. Do not add fake creative responses as a fallback.

The root `packageManager` pins pnpm for local use and CI. `pnpm-workspace.yaml` lists the packages, and `pnpm-lock.yaml` is the only dependency lockfile. Internal package dependencies use `workspace:*` to require local resolution. Keep shared development tools at the root and runtime dependencies in the package that imports them. Add external dependencies with an exact version, for example `pnpm --filter @open-legend/server add --save-exact package-name@version`, and commit the updated manifest and lockfile together. The workspace configuration explicitly allows the native tooling install scripts needed by esbuild and fsevents.

Before changing mechanics, read [architecture](docs/architecture.md), [extension guidance](docs/extending.md), and [the MVP agreement](archive/05-project/first-playable-mvp.md). Discuss a new trusted mechanism as a normal engine change; expanding a JSON schema alone is insufficient.

Run `pnpm run format` and `pnpm run check`. Include the problem, resulting behavior, validation and remaining limitations in your pull request. Add scenario tests for resource conservation, permission boundaries, idempotency, stale results or migration risks introduced by your change. Screenshots help for visual changes. Live-provider checks are optional for ordinary contributions and require a bounded budget; label results clearly.

Do not commit API keys, private saves, paid-provider responses containing personal data, or artwork copied from the reference boards. The procedural assets in `apps/client/src/art.ts` are original source-generated assets. Contributions to first-party code and documentation are under AGPL-3.0-only; see [licensing](LICENSING.md).

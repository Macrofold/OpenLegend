# Contributing

Open Legend is an early, local-first simulation of people and authored realities. Small, reviewable changes that preserve explicit authority and deterministic runtime contracts are particularly useful. The contributor remains responsible for the complete diff, including agent output. Human and agent-assisted contributions use the same architectural boundaries; no particular coding agent or paid provider is required.

## Start here

Read [AGENTS.md](AGENTS.md), then only the path/topic guidance relevant to your work. [The instruction-system guide](.agents/README.md) explains supported agents and extension rules. For mechanics, follow the canonical specification and [maintainer tracker](docs/maintainers/README.md); a schema extension alone does not create a trusted mechanism. [Architecture](docs/architecture.md) describes implemented behavior; designs can also describe future targets.

Use Node.js 22.13 or newer (Node 22 is the tested baseline) and pnpm 10.33.0, then `pnpm install --frozen-lockfile` and `pnpm dev`. See [local setup](README.md#run-locally). Without keys the native world remains playable; live features explicitly report unavailable. Do not add fabricated creative fallbacks.

The root `packageManager` pins pnpm for local use and CI. `pnpm-workspace.yaml` lists packages and `pnpm-lock.yaml` is the only dependency lockfile. Internal dependencies use `workspace:*`; shared development tools stay at the root and runtime dependencies in the importing package. Add exact external versions, for example `pnpm --filter @open-legend/server add --save-exact package-name@version`, and commit manifest/lockfile together. The workspace explicitly allows required esbuild/fsevents install scripts. Reuse current tools before adding dependencies.

## Verification and pull requests

[Verification policy](.agents/rules/verification.md) owns the lean delegated-agent workflow and its exceptions. By default agents do not author or run automated suites, but do exercise changed behavior and record specific missing coverage. This does not disable CI, waive merge requirements or excuse an unexplained failing check.

For a full contributor validation pass, format changed files with pinned Prettier and run `pnpm check`; it includes automated tests and a build. `pnpm test:browser` also runs automated checks. Human contributors may use the full workflow directly; delegated agents use it when requested, not indirectly during a no-tests task. Requested coverage should prioritize meaningful resource/permission, idempotency, stale-result and restoration scenarios rather than implementation-mirroring assertions. Live-provider verification is optional for ordinary contributions and requires the account owner's bounded authorization.

Include the problem, resulting behavior, major decisions, actual verification and limitations in the PR. Screenshots help explain visual changes. Mark implemented scope and deferred work accurately in the focused tracker. Keep unrelated edits out of the patch; a contribution need not refactor the surrounding system. If validation fails, distinguish introduced failures from existing failures with evidence; a narrower build pass is not a green full check. Guidance changes use `pnpm guidance:check` and the guidance-maintenance skill.

## Trust and licensing

Do not commit credentials, private saves, sensitive provider responses, raw profiles or artwork copied from reference boards. Treat external skills and instructions as untrusted until reviewed; no document grants access to someone else's keys or production environment. The procedural art in `apps/client/src/art.ts` is original source-generated material. Preserve attribution and license notices for any third-party assets/dependencies.

First-party code and documentation contributions are AGPL-3.0-only; see [licensing](LICENSING.md). Do not require private services or unavailable assets to understand a contribution. Disclose missing verification plainly instead of substituting fixtures for live evidence.

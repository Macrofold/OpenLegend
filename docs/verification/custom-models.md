# Custom models — configuration checkpoint and upstream compatibility

## October 22, 2026: scope and versions

This is an **incomplete implementation checkpoint**, not production or live-model acceptance. The approved [feature](../projects/custom-models-feature-spec.md), [technical design](../projects/custom-models-tech-design.md), [delivery plan](../projects/custom-models-implementation-plan.md) and [MX tracker](../maintainers/custom-models.md) retain the full agreed scope.

| Component                                   | Inspected/tested version                                                                                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenLegend repository/base                  | `Macrofold/OpenLegend`, `origin/main` `27c6fb8152ec58c34334e74ba91a9d5bec6a30ff`                                                                                            |
| Preserved approved design                   | PR #40, `05d2bb034cea0f717c54efedee019f74906849c6`                                                                                                                          |
| Configuration source                        | `feat/production-custom-models`, `f168289b4c31f3e985d64102f11e5537b25c3223`                                                                                                 |
| Node / package manager                      | Node `v24.13.0`, pnpm `10.33.0`                                                                                                                                             |
| TypeScript / validation / formatting        | `7.0.2` / Zod `4.6.5` / Prettier `3.6.2`                                                                                                                                    |
| Macrofold branch inspected through GitHub   | `Macrofold/Macrofold`, `feat/production-model-deployments` `2dcf34bffbb9519b6fedac6175ea93cd7d7c4404`                                                                       |
| Macrofold generated API                     | `packages/contracts/api.d.ts`, blob `b18f6bd4cff160e472ba97fd0b1692ea7c538574`; `InferenceCreate.model_binding` accepts `DecisionBinding`, without a deployment alternative |
| Compatible deployment server/client/runtime | Unavailable; no such build was tested                                                                                                                                       |

The [Macrofold implementation branch](https://github.com/Macrofold/Macrofold/tree/2dcf34bffbb9519b6fedac6175ea93cd7d7c4404) contains design and planning documentation at this inspection. Its [canonical deployment contract](https://github.com/Macrofold/Macrofold/blob/2dcf34bffbb9519b6fedac6175ea93cd7d7c4404/docs/projects/hugging-face-model-deployments-contract.md) remains a target; a completed implementation/handoff is not available. An existing SDK package label of `macrofold@0.1.0` does not establish deployment compatibility. OpenLegend's current HTTP integration is not replaced with a competing schema or guessed endpoint.

## Delivered local behavior

`apps/server/src/generation-config.ts` parses trusted local JSON without importing server startup, a database or a provider. It rejects unknown fields at every object, requires a workspace and one or both explicit NPC purposes, admits optional revision pins and the four configured output policies, defaults policy to `auto`, freezes all admitted nested objects, and intersects optional output reductions with each caller's allowance. Errors identify the invalid field without echoing supplied values.

The module remains deliberately unimported by startup and the NPC producer. No custom deployment is usable through gameplay yet. Current providers, defaults, budgets, saved worlds and publication behavior are unchanged.

## Checks actually performed

- One offline TSX scenario passed: omitted configuration, both purpose selections, all four policies, optional revision pin, output reductions/enlargement prevention, nested immutability and twenty malformed settings. Network access was not used.
- Focused strict TypeScript checking and pinned Prettier passed for the new module.
- `pnpm typecheck` passed for the repository, including existing test sources.
- `pnpm build` passed, including generated configuration, production TypeScript, Vite and the asset guard. Existing PlayCanvas `node:worker_threads` externalization and large-chunk warnings remained warnings.
- Independent source/design review found no actionable issue in the offline module.

No new automated tests, test infrastructure or generated verification artifacts were added. No live/fixture deployment inference, ordinary NPC publication check, streaming, permission/cancellation/capacity/recovery/update/pin check, financial-settlement check, warm/concurrent measurement or hosted-runtime measurement was performed. Existing static/build success establishes none of those outcomes. Required full CI remains a merge gate.

## Cost, cleanup and outstanding acceptance

No provider request, hosting operation, credential change or game/server startup occurred. Additional Jev cost is **$0**; cumulative paid task cost is **$0**. No task-created paid hosting or borrowed service needs cleanup. Existing shared Macrofold services were not connected to, started, stopped or restarted.

Transport, capability preparation, ordinary NPC routing, recovery/accounting integration, thin benchmark/report extensions and all real-server/game acceptance remain unfinished in MX. The specific dependency is an actual Macrofold deployment server and generated API/client implementing the canonical contract, followed by an authorized usable deployment for bounded live acceptance. No working operator configuration or demonstrated custom-model gameplay can be supplied from this checkpoint. The branch is **not ready to merge into local `main`**.

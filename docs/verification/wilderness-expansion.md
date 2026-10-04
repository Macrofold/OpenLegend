# Starting wilderness expansion — October 4, 2026

Authorized [BW24](../maintainers/base-world.md#bw24--fuller-starting-wilderness) work on `codex/embodied-feedback`, following the earlier feedback/lifecycle delivery. The branch was reconciled with exact **local main `84bb148d72ab4378067018d1e34b51a05bc88878`**, in `/Users/mzw/.codex/worktrees/54e5/OpenLegend`; the main checkout received no edits. Reconciliation preserved runtime patches, combined two required domain imports and retained both branches' documentation. TypeScript passed before the new expansion began. This report covers the expansion after reconciled tip `512b2851` and the source/checkpoints that follow it.

## Native composition and ordinary actions

No providers were enabled (`AI_BUDGET_USD=0`). A focused ad-hoc scenario used the actual domain, initialized Rapier/Recast and existing navigation fixture, with current-format world validation. Four seeds (73, 1, 199, 997) passed complete supported-placement/body clearance, spatial/module validation and JSON validation. Each contained 19 animals and 19 resource patches. Static artwork counts were 1,249 / 1,243 / 1,237 / 1,236, including 305 / 306 / 304 / 292 casting trees. Physical blockers including the three lookout blockers were 38 / 43 / 32 / 32. Every new world has 27 authored support patches (25 ground plus deck/ramp).

Seed 1 initially exposed a randomly selected rock beneath a resource patch. Speckling now excludes clearance around the single authored placement lists; all four seeds passed after the correction. The first route assertion in the scratch probe used the wrong result label (`found` rather than the existing `reached`); the actual route was successful, and the corrected assertion passed.

The player walked through native command admission/navigation from camp to `(43, 1.775, 31)` on the rise, arrived at the exact supported position and finished the move. Ordinary gathering then approached the outer berry patch and increased carried berries. A bear accepted injury through the actual body effect owner, died, and supplied the authored six-meat yield. The same bear changed to rotting and then physical removal at its saved deadlines; those two deadline observations used explicitly positioned fixture clocks rather than advancing seven days of ordinary play. Current-format JSON validation passed afterward. Negative scenery width was rejected. Existing broader injury/escape/revival evidence remains in [the earlier report](embodied-feedback.md); this is no new predator-behavior qualification.

## Existing selected checks

- `AI_BUDGET_USD=0 pnpm exec vitest run packages/spatial/src/spatial.test.ts packages/domain/src/spatial-world.test.ts`: **18 passed**, including support/collision/sensing and the camp/lookout movement/gathering integration.
- Selected existing store/lookout/geometry checks with `OPENLEGEND_TEST_DATABASE_URL=postgresql://localhost/postgres`: **5 passed**, 21 skipped under the name filter. PostgreSQL fixtures created/dropped their own databases only. Store close/reopen compared the entire current expanded world, including scenery records and new species, and exercised exact command receipt restoration and writer/revision protection. This overlaps the lookout case above; counts are not additive unique coverage.
- `pnpm typecheck`, `pnpm build`, `pnpm config:check` and pinned formatting for affected files passed. Production build retained the existing PlayCanvas worker externalization and large-bundle notices; no new dependency was introduced.

No new automated tests were authored and no unfiltered suite or CI run is claimed.

## Actual browser observations

The production build ran on a disposable loopback PostgreSQL fixture with God access, ticking disabled and AI budget zero. Browser interactions used the Codex in-app browser at 1280×720 and PlayCanvas 2.22.2. The default camp view extended beyond the camera without the previous contrasting rectangle. Wider zoom/orbit showed mixed broadleaf, pale-trunk birch and conifer shapes and sizes. The outer meadow/forest view showed wolves, a bear, deer, hares, resource detail and rock formations.

Disclosed fixture teleports placed the player near outer wildlife for inspection. An ordinary right-click on the raised ground offered **Walk here**; choosing it and advancing 60 simulation seconds through the native service arrived at approximately `(50.9473, 1.52107, 37.4242)` with no remaining move action. Camera zoom, rotation and perspective switching retained foot anchoring. Morning and noon fixtures showed lighting/receiving shadows. Pause/resume restored the live scene. Several geometry revisions rebuilt the landscape; reload recreated it with persisted camera preferences. Browser warnings/errors were empty after the final rebuild. A fixture-native bear death showed the fallen body and visible zero-health feedback. Review also reduced the displayed height of dead animal cards, preventing fresh bodies from retaining a standing silhouette.

The final terrain margin continues the boundary planes rather than placing elevated edge artwork above a flat backdrop. It remains decorative: ordinary picking cannot create a supported destination outside the native map. Empty ground artwork creates no empty GPU mesh; no alternate groundless-world browser qualification is claimed.

A local preview was saved outside the repository at `/private/tmp/openlegend-wilderness-preview.jpg`. Screenshots, raw probes and private fixture data are not committed.

## Bounded cost observations and limits

Two seed-73 specimens advanced 300 simulation seconds with all 19 animals in approximately **76.69 ms** and **79.34 ms**, including actual navigation fixture work. A cold seven-point hill route took **211.26 ms** in one run and **531.72 ms** in the later run; these include preparation and host variation and are not route-only latency guarantees.

Landscape preparation across cold reloads and rebuilds recorded roughly **401–435 ms** for about 1,250 static instances in the browser fixture; this measures landscape creation, excluding later shader-program completion. Shared tree assets, grouped sprite shadows and four non-casting detail groups avoid a texture/material or detail draw per instance. Displayed one-second frame-rate samples ranged approximately **45–60 FPS** across camp, widened and outer-forest views; this was observational, not a matched before/after GPU benchmark or low-end device qualification. Guide replacement remains cooperative and discretely sampled; the existing wider geometry/device work in [SW09.4b](../maintainers/spatial-world.md) remains open. Scene rebuilds are infrequent geometry changes, not movement updates. New static map data reuses unchanged projection references and transport patches rather than being resent on ordinary unchanged-map frames.

The map stays finite, trees remain decorative, wolves/bears retain existing quadruped clearance and animal mechanics, and only new-world composition expands. Infinite streaming, interactive trees, predator ecology, long-run population capacity, arbitrary external artwork and broader devices remain separate consumers/qualification; none is claimed here. Current authored choices and reusable bounds are in [landscape](../worlds/base/landscape.md), [BW13](../limits/base-world.md#bw13--starting-wilderness) and [SP07](../limits/spatial.md#sp07--public-static-scenery).

Additional Jev cost: **$0**. Cumulative task total: **$0**. No provider calls were made. Disposable server/browser/database resources were stopped and cleaned after verification.

The subsequent [complete implementation review](embodied-feedback.md#implementation-review--october-4-2026) corrected escape/wandering stopping at internal terrain edges and aligned motion prediction with joined slopes. It records the demonstrated failure, seam/corner passes, collision/drop/gap refusals and matched bounded native cost observations. This closes that integration defect without changing the map's finite boundary or introducing new animal mechanics.

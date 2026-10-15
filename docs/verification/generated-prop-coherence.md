# Authored/generated asset coherence

## E08 — October 15, 2026

The attributed generated chest has been prepared and inspected as a candidate for the existing lookout supply crate. Application comparison and delayed/failure/lifecycle checks are still in progress. This report does not yet claim completed scene qualification or creator approval. [V3D01.10](../maintainers/3d-pixel-art.md#v3d0110--authoredgenerated-asset-coherence) owns the completed outcome.

### Source and permitted reuse

The input is the actual Meshy-generated remesh from [The Horde RT demo](https://github.com/Samfa12-tech/The-Horde-RT-demo), pinned at `d7e6d4018042c8b068f300aa5dbc9e1495daa448`. Its [asset-specific license declaration](https://github.com/Samfa12-tech/The-Horde-RT-demo/blob/d7e6d4018042c8b068f300aa5dbc9e1495daa448/ASSET_LICENSES.md) and [generation metadata](https://github.com/Samfa12-tech/The-Horde-RT-demo/blob/d7e6d4018042c8b068f300aa5dbc9e1495daa448/assets/models/props/meshy/production-gothic-chest-2026-08-27/METADATA.md) explicitly distribute it under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream could not independently prove its active account plan and chose that conservative attribution route; the caveat is retained.

Required credit: “Production Gothic reward chest created with Meshy; runtime processing by Samfa12/Codex.” OpenLegend's changes, license link and credit are recorded in the [attribution file](../../apps/client/src/props/ATTRIBUTION.md), [provenance](../../apps/client/src/props/generated-chest-provenance.json) and runtime GLB metadata. No endorsement is implied. No additional Meshy generation or paid provider call was made: **new E08 cost is $0**. Historical source metadata reports 25 preview + 10 refine + 5 remesh credits; historical USD charges and generation latency are unavailable and are not inferred.

The source was downloaded from the pinned public Git LFS media URL and its bytes matched the declared SHA-256: `eb70e139f5f776dc7204b9fff498bf9cdc7c75f275d65053d73a597b6908c5ab`, 21,246,952 bytes. It contains 6,912 generated triangles, 12,203 vertices and three embedded PBR images. The separately hand-reauthored upstream runtime chest is **not** used as evidence of generated geometry. The original remains outside Git at `/private/tmp/openlegend-e08-source/chest-meshy-remesh-7k.glb`; its pinned URL/hash make acquisition repeatable.

### Preparation and review

The [bounded Blender recipe](../../scripts/prepare-generated-chest.py) retains the generated triangles and source UVs. It closes the raised lid by rigidly rotating 3,909 source triangles, shares identical vertices, classifies the existing paint into oak/iron regions, removes PBR image/normal-map noise and normalizes a bottom-anchored unit envelope. The existing renderer supplies the crate's unchanged 1×0.8×0.8 metre presentation dimensions. It changes no physical clearance, resource quantity, support, ownership or action.

Blender 5.2.2 LTS imported and rendered the original source and prepared asset. The first diagonal-only lid grouping left protruding fragments; the grouping was corrected and the final closed silhouette was inspected again. The upstream remesh had been rejected there for losing fine ornament. Here its broad shape is a candidate at coarse gameplay size; the rough ornamental folds remain visible in close inspection and require an honest art decision. This is one existing generated candidate and a few deterministic cleanup iterations, not repeated successful generation or an automated acceptance claim.

Final runtime [GLB](../../apps/client/src/props/generated-chest.glb): **454,308 bytes**, SHA-256 `f48c364f3deb88e85e043a26801bc0754dc547ece8b47ee535bf962237c86fb2`; 6,912 triangles, 12,816 vertices, two standard materials, zero textures/normal maps/animations/external references. Bounds are `(-0.5, 0, -0.5)` to `(0.5, 1, 0.5)`. Oak/iron colors and roughness are stored as ordinary material data. The [resource owner](../../apps/client/src/generated-prop.ts) uses the same `ArtMaterials` and `ShadowMaterial` preparation as the authored scene; there is no prop-specific shader or alternate rendering backend. The original-source color control is an offline neutral inspection, clearly separate from the runtime material comparison.

Source acquisition, inspection and preparation took approximately 17 minutes of wall time including implementation and repeated review, not measured human artist labor. The final Blender import/export itself completed in roughly three seconds. No historical generation latency or broad production throughput is claimed. The preceding CC0 shoreline-rock candidate was unavailable because its CDN hostname did not resolve; the public attributed chest provided a usable no-cost alternative.

### Application evidence pending

The existing lookout supply crate is the only proposed replacement, at `(20, 3, 5.5)` on the lookout deck, with its 24 units of wood unchanged. The finite developer comparison uses authored/generated appearances on the same scene and retains the authored box while the model is loading or unavailable. Actual application/daylight/firelight/selection/read-through and repeated replacement checks remain pending here. A source-file inspection, TypeScript pass and prepared GLB are not those checks.

# Authored/generated asset coherence

## E08 — October 15, 2026

The attributed generated chest passed the existing-scene comparison, delayed/failure checks and resource cleanup checks. It is a technically verified candidate for the existing crate appearance family. The existing lookout supply crate provides the focused native placement comparison. This report does not claim creator visual approval, final whole-scene performance qualification or general generated-asset production reliability. [V3D01.10](../maintainers/3d-pixel-art.md#v3d0110--authoredgenerated-asset-coherence) owns the completed outcome.

### Source and permitted reuse

The input is the actual Meshy-generated remesh from [The Horde RT demo](https://github.com/Samfa12-tech/The-Horde-RT-demo), pinned at `d7e6d4018042c8b068f300aa5dbc9e1495daa448`. Its [asset-specific license declaration](https://github.com/Samfa12-tech/The-Horde-RT-demo/blob/d7e6d4018042c8b068f300aa5dbc9e1495daa448/ASSET_LICENSES.md) and [generation metadata](https://github.com/Samfa12-tech/The-Horde-RT-demo/blob/d7e6d4018042c8b068f300aa5dbc9e1495daa448/assets/models/props/meshy/production-gothic-chest-2026-08-27/METADATA.md) explicitly distribute it under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream could not independently prove its active account plan and chose that conservative attribution route; the caveat is retained.

Required credit: “Production Gothic reward chest created with Meshy; runtime processing by Samfa12/Codex.” OpenLegend's changes, license link and credit are recorded in the [attribution file](../../apps/client/src/props/ATTRIBUTION.md), [provenance](../../apps/client/src/props/generated-chest-provenance.json) and runtime GLB metadata. No endorsement is implied. No additional Meshy generation or paid provider call was made: **new E08 cost is $0**. Historical source metadata reports 25 preview + 10 refine + 5 remesh credits; historical USD charges and generation latency are unavailable and are not inferred.

The source was downloaded from the pinned public Git LFS media URL and its bytes matched the declared SHA-256: `eb70e139f5f776dc7204b9fff498bf9cdc7c75f275d65053d73a597b6908c5ab`, 21,246,952 bytes. It contains 6,912 generated triangles, 12,203 vertices and three embedded PBR images. The separately hand-reauthored upstream runtime chest is **not** used as evidence of generated geometry. The original remains outside Git at `/private/tmp/openlegend-e08-source/chest-meshy-remesh-7k.glb`; its pinned URL/hash make acquisition repeatable.

### Preparation and review

The [bounded Blender recipe](../../scripts/prepare-generated-chest.py) retains the generated triangles and source UVs. It closes the raised lid by rigidly rotating 3,909 source triangles, shares identical vertices, classifies the existing paint into oak/iron regions, removes PBR image/normal-map noise and normalizes a bottom-anchored unit envelope. The existing renderer supplies each crate's unchanged presentation dimensions: 1×0.8×0.8 metres for resource crates and 1×0.55×0.8 metres for item piles in the verified starting scene. It changes no physical clearance, resource quantity, support, ownership or action.

Blender 5.2.2 LTS imported and rendered the original source and prepared asset. The first diagonal-only lid grouping left protruding fragments; the grouping was corrected and the final closed silhouette was inspected again. The upstream remesh had been rejected there for losing fine ornament. Here its broad shape is a candidate at coarse gameplay size; the rough ornamental folds remain visible in close inspection and require an honest art decision. This is one existing generated candidate and a few deterministic cleanup iterations, not repeated successful generation or an automated acceptance claim.

Final runtime [GLB](../../apps/client/src/props/generated-chest.glb): **454,308 bytes**, SHA-256 `f48c364f3deb88e85e043a26801bc0754dc547ece8b47ee535bf962237c86fb2`; 6,912 triangles, 12,816 vertices, two standard materials, zero textures/normal maps/animations/external references. Bounds are `(-0.5, 0, -0.5)` to `(0.5, 1, 0.5)`. Oak/iron colors and roughness are stored as ordinary material data. The [resource owner](../../apps/client/src/generated-prop.ts) uses the same `ArtMaterials` and `ShadowMaterial` preparation as the authored scene; there is no prop-specific shader or alternate rendering backend. The original-source color control is an offline neutral inspection, clearly separate from the runtime material comparison.

Source acquisition, inspection and preparation took approximately 17 minutes of wall time including implementation and repeated review, not measured human artist labor. The final Blender import/export itself completed in roughly three seconds. No historical generation latency or broad production throughput is claimed. The preceding CC0 shoreline-rock candidate was unavailable because its CDN hostname did not resolve; the public attributed chest provided a usable no-cost alternative.

### Existing-scene comparison

Hardware browser: official Chrome 155 on Apple M1 Pro, 16 GPU cores, 32 GB, macOS 15.7.3. The actual PlayCanvas application ran from `http://127.0.0.1:61143/qa.html`, using the public starting-scene view: 34 entities, 1,250 scenery instances, 27 surfaces, map 62×54. No save, world definition, quantity, layout or gameplay rule was changed. Raw observations and images remain outside Git at `/private/tmp/openlegend-e08-source/`.

The finite developer comparison changes the existing `crate-mesh` appearance family between authored and generated art. The initial focused integration targeted the lookout crate; review changed that routing to the existing appearance family so the renderer does not encode one bundled-world object ID. All five existing entries use the same imported geometry: lookout supplies, camp route marker, riverside workshop, mending clearing marker and reed-side storage pile. No extra crate or alternate world was added.

At the native lookout position `(20, 3, 5.5)`, the crate keeps its deck support, 24 wood units and bottom anchor. Its combined rendered bounds remain X `19.5–20.5`, Y `3–3.8`, Z `5.1–5.9`. The authored representation uses four box meshes (48 triangles); the generated representation uses two meshes (6,912 triangles), a 144-fold triangle increase per visible crate. The generated topology is therefore deliberately bounded to this existing five-object family. The source model's broad lid, legs and metalwork survive close inspection, while the common material treatment gives the same lighting and coarse detail response as the authored mercenary. This is an inspected candidate, not measured artistic preference.

Observed application checks:

- Native placement: authored/generated frames at identical camera and dimensions; no scale or anchor jump. A daylight pair also placed only the public-view mercenary beside the native crate on the lookout deck, clearly labeled as a visual fixture rather than executed movement.
- Material ownership: the generated chest and authored scene use the same material-preparation object. Oak and iron remain distinct through lighting, selection and the effect that shows nearby objects through obscuring scenery.
- Selection: a real pointer click at the projected crate produced the crate selection event. Explicit application selection then displayed both generated meshes in the foreground treatment, retaining their different colors.
- Occlusion: existing canopy and wall scenery hide the crate when the nearby-object effect is off; the pick returns no crate. Enabling the existing permitted nearby-object effect gives strength `0.8`, makes the crate pickable and preserves the oak/iron regions. No asset swap is used for this effect.
- Lighting: the existing crate and mercenary were staged in the public view at `(12, 0, 8.8)` and `(14.2, 0, 8.8)` beside the native campfire `(11, 0, 10)`. The daylight/firelight pair uses the same camera. At hour 23 the sun is off and the observed fire light is on, intensity 2.8/range 8. Turning that light off darkens both objects; their warmth is not baked into the asset. This visual fixture changes no saved placement or native action.

The clear firelight images supersede an earlier fixture whose crate overlapped the existing camp route marker. Final useful captures are `scene-authored-native.png`, `scene-generated-native.png`, `scene-generated-pair-day.png`, `scene-occluded-off.png`, `scene-occluded-on.png`, `scene-selected-foreground-diagnostic.png` and `scene-pair-clear-{day,firelight,fire-disabled-control}.png`. Runtime controls and source inspection are labeled separately; the original imported PBR source appears only in offline inspection.

### Delayed loading, failure and cleanup

The authored crate remains usable until the imported asset is ready. An actual intercepted binary request exercised these cases in the application, rather than inspecting the resource class alone:

- While the model is loading, four authored meshes remain visible. Removing the resource from observation retains the existing faded remembered crate. Completing its load leaves the generated actor disabled and uninstalled; observing the crate again installs it. This corrected an earlier implementation that could upgrade an unobserved remembered crate on asynchronous completion.
- Suspending the scene before completing a cached import also keeps the fallback. Resuming allows the ready representation to install during the ordinary visible update.
- A forced binary 404 exhausts the existing loader's six bounded no-cost fetch attempts, then leaves the four-mesh authored fallback. No uncaught browser error occurs.
- Destroying the scene before a delayed load completes, mounting a fresh authored scene, and then fulfilling the old request attaches no stale node. The old actor has no root or prepared materials and the new scene remains authored.
- Three authored/generated replacements and three complete scene destroy/mount cycles completed without growing the registered asset count. Every full destruction released vertex, index and uniform buffers to zero. Residual engine texture bookkeeping was 150,232 bytes in the baseline lifecycle run and 36,868 bytes in the night-lighting run; this report does not claim zero texture residency.

After the generic appearance-family routing change, all five crates were checked again. All five installed successfully and shared exactly two source mesh IDs and two prepared material IDs, with 27 registered assets. Removing the reed-side item pile released that actor while the remaining four kept the same shared meshes and materials. Restoring it and switching the complete family to authored and back to generated reused the same geometry/materials with unchanged asset and buffer totals. The shorter item-pile envelopes were measured at 0.55 metres high, while resource crates remained 0.8 metres high.

That family check used the grouped environment and region materials. Reported device residency remained texture **96,230,880**, vertex **6,201,400**, index **760,572** and uniform **10,240** bytes through restoration and replacement; these are whole-scene residency totals, not the prop's isolated memory cost. Destruction again left vertex/index/uniform buffers at zero and 150,232 texture bytes. All application runs reported zero uncaught browser errors. These checks establish sharing and lifecycle behavior, not a frame-rate budget; concurrent team browser work means E08 cannot qualify final scene performance.

Source hashes were unchanged before/after the final five-crate run:

| Source                  | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `scene.ts`              | `a77b06426d6f895d8488194912d09170ea9f813bdcc8086af02b9cf032ea7a75` |
| `art-treatment.ts`      | `aeabe8a5926aeeaa551768f49b4eee0b6c2eb1102291fae8f11c51acb318d2fa` |
| `world-presentation.ts` | `8b3bc1e3acfc2c7e6c873a00b1828eba46b01843eb4124ff2e87ae0a2edc5eef` |
| `generated-prop.ts`     | `333046ed7ef606a23e7d0fc36dcb8cf5b7caa51649d2e41933e1237f9c8e4794` |
| Runtime GLB             | `f48c364f3deb88e85e043a26801bc0754dc547ece8b47ee535bf962237c86fb2` |

Evidence files are `scene-check.json`, `scene-remaining.json`, `scene-fire-clear.json`, `scene-lifecycle.json` and `scene-family.json` in the external directory above. TypeScript and source-format checks passed for the prepared resource module; the integration owner separately ran the current client typecheck. The source/GLB hashes, unit bounds, topology, material count, absence of images/animations/external references and embedded credit were inspected directly. The application host's earlier source manifest recorded the pre-attribution GLB hash; the final run fetched the current binary and the byte hash above is authoritative. Final whole-scene recording uses a fresh source manifest.

### Decision and limits

**Integrate as the finite generated crate candidate**, retain the authored option and loading/failure fallback, and use the common authored material treatment. The actual AI-generated shape is retained and the source is redistributable under its published attribution terms. This replaces the initial single-object routing with the existing crate appearance family, preserving each object's caller-owned dimensions. It does not add runtime generation, a new provider, private shader, new gameplay content or backend change.

The rough ornament and much higher triangle count remain material tradeoffs. This experiment covers one rigid generated asset and bounded Blender cleanup, not characters, skinning, cloth or reliable automatic art generation. The original's fine-detail loss is not hidden by the common treatment. Mike's visual acceptance, the final integrated scene recording and whole-scene performance qualification remain with the overall starting-scene task; no source or runtime defect remains open from E08's focused checks. New provider spending is **$0**, with no paid retry or account access.

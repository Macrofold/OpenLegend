# Character detail, pose drivers and skin normal shading

| Status      | Current progress                                                                                                                                                                      | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | Accepted target direction recorded for the planned Unreal Engine 5 client switch and character graphics settings; current client remains PlayCanvas 2.22.2 and UE5 migration is open. | 2026-11-21   |

## 1. Purpose and client rendering direction

This specification records the target player-facing graphics settings and rendering strategy for character surface deformation and skin normal maps so body fidelity scales cleanly across hardware without affecting gameplay authority.

- **Current behavior:** The browser client renders on PlayCanvas 2.22.2 using shared 4-bone GPU Linear Blend Skinning (`LBS`), hidden-surface coverage masks under clothing, and base + age skin normal maps in [person-materials.ts](../../../apps/client/src/characters/person-materials.ts). Live joint-angle pose drivers and per-build (`Muscle`/`Fullness`) normal blending are not implemented in runtime gameplay.
- **Planned client direction (Unreal Engine 5):** On November 21, 2026, Mike confirmed that OpenLegend will switch its game client to **Unreal Engine 5 (UE5)**. Authoritative simulation, permissions, AI, world rules and saves remain separate from client rendering; full UE5 client architecture, asset-delivery migration and browser-comparison disposition (`RCP`) remain open design work.

## 2. Live joint-angle pose drivers

Live joint-angle pose drivers (such as raised-arm shoulder, deltoid and flank soft-tissue correctives) are **100% client-side presentation**:

- **Zero server or gameplay impact:** The server never simulates character skin meshes or joint poses. Pose drivers adjust only visual triangle deformation on the player's computer and never alter collision, reach, hitboxes, cognition inputs or permissions.
- **Clean toggle fallback:** Because each corrective is an additive shape offset layered on top of the exact same canonical mesh, skeleton and animation clips, disabling pose drivers falls back cleanly to standard 4-bone GPU skinning with no broken animations or missing assets.
- **Graphics preset and distance gating:** Expose pose drivers as part of a **High / Ultra Character Detail** graphics preset (and/or a dedicated user toggle in graphics settings) combined with **camera-distance gating**—enabled in the character creator and on nearby characters, and automatically skipped on distant crowd NPCs. Stronger PCs get sculpted joint deformation while weaker hardware pays zero cost.
- **Engine path:** In UE5, built-in **Pose Driver (RBF)** nodes in Animation Blueprints provide native live joint-angle correctives. Until a runtime pose driver is enabled and qualified, base character sign-off continues to verify clean 4-bone skinning without relying on unshipped offline morphs ([body workflow §13](../../production-workflows/art-flows/body-reference-family.md#13-cost-performance-and-isolated-experiments)).

## 3. Skin normal maps (UE5 target and PlayCanvas bridge)

Skin normal maps are **required** for character surface detail and must remain enabled rather than dropped to save resources.

- **Unreal Engine 5 target:** Desktop GPU bandwidth, hardware **BC5 normal-map compression** (2-channel normal compression, ~4× smaller in VRAM than uncompressed RGBA), and **Virtual Texture Streaming** (streaming only visible screen-resolution tiles into VRAM) make blending `Muscle`, `Fullness` and `Age` normal maps inside a skin Material routine—matching how Epic's MetaHuman skin shader blends multiple normal maps dynamically. Clean source normal maps still must be baked/authored for the target builds being blended.
- **PlayCanvas browser bridge (while browser client remains active):** [person-materials.ts](../../../apps/client/src/characters/person-materials.ts) already blends base and age normal maps. Adding physique normal detail without a full `age × muscle × fullness` texture grid can use **one shared neutral skin/pore normal map plus one muscular detail normal map blended by `muscle × (1 - fullness)`**, giving peak lean muscular builds crisp surface relief while keeping high-fullness surfaces smooth for one extra texture and shader sample.

## 4. Exposed-body-only normal maps (shading vs. VRAM)

Applying skin normal maps only where skin is actually visible saves work in two distinct layers:

1. **GPU shading work (already avoided under clothing):** When a character wears a shirt, trousers, boots or other opaque garments, OpenLegend's coverage / hidden-surface masks omit the covered body triangles underneath. The GPU never rasterizes those triangles, so covered body parts already pay **zero skin normal-map shading cost**.
2. **VRAM / texture residency:** When an entire body shares one UV texture sheet, the GPU keeps that whole body normal map resident (shared once per character family, not duplicated per NPC) whenever any part of the body is drawn. To avoid keeping covered regions in VRAM until clothing is removed:
   - **UE5 default path:** **Virtual Texture Streaming** handles this automatically at the tile level—covered torso or leg tiles are never streamed into GPU memory unless a character removes the covering garment.
   - **Region-split option (non-virtual-texture fallback or explicit control):** Split body skin textures by anatomical region (`head`, `arms/hands`, `torso`, `legs`) so covered region maps stay unloaded until exposed.

## 5. Open design and qualification items

- Exact camera-distance cutoff distances, fade transitions and Low / Medium / High / Ultra preset definitions for pose drivers and normal-map detail.
- UE5 client migration scope, target hardware profiles, Virtual Texture pool/VRAM budgets, and disposition of the browser PlayCanvas/Three.js renderer comparison (`RCP`).
- Paired visual and frame-time verification of pose drivers and multi-map normal blending once the UE5 character pipeline is running.

## Maintained records

- **Implementation:** [MetaHuman & body controls](../../maintainers/art/metahuman-poc.md#peacock-anatomy-controls), [People pilot](../../maintainers/art/people.md), and [Renderer comparison](../../maintainers/renderer-comparison.md) (UE5 client migration itself is not yet scoped into an implementation tracker).
- **Limits and constraints:** [Adult family and garment fit budgets](../../limits/3d-pixel-art.md#adult-family-and-garment-fit) and [Renderer comparison inventory](../../limits/renderer-comparison.md). No new discretionary runtime limits are introduced here; concrete distance gates and UE5 VRAM/streaming caps remain open until client design.
- **Related contracts/designs:** [People authoring contract](../../projects/people-from-parts-authoring-contract.md), [Body reference-family workflow](../../production-workflows/art-flows/body-reference-family.md#13-cost-performance-and-isolated-experiments), and [Shared world presentation and renderer comparison](../../projects/renderer-comparison-feature-spec.md).

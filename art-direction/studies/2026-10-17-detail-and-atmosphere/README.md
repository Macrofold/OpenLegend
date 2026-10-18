# Detail and atmosphere comparison

Recorded October 17, 2026 UTC. Earlier baseline: `c30bf2758`. The selected treatment gives small subjects finer pixels while retaining adult proportions, with deeper readable shade and quieter color. [Implementation, measured cost and source-access limits](../../../docs/verification/small-subject-art-and-atmosphere.md) · [All earlier iterations](../README.md).

## Light and mood

The actual camp uses the same layout and camera: orthographic zoom 5.5 / pitch 0.68, 1231×468 canvas, Economy shadows. Clear daylight remains sunny; low sun and dusk emphasize warm firelight against cold shade. The first dusk attempt was too dark and is retained below.

| Before | Selected iteration |
| --- | --- |
| [Earlier daylight](https://assets.openlegend.ai/studies/public/blobs/sha256/a9/a919e4e0a7e2b1e302f534b9ac424bd4be45aa83dbdf5831a8307df5360e9113) | [Grounded daylight](https://assets.openlegend.ai/studies/public/blobs/sha256/0a/0aeb281bf7461c8d9dbb3df09b0343fa0b9c2beaba19bb6d0432de093dadd585) |
| [Earlier dusk](https://assets.openlegend.ai/studies/public/blobs/sha256/17/1755e7becd9294a743276f30999b819ca628fd4176d18759d82cafad1348ac59) | [Readable dusk](https://assets.openlegend.ai/studies/public/blobs/sha256/cc/cc532a5deea51f2d624c7ac875c6ba9977d79f7236f4db8d5ee2eab2c991d3b3) |
| | [Low sun](https://assets.openlegend.ai/studies/public/blobs/sha256/84/8443e377c7d3f6c9b0c1e2998aa7c4c7604d3815a987e8d722abaeadaacc3d84) |

![Grounded camp at dusk](https://assets.openlegend.ai/studies/public/blobs/sha256/cc/cc532a5deea51f2d624c7ac875c6ba9977d79f7236f4db8d5ee2eab2c991d3b3)

[Lookout at dusk](https://assets.openlegend.ai/studies/public/blobs/sha256/1a/1a34b081f8886a0abbd1995bd323b535b01055b1915b55dd9de588a1a3d75159) · [Moving camp, 8-second capture](https://assets.openlegend.ai/studies/public/blobs/sha256/a4/a49de95f98ad01dc3fefb87ede158b49f5062ec9a4509d5be6fd29a57f0773d3) · [Rejected first dusk](https://assets.openlegend.ai/studies/public/blobs/sha256/6a/6a6eeb5d7911a92295c812413c8f9b676da32ad7c2cb90d1ed241bb711891f39).

## Small subjects and sources

The bird comparison holds the actual model, body size, light and 1233×450 inspection canvas constant. Ordinary subjects retain 40 samples/metre; small imported subjects use 120, capped by display resolution. The close view shows much more anatomy; the game view honestly exposes the remaining few-pixel screen footprint. No enlarged head or body is used.

| Earlier | Current |
| --- | --- |
| [Bird close, shared density](https://assets.openlegend.ai/studies/public/blobs/sha256/f7/f7d86c75ed5d3d08ac922b17433b30dcf83640737552d006b4c550c400ecf8f1) | [Bird close, finer density](https://assets.openlegend.ai/studies/public/blobs/sha256/99/996d6c07736240c78707e200878560c06aff46eea01df72d573165f65776763d) |
| [Existing angular bear](https://assets.openlegend.ai/studies/public/blobs/sha256/87/87aedbcd9eef2414f29635dcc8af6710af5c788b6c112d7c0822f6ec9a66d082) | Bear replacement still awaiting download access |
| | [Bird at actual game framing](https://assets.openlegend.ai/studies/public/blobs/sha256/cc/ccc95a95e0bc90ef2264956327b5496674fb8ee9f22ce449451e71fc7179c50b) |

[Bird rotation, 8-second capture](https://assets.openlegend.ai/studies/public/blobs/sha256/4f/4f961957f4c6513a917a95377ab78f03444ad752108bd709479d4ae00dd0376f). Sampled edges and coarse shadows still change with viewing angle; these clips are evidence for review, not a blanket no-shimmer claim.

Each new Poly Haven family keeps clear, quiet and weathered finishes plus its normalized original and editable Blender source. The review UI offers them under the corresponding subject names in `/art-study.html`.

- [Chest: all three finishes](https://assets.openlegend.ai/studies/public/blobs/sha256/02/026057ee9bf1c176921b0e694e581bafd34987d1c8f207b396b6fca604e561a5). **Clear** is selected for the existing crate: readable metalwork and convincing wood construction.
- [Boulder: all three finishes](https://assets.openlegend.ai/studies/public/blobs/sha256/f5/f59a9244e16a8c65c937f38f37c06e8fe3835f56b45687abf78b016dda4a89d5). **Quiet** is selected in the inspector: less orange surface noise and a natural irregular silhouette. [Earlier denser geometry](https://assets.openlegend.ai/studies/public/blobs/sha256/d9/d9d16f5b6fa3271ff59877c4b2d6c8b1e2edebb1106a4320a62b6c48545bf1e3) is preserved.
- [Fern: all three finishes](https://assets.openlegend.ai/studies/public/blobs/sha256/3d/3d0f4977df9a1c672e3b6ecebd4add6d4c05701f18d5ea95c893c93601d07faa). **Clear** retains the most leaf detail, but broad planar leaves remain a weakness; it is not adopted into the game scenery.
- [Fallen log: all three finishes](https://assets.openlegend.ai/studies/public/blobs/sha256/43/43e50d4ede46b4d929d0be44b8a9614cacd57439b16aa601a9f79b54c15c1b75). **Clear** retains the best bark detail. This is a narrow fallen trunk, not a standing tree, and remains an inspector candidate.

[Original normalized source control](https://assets.openlegend.ai/studies/public/blobs/sha256/57/5713acbdf24c51bfc48cfb0d91d3af8b2e7903296fe18c3a43efa72619c76602). Same chest, same close camera: [previous shared density](https://assets.openlegend.ai/studies/public/blobs/sha256/9d/9dd96e17116aeedf670b2713d5a7cc169045bb11ba8383ff487f9af2bdad4e70) → [finer item density](https://assets.openlegend.ai/studies/public/blobs/sha256/6a/6a3470567045251f43a1ce0d7169f651507804f1ddd82eb0ad83dbae47ea50e6).

![New chest finishes](https://assets.openlegend.ai/studies/public/blobs/sha256/02/026057ee9bf1c176921b0e694e581bafd34987d1c8f207b396b6fca604e561a5)

The commercially reusable bear candidate requires a Sketchfab sign-in before download; the current angular bear remains unchanged. A different realistic animated demo is noncommercial and was excluded. See the linked implementation report for exact candidates and rights. The new nature studies do not claim to replace every older source in the starting world.

## Revisit and preserve

Run `pnpm exec vite --config apps/client/vite.config.ts --host 127.0.0.1 --port 4175 --strictPort`, then open `/art-study.html` or `/scene-study.html` on that local port. Another free port is fine. The studies do not need a game server or modify saved progress. All old densities, bright woodland lighting and source/asset alternatives remain accessible.

Every meaningful captured candidate from this round is retained here. Browser downloads now carry settings and UTC timestamps; copy subsequent captures into a new dated archive rather than replacing these files. [Capture checksums](capture-manifest.json) identify the retained bytes.

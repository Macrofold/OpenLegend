# Adjustable people — first family proof

## State

Mike rejected these models as a visual and body/clothing proof. The generic faces, hair and clothing fail c01, the selected A · Wayfarer concept. The coverage view replaces visible torso/pelvis regions with coarse garment shells and fails his requirement for an inspectable complete body beneath separate fitted undergarments. The native loading and pose measurements below remain evidence only for those exported files. A [replacement through the art pipeline](../2026-11-05-adjustable-people-redo/README.md) is authorized. These rejected sources, outputs and iterations are privately archived and download/hash-verified. They are not approved for game use or as the replacement's visible body/wardrobe foundation.

## Brief and decisions

Mike accepted the [body and wardrobe design](../../../docs/projects/people-from-parts-feature-spec.md) on November 5, 2026 and authorized the first proof. His required sequence is concepts for his choice, then two contrasting bodies and their intermediate, with the same outfit fitting and moving on all three. This resolves the pilot's design-acceptance gate. Mike selected “A — Wayfarer (Recommended)” through the direction selector. He renewed the existing AWS session for archival.

Character profile, study finish. The concept stage uses three directions, built-in `image_gen`, opaque backgrounds and the [current world direction](../../decisions.md#current-direction-at-a-glance). The built-in tool supplies no explicit model, resolution/quality controls or billing receipt. All three returned images are 1536 × 1024 PNGs. [Exact prompt reconstruction](prompts.json) preserves one shared brief and each direction's suffix. The roster's Higgsfield default was replaced for this concept batch by the host's built-in image tool. This first attempt used no image-to-3D or paid motion jobs. The task spending ceiling is $10, shared across stages. Host concept billing remains unreported; do not assign it a zero-dollar cost. The [replacement ledger](../2026-11-05-adjustable-people-redo/README.md#access-cost-and-preservation) owns subsequent Higgsfield consumption and its estimates.

The coordinator chose unnamed adult proof subjects, independent of the existing cast, with targets of 1.60 m compact/full feminine frame, 1.90 m tall/lean masculine frame and a 1.75 m intermediate. Body shape, skin, hair, camera and coverage are intentionally comparable across directions. The pilot uses one complete anatomical body surface and interpolates the two resolved endpoint shapes by corresponding vertex. The intermediate has zero coordinate residual against their arithmetic mean. Independent controls for frame, fullness, muscle, face and eye colour remain part of the later family design. These mechanics measurements do not qualify the visual art or the complete-body/coverage construction. Generated boards have minor face/hair drift; c01 supplies the visible construction target.

## Concepts

Each board shows three opaque coverage tunics above the same three silhouettes in the proposed outfit. Candidate IDs are stable. c01 is owner-selected; c02 and c03 remain preserved alternatives.

| Candidate | Direction                    | Separate pieces and useful first test                                                                                                                                                                                                             |
| --------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| c01       | A · Wayfarer, owner-selected | Linen shirt, moss-green sleeveless vest, charcoal trousers, calf boots, belt and bronze pendant. The short vest exposes body proportions and keeps the first soft-garment fit straightforward. The buckle or pendant supplies a rigid attachment. |
| c02       | B · Quilted Watch            | Shirt, rust-red quilted jack, small strapped steel breastplate, trousers, boots and belt. Tests layered padding and a rigid shell, with more construction and repair work.                                                                        |
| c03       | C · Fieldworker              | Ochre wrap-front tunic, separate dark shoulder yoke, trousers, ankle boots, belt and pendant. Tests diagonal closure, full-waist clearance and a longer split hem.                                                                                |

The local working files are under `/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-05-adjustable-people-proof/study/`, with the boards and full submitted `prompts.json` in `concepts/`. Their private publication is owner `collection/art-studies`, asset `adjustable-people-proof`, revision `concepts-2026-11-05`, manifest SHA-256 `c70609237948e3544d8d27d0f2184c3313d8ae30f8fa1b95d682cf97cf138ac1`. All four files, 6,556,649 bytes, passed authenticated download/hash verification.

| File                  | SHA-256                                                          |   Bytes |
| --------------------- | ---------------------------------------------------------------- | ------: |
| c01-wayfarer.png      | c5af40e413559a48aec8ec4bec0a8672f785bd00b5a9ef07b1f57a36aba9d891 | 2204146 |
| c02-quilted-watch.png | 2f276ac3444ff4c31bf5ff66463e26168c13c021bbf23b00206c320f8292335e | 2161963 |
| c03-fieldworker.png   | bc85010b77143e8d21f9a4ca1a9581e4074e74a63e38b97c2e1d762d158521fe | 2181121 |
| prompts.json          | 3620a2fbbea7dcc64abbbf65750c63fc273f69dcd72d9e5acc6c217de1ed9643 |    9419 |

## Source, construction and proof

Quaternius was compared first through its official Standard listing and preview. The available free examples showed superhero anatomy, while regular/source models were advertised separately. No Quaternius mesh was acquired or technically qualified. The selected foundation is the official [Blender Human Base Meshes 1.4.1 bundle](https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip). Its embedded README declares the assets CC0. Preserve that evidence with the originals. An unrelated bundled license concerns Rain Rig, which the extracted template does not contain.

The two realistic bodies each have 10,582 corresponding vertices and matching indexed edges/faces. Polygon ordering differs. The pilot uses male polygon ordering consistently for every mask and binding, with female coordinates by corresponding vertex index. The normalized template preserves the original body UVs. Derived proof meshes use solid material regions. The editable master keeps the intact canonical anatomy and endpoint shape keys, the three evaluated rest rigs, separate outfit pieces and coverage assemblies.

The compact endpoint broadens the source waist/hips and soft-tissue depth, then resolves stature to 1.60 m. The tall endpoint uses the male source with a small chest-breadth adjustment and resolves stature to 1.90 m. The middle body averages their final coordinates. Rig landmarks interpolate with the body and initialize a distinct 22-joint skeleton for each wearer. Approximate source joint landmarks were inspected through the posed exports. Each wearer's one pose drives their body and garments.

One canonical source-face selection and vertex binding is reused for each shirt, vest and trousers. Garment fit carries normal clearance, torso-only drape and the same surface relaxation to each wearer. Torso projection excludes arm vertices. The belt fits the actual vest triangles with a 4 mm offset and interpolated skin weights. The buckle uses its front support's weights. Boots use the same shaped construction rings fitted to the wearer's ankle/foot dimensions. Hair, eyes, brows and pendant are separate fitted geometry. The pilot shares the dark brown hair pigment with the iris to stay within eight dressed materials.

Unseen construction is a plain vest back, continuous shirt sleeves, an independent belt and paired calf boots. The concept mismatch requires replacement modeling and clothing construction. It exceeds a material or edge finish pass. Removing the dressed assembly reveals a separate opaque tunic and liners. Covered and dressed exports are both preserved.

| Wearer       | Measured bare stature | Dressed / covered triangles | Exported joints | Dressed materials |
| ------------ | --------------------: | --------------------------: | --------------: | ----------------: |
| Compact      |            1.600000 m |             26,968 / 28,604 |              22 |                 8 |
| Intermediate |            1.749872 m |             26,968 / 28,604 |              22 |                 8 |
| Tall         |            1.900000 m |             26,968 / 28,604 |              22 |                 8 |

The intermediate's uppermost/lowest vertices make its bounds 0.128 mm below the 1.75 m target despite exact coordinate interpolation. Its label rounds to 1.75 m. Covered exports use four materials. Each GLB is below 0.97 MB. Counts and actual exported hashes are in the prepared study manifest and native inspection receipt.

The [existing motion authoring owner](../../../scripts/art/art-tool.py) retargets retained mercenary Walk/Run rotations, pelvis displacement, planted feet and stride into each evaluated rig. Upright Idle, forward Reach and a moderate Crouch are authored offline. Crouch translates the pelvis in its correct local basis to retain foot contact. Export slides animation starts to zero. Actual clip durations are Idle 2 s, Walk 1.166667 s, Run 0.7 s, and Reach/Crouch 3 s. Source motion is sampled at 30 keys/s. The video samples every other Blender frame at 15 fps, independently of runtime animation playback.

Blender 5.2.3 produced the editable master, six GLBs, front/profile/back and posed images, and 187 actual rendered video frames. PlayCanvas 2.22.2 with Chromium 145.0.7632.6 and SwiftShader loaded all six exports. All 30 body/clip phase comparisons changed pixels without browser or GL errors. An independent agent inspected front, quarter, back and profile motion for sleeve continuity, coverage and belt fit. The final sleeve holes and floating rear belt are resolved. These checks establish the sampled mechanical proof. The full independent slider envelope, a deep seat, speech/expression deformation, game-camera acceptance and real-device/crowd cost remain unqualified.

## Working files and resume

The external study workspace above contains:

- `work/wayfarer-family.blend` and `body-template.blend` for editable bodies, rigs and separate parts. `author-wayfarer.py` and `render-wayfarer.py` reproduce fitting, export and captures from the pinned sources and current checkout's existing art helper. First-party recipe code follows the repository's AGPL-3.0-only license; source anatomy retains CC0.
- `export/{compact,midpoint,tall}-{covered,dressed}.glb` and `assembly-receipt.json` for the six posed deliveries and per-wearer stride facts.
- `review/wayfarer-motion.mp4`, the `wayfarer-*.png` construction/pose views, `fitting-measurements.json`, `playcanvas-export-check.json` and native `playcanvas-*.png` captures. Failed meaningful fit iterations are preserved under `review/f01…f05`; invalid early framebuffer checks are labelled separately.
- The retained `review/serve-proof.cjs` and viewer inspect these GLBs with Covered/Dressed, five motions and four camera angles. The replacement uses the same loopback address; a current page there is not this archived proof. Local process records remain outside archived provenance.
- `review/archival/` holds the original frozen source/study/iteration files. The replacement workspace's `work/archive/` holds the published manifests, indexes and readback receipts, with the rejection recorded in their metadata.

All archived identities have owner `collection/art-studies`. The source and study revision is `wayfarer-2026-11-05`; the iterations revision is `f01-f05-2026-11-05`. Normal private publication and complete authenticated download/hash checks passed.

| Asset ID                           | Boundary                    |   Files / bytes | Archived manifest SHA-256                                        |
| ---------------------------------- | --------------------------- | --------------: | ---------------------------------------------------------------- |
| adjustable-people-proof-sources    | art-library/curated-private | 21 / 16,010,529 | d9b6692f5531741927e45aabaebb52041e226da2b4e13a7cebe344ebd6544de6 |
| adjustable-people-proof            | art-studies/curated-private | 28 / 22,958,473 | 1eea3e6764b3848abc141178db1beb1f6a17c207156220fb3368588a6a87649c |
| adjustable-people-proof-iterations | art-studies/curated-private | 88 / 72,572,947 | 8839b47206dda89d0c2b7b4323fdce6d80fefb067e60859bb4a0e7b36b3311ae |

The populated shared authority resolves the selected public studies release and the operator's existing private permissions. No catalogue recovery, bootstrap, permission reseeding or game synchronization was performed for this art task. [AS09](../../../docs/maintainers/game-asset-storage.md#as09--shared-asset-authority-across-machines) retains cross-machine game/sync qualification. These preservation approvals grant no runtime use or acceptance of the rejected art.

Mike rejected the body and outfit and authorized the linked replacement. [AF10 and the people tracker](../../../docs/maintainers/art/people.md) own the pilot and subsequent family qualification. Broader independent controls, wardrobe slots and game integration retain their existing gates.

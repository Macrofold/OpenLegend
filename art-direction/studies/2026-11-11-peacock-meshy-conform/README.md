# Peacock Mercenary Meshy-to-MetaHuman review

Body and face comparisons are ready for Mike's review. Meshy yields closer body geometry and the closest face likeness in the study. The native fit produces a usable body candidate. A combined fit that preserves both stature and face remains open. Hair and beard remain separate. Costume work awaits review under [MHP08](../../../docs/maintainers/art/metahuman-poc.md#peacock-likeness-follow-through).

## Sources and method

The exact supplied body and bald head sheets and six crops are retained with crop bounds and hashes. Two Meshy multi-image-to-3D jobs ran through Higgsfield with textures enabled and PBR and remeshing disabled. The body used front, profile and back and requested A-pose. The head used front, profile and three-quarter. The reference profile shows lowered arms. The generated body has a coherent low A-pose across angles and no obvious shoulder or arm twist. Pose and perspective limit precise shoulder comparisons.

| Target | Job ID                                 | Raw GLB triangles |
| ------ | -------------------------------------- | ----------------: |
| Body   | `3849d363-4c5b-42ed-8d93-313ccfd3bd18` |           168,116 |
| Head   | `225bdec7-a7b2-40f4-87e8-72ac5016fa6b` |           250,858 |

Both raw models were reviewed before fitting. The body fit uses exposed anatomy and excludes the fused shorts and bearded head. The pelvis under the shorts is inferred. The clean-shaven head sheet supplies the jaw and mouth interpretation. The separate working head excludes the lower bust and is registered at about 24 cm crown to chin against a 203.5 cm planned stature. Unreal Engine 5.8.4's native MetaHuman Creator **From Custom Mesh** workflow fits the body first, then solves the head with tracked facial contours. The [previous sculpt](../2026-11-11-peacock-likeness-redo/README.md) remains the exact comparison control.

## Visual and technical results

- **Body.** The first native pair measures 203.21 cm. Its chest width and depth and waist taper approach the supplied sheet, and it removes the most conspicuous carved pecs and knee creases in the raw output. The shoulders still read wide in the A-pose, and the back and abdomen are softer than the reference. The clay comparison uses separate studio coverage.
- **Face.** Raw Meshy retains the brow, cheekbones, forehead slope and jaw most convincingly. It exaggerates the scowl, scars and eyelid folds. The first native fit loses nose projection and ear shape that the previous sculpt retains. Head-only alignment recovers much of the nose, ears and jaw, with softer brow and cheek planes, and shrinks its paired body to 177.48 cm. The paired-target retry brings stature to 208.88 cm and severely distorts the face. The strongest face and body therefore remain separate review results.
- **Neck.** In the first combined export, all 92 sampled LOD0 head and body seam points stay within 0.001 mm in neutral and during a 25° head turn. Blender evaluates the native exported armatures separately. This verifies the local exported join and turn. It leaves facial animation, game rendering and clothing fit unqualified.

## Preservation

The [private archive index](meshy-conform-review.index.json) selects `Peacock-Meshy-MetaHuman-review.zip`. It contains the exact input sheets, raw models, previous sculpt, isolated native authoring project, four fit stages, matched comparison sheets and neck evidence. A fresh permission-checked workspace restored the 142,794,697-byte archive and matched all 81 payload hashes and the inventory. A separate full read matched the recorded S3 object version. The study's main review plates are `compare/body-meshy-conform-comparison.png` and `compare/head-best-fit-comparison.png`.

The two jobs consumed 60 credits from a balance of 357.75, leaving 297.75. The estimated plan value is $2.34–$2.94 at $0.039–$0.049 per credit. The body and head outputs were retained about six and twelve minutes after submission, respectively, with overlapping waits. Native fitting ran locally. Private archive clients closed after 73 seconds. The modeled maximum database compute for the session and idle tail is about $0.07 plus separate transfer, storage and request charges. Actual AWS billing is unmeasured.

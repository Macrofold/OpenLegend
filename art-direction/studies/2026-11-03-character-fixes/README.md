# Character fixes — upright stance, sculpted faces and hair, the mercenary's seam lines

## State

Created, checked, archived privately, and published in the public studies and the hosted study pages. Just before the move into the game went out, Mike found the new heads' necks broken mid-run and the run hunched. On the fixed files he then found Kest's neck jutting forward, a hump and a chest like small breasts. All of it is fixed in the study files, with every person judged whole through their strides ([The head and neck, and the run's back](#the-head-and-neck-and-the-runs-back)). Mike then rejected the MakeHuman bodies themselves, so only Ada and Mara Reed move into the game, on their sheet models; Kest, Tavin Vale, Orin, Mike and the mercenary keep the files the game has ([Into the game](#into-the-game)). Ada's and Mara's game files are in the development runtime release (November 5); the rebuilt study files wait for his look.

- **Owner choice:** Mike picked Sela's route B on November 4, 2026, asked for the rest of the cast's faces, had the finished study published the same day ("Yes, publish"), then asked for the fixes in the game ("Yes, move them").
- **Archive:** both batches are archived privately (Resume). The fixed files are not archived yet.
- **Published:** the 49 changed or new models and the catalog are in the public studies release, and the game's art-inspector link opens hosted pages built from it (Resume). They are the files from before the neck and back fixes.
- **In the game:** Ada's and Mara's sheet models replace their MakeHuman outfits in the development runtime release of November 5 ([Into the game](#into-the-game)). Everyone else still plays the November 1 motion files, and the mercenary his earlier textures.

## Brief

- **Request (Mike, November 3, 2026),** reviewing the [character heights study](../2026-11-03-character-heights/README.md) close up in Smooth 3D:
  - "the characters look horrible their faces are just textures on a smooth surface";
  - "peacock mercenary is the only one with facial structure, but there's lines everywhere";
  - "sela tern looks like something out of a horror movie. Also why is the main stance this hunched over homeless/zombie looking thing";
  - "The human maker models look like neanderthals and ape-like and their bodies are completely deformed";
  - "Maer Fen sheet model actually looks good overall, but the others models for him have deformed faces";
  - "Ada, mara, sela tern, Ser Jessa, all have flat faces";
  - "Also how can we do hair better?"
- **Authorization:** to the three proposed fixes, "Yes, all three". They were:
  - an upright stance for everyone;
  - the mercenary's texture re-cut;
  - a face-and-hair test on Sela, with two face routes and sculpted hair, for about $3.
- **Settings:** character profile, study finish, simple path; `faithful` to each person's sheet; nothing published until Mike has seen it.
- **Look:** [current direction](../../decisions.md#current-direction-at-a-glance). Real proportions; sculpted faces and hair; no baked lighting; people reviewed close up in Smooth 3D as well as in the game's look.

## Stance

**Why everyone hunched.** Measured on the rigs, not read from the pictures:

- **The shared `Idle` was the main cause.** It was Meshy's library Idle (ID 0), taken from proof-run Maer Fen's rig. Relative to his upright rest it:
  - leans the body about 8° forward;
  - nods the head 13°;
  - bends the knees;
  - is a look-around clip: within its 4 s loop the hips turn up to 80°, the chest 85° and the head about 130°.

  The art study's default Frozen pose is that clip's first frame. Library `Idle_02` (ID 11) is calm but keeps the pelvis turned 23°.
- **MakeHuman (MPFB) legs copied falsely bent knees.** Meshy's automatic rig puts the knee joint in front of a straight leg: about 10 cm on the clip rig, so its leg joints read 28° bent at rest (48° on proof-run Ada). The clip tool turned MPFB thighs and shins to those joint directions, so MPFB people crouched about 37° in Idle and 28° in a pose that should stand straight. With bent knees, forward lean and hanging, spread fingers, that made most of the ape look.
- **Correction to what Mike was told on November 3:** moving clips between rigs does not add 6–10° of lean. That figure compared spine joint lines. A plumb line through the ankle meets the ear on every cast body at rest, while Meshy's spine joints lean back 5° inside an upright body. Relative to each body's own rest, the transfer added about 3° on MPFB bodies and nothing measurable on Meshy-rigged ones. The lean comes from the clips themselves.

**What changed:**

- **An authored upright `Idle`, k01** (`work/recipes/upright-idle.py`), on the clip rig. It is a 6 s loop at 30 fps:
  - torso, neck and head at the body's own upright rest;
  - hips 4 mm lower, so the knees soften about 2°. The first try at 8 mm sank MakeHuman feet 9 mm;
  - arms hanging 9° out and 3° forward, with 14° at the elbow;
  - two breaths, one slow side-to-side weight shift with the feet held by a two-bone IK, small head drift, and an arm sway that trails the shift.

  Every value is a reversible agent choice.
- **The clip tool, `art-tool.py clips`, places legs instead of copying their turns.** Each ankle follows its clip ankle's path, scaled like the root's travel, and the knee is solved in the plane the turned leg chose.
  - **No leg reaches past its standing length**, so no knee straightens past the body's own standing angle. When the clip rig's falsely bent knees straighten (Wave, a run's push-off), the foot falls short for those frames. A first version lowered the hips per frame instead; it made them jump up to 11 cm between frames and plunged Ada's hips 43 cm at a sprint push-off.
  - **No ankle goes below its standing height.** The library's Wave, Punch and Dodge sink the clip rig's own feet up to 4 cm.
  - **A foot pitches up before a toe would sink.**
  - **Every clip stands on the ground.** One constant offset per clip lowers it until its lowest foot point stands where the foot rests. The library clip rig floats 2–7 cm in Walk, Run and Sprint, and its hips rise in Wave.

  The [technical design](../../../docs/projects/art-workflow-tech-design.md#44-clips-give-a-rig-the-clips-the-game-plays) has the contract.
- **The MPFB bone map, [`mpfb-meshy.json`](../../../scripts/art/bone-maps/mpfb-meshy.json):**
  - legs are no longer aligned to Meshy's rest;
  - a new `relax` hold curls the fingers gently, from 8–12° at the thumb to 22–28° at the little finger.
- **Rebuilt files:** all 26 rigged cast files and the mercenary's game motion file, from the [character motion study](../2026-10-31-character-motion/README.md)'s clip sources, with k01 as `Idle`. They were rebuilt again on November 4 with each foot held still while down ([Planted feet](#planted-feet)).

**Measured on all 29 rebuilt files** (the 26 people, the mercenary's motion and both Sela routes; `work/tools/ranges.py`, every frame of every clip). The results in `review/stance/ranges-new.txt` and, after planting, `review/stance/ranges-planted.txt` read the same:

| Check | Result |
| --- | --- |
| Torso in Idle | Within 1° of each body's rest |
| Knees in Idle | 2–4° softer than rest |
| Knees in any clip | Never straighter than the body's own standing angle |
| Hips between frames | At most 2.9 cm (the source clips: 2.8) |
| Ankles | At most 0.7 cm below standing height, within the measurement's rounding |
| Toes | At most 1.6 cm below standing height (a Sprint frame on MPFB bodies) |
| Feet in Walk, Run and Sprint | Touch the ground: the lowest point is within 0.7 cm of standing |

Before the change, Mara's Idle had the knees at 143° against 172.6° at rest and the head 18 cm ahead of the pelvis.

## Sela's face and hair

**Views and heads** (paid, all through Higgsfield):

- **v01, four close-up views:** front, left, right and back of her head and neck. GPT Image 2.5, high, 2K, 3:4, with her sheet as identity reference and the front view as reference for the other three. Prompts are in `views/`.
  - Jobs: front `bc0623eb-647d-4405-809c-3629e28e8d3f`, left `2fe4938b-7e7c-4fc2-9863-5a9dc7557955`, right `c3ced5ee-87cc-4b56-8770-629f1644040e`, back `b9c5c627-7215-42cb-81e9-0b840f68648b`.
- **m01, Tripo H3.1 Multiview:** from v01 in the order left, back, right, front, with detailed geometry and texture, geometry-aligned texture, no PBR and a face limit of 20,000. Job `56669168-c53d-4604-a3fe-93765601015d`, 19,372 triangles, one 4096² map.
  - **Picked:** a sculpted face (nose, brows, lips, cheekbones) and hair sculpted as locks, with the centre parting and a low bun.
- **m02, Hunyuan3D v3:** from the front view, face count 40,000 (its minimum). Job `aea5b2c9-6cf8-430a-8d0f-2f27d6a02b55`.
  - **Not picked:** a strong face, but a smooth helmet of hair with two lumps at the back, and red-blotched cheeks.

**Route B, f28: the generated head on her body** (`work/recipes/sela/route-b.py`):

- **Fit:** m01 at scale 0.41, with its eye line on her old painted eye line and its eye surface at the old face's front. Landmarks were read from front and side renders at known scale.
- **Old head removed:** 779 faces of skull, face, the hair shell behind it, nape and throat. The scarf's rust red is kept, but nothing in the face or above 1.665 m counts as scarf: 35 rosy cheek faces passed for scarf red and could show through in motion. The route A agent found that.
- **Neck:** cut at 1.555 m inside the scarf, and skinned from `neck` to `Head` across the Head joint.
- **Texture:** the head's map is reduced to 2048².

**Route A, f29: a MakeHuman head shape under her own painted face** (`work/recipes/sela/route-a.py`, built by a parallel agent):

- **Head:** Mara Reed's library head, the cast's middle-aged woman, scaled 0.912 to route B's 6.1 cm eye spacing and set 8 mm above the painted eye line. Eye-aligned, its jaw sawed through the scarf's top edge.
- **Paint on the shape:** her painted face is compact (eyes to chin 7.9 cm, against 10.9 cm on the fitted face). The paint is stretched onto the shape through a smooth warp of 12 landmarks, rather than squashing the face to fit. A bake along surface normals smeared the lips and streaked the jaw.
  - **Temples:** her old paint has hair hanging there, below the generated hairline, so those areas are inpainted from the surrounding painted skin.
  - **Eyes:** the MakeHuman eyeballs carry her painted grey-green irises.
- **Hair:** the generated head's hair, separated from its face by colour outside a face oval and placed exactly as route B places that head, with 669 scalp vertices tucked under it.
- **Neck:** 208 neck and jaw faces outside the scarf removed, and the lower neck tapered so the scarf wraps it.
- **Textures:** her body's 2048² map, plus 1024² for the face, 512² for the eyes and 1024² for the hair.

**Measured faces** (`posture/face.py` method, front ray casts at rest):

| | Old head | Route A | Route B | Mercenary |
| --- | --- | --- | --- | --- |
| Nose ahead of eyes | 0.3 cm | 2.1 cm | 3.2 cm | 3.4 cm |
| Brow ahead of eyes | 0.3 cm | 0.8 cm | 1.3 cm | |
| Nose ahead of cheeks | 2.1 cm | 3.2 cm | 4.7 cm | |

**Agent recommendation: route B.** Route A has real structure under her own paint, but:

- the old paint is low-resolution and carries its own painted shading, so on a real shape it reads soft, flat and mask-like, with patchy edges at the cheeks and a faint seam at her right temple;
- the MakeHuman face reads young in clay;
- the ears carry the old painted hair;
- a few scarf shards cut the jaw sides close up.

Route A's real advantage is the MakeHuman layout: shared sliders and blinking later. It would want fresh paint made for that layout.

**The braid** (`work/recipes/sela/braid.py`, shared by both routes):

- **Shape:** one thick three-strand braid from the bun, round the right side of her neck and over the right shoulder, laid 4 mm above the scarf and chest and ending in a leather tie and a tuft, as on her sheet.
- **Geometry:** strands follow the classic braid figure, with lateral swing sin t and depth sin 2t / 2, the three strands 120° apart. They taper from 5.6 to 3.8 cm wide. 8,256 triangles, 64 cm long.
- **Colour** is material, not light: four bands running along the strands, taken from the generated hair's tones (a band texture read with closest sampling).
- **Bones:** `braid_1`–`braid_3` hang from the chest bone (`Spine`), so the braid rests on her when she turns her head. Where it leaves the bun it blends into `Head`.

**The swing** (`work/recipes/sela/braid-swing.py`) is baked into every clip:

- **Model:** each bone tip is a damped spring towards the rest shape, with gravity measured against the body's rest orientation. Lengths stay fixed, and no tip passes behind the chest.
- **Loops:** looping clips run three cycles and keep the last, closing within 2.7 mm.
- **Tip travel from rigid:** Idle 0.5 cm, Walk 6.6 cm, Run 9.5 cm, Sprint 21.8 cm, Attack 26.8 cm, with the planted feet and straighter back ([below](#the-head-and-neck-and-the-runs-back)); the first build swung up to 28.1 cm.

## The mercenary's seam lines

The lines were the borders of the 5,995 separately painted pieces of his body texture, of 6,033 on the whole model.

**What a parallel agent did,** with the recipe in `work/mercenary/RECIPE.md`:

- One new layout for the shared body of all three study variants (restored, tailored, embroidered): 214 pieces, of which 48 are large, 8 small and 158 single triangles at folds and non-manifold edges.
- Each variant's paint re-sampled from its own old piece, nearest texel, at 2048².
- Colour jumps between same-hue pieces levelled with a small local offset: about 85% gone, with regional colour moving at most 0.006 luminance.
- Every empty texel padded so mipmaps never mix in background.

Mesh, cape, eyes, materials and names are unchanged, and the recipe reproduces the files byte for byte.

**Results:**

- **Sharpness:** 95% of the body is at least 0.92× as sharp as before, and the median is 1.8× sharper.
- **Left in place:**
  - two faint forehead strokes, painted wrinkles inside single old pieces;
  - a small orange patch at the inner right brow;
  - faint steps between some mail pieces, where borders change hue;
  - the mesh's own faceting in beard and mail;
  - a few ear fold lines lost along old borders.
- **The game's runtime `mercenary.glb` shares this body layout exactly:** its 31,114 triangles are in the same order and all its texture coordinates match. The same layout could carry its three runtime paints after baking. Nothing in the runtime files changed.

## Faces for the rest of the cast

**Request (Mike, November 4, 2026),** after seeing Sela's routes: "Excellent Sela Tern generated head looks great. What did you have to do there? Make sure to encode learnings in all the right docs and in our art workflow". Then: "Fix all the other faces now". Route B is Sela's pick, and the catalog shows it as her working selection.

**Who:** every person whose face was paint on a smooth head or the stock MakeHuman face:

- **Ada, Mara Reed and Ser Jessa Cairn:** heads from their sheets. Each goes on the sheet model, and Ada's and Mara's also go on their three library outfits, which the game uses for them.
- **Tavin Vale, Kest, Orin and Mike:** heads from written descriptions, since they have no sheets, so their faces are proposals. Each goes on all three outfits.
- **Unchanged:**
  - Sela (route B);
  - the Peacock Mercenary, already sculpted;
  - Maer Fen's sheet model, which Mike called good;
  - the proof run's Meshy, Tripo and cropped-sheet candidates, which stay as comparisons.

**Views, v02–v08** (`views/`, recipe `work/recipes/heads/views.py`): made as Sela's v01, with the same GPT Image 2.5 settings and prompts (`v02-v08.plan.json` names each person's sheet).

- **Braids:** Ada's and Mara's fronts put their braids over a shoulder (Ada's left, Mara's right) instead of down the back as asked. Their side prompts were rewritten to match, and their right views generated.
- **Mirroring:** the four men's right views are their left views mirrored.

| Person | Front | Left | Right | Back | Head (Tripo) |
| --- | --- | --- | --- | --- | --- |
| Ada | `12c97d10-705f-4aa6-8679-aca081f396ce` | `1a763a69-b988-496f-9a37-54591002160f` | `55bc7818-d0b6-4bce-aea1-439c4cb11e18` | `ff17242b-3a12-49ad-81bb-b984d52d3c73` | `77114f5a-aa03-4e36-94df-9dba9465e0ae` |
| Mara Reed | `8ad35ffe-3e53-4235-b94f-e23b9b1c9830` | `8ad8b239-d449-4d9b-b66f-3d075441fa25` | `52be531f-a5ff-4f5b-9fad-5d72d51ae401` | `3f1c3279-013c-4486-80d9-bb7d1bc26a65` | `8b61bde7-7390-4d48-8968-89f8689cae8b` |
| Ser Jessa Cairn | `199140aa-b657-405f-a410-fbf07340a5ea` | `04512689-27a9-49d9-803a-9c72e5282dcd` | `9f62294a-a772-411d-9bbf-92308ac5b735` | `295404d5-4000-4d89-a260-5e13652f1cea` | `c18c94eb-be64-43cb-ab55-b33165ec276d` |
| Tavin Vale | `866b024d-cff6-4b5c-8c3f-21028754cfab` | `69995e61-38ea-446b-b969-c12c815bead0` | mirrored | `85ba35b1-8041-4b19-be47-8ba9411ef92e` | `0f04c4bc-c11f-473c-8c49-ec8a21f94af2` |
| Kest | `dc5f3a4a-07e3-4352-b518-71c7c7f9203f` | `af085309-cf23-4542-8519-eef56833639c` | mirrored | `03ec6a47-e208-4db5-8c1f-ad3414d54f51` | `57adeecb-a1d1-404e-b7e2-c8bcb1696eac` |
| Orin | `12ba7e69-2764-461a-8870-a4cb759d6678` | `3c0e4236-9471-45a5-9f1a-766d1981519b` | mirrored | `97af4b66-eb53-4f7d-9b6b-dacac6453cb0` | `4030f4aa-7d2f-40a8-87ce-d276b5a74d3e` |
| Mike | `c2d07d49-4e4f-42c9-97a4-23131dca7cd0` | `00c73608-0e4c-446f-9daf-bfa8396242ce` | mirrored | `3067e2ae-d0fe-45fc-8cbd-fd368c11f403` | `6cca042d-dc8c-4734-9e7d-27b2d17d0602` |

**Heads, m03–m09** (`models/`, recipe `work/recipes/heads/models.py`): Tripo H3.1 Multiview with Sela's m01 settings, 16,926–19,224 triangles and one 4096² map each.

- **Concurrency:** seven sent at once had created no job after 17 minutes and charged nothing. Stopped and sent one or two at a time, each took about 3.5 minutes.

**The graft, f30–f50** (`export/heads/`): the new `head` command of the art tool ([design](../../../docs/projects/art-workflow-tech-design.md#45-head-give-a-body-a-sculpted-head)), run on each person's motion files by `work/recipes/heads/graft.py`. `work/recipes/heads/heads.json` holds the landmarks and settings:

- **Landmarks:** each pupil is the darkest spot near its eye in a front render (`review/heads/landmarks/heads/pupils.jpg`). A reading by eye on a grid was 8 px off per side on Kest, which would have made his head 11% small. The front of the eyes, chin and crown come from the side renders.
- **Scale:**
  - MakeHuman bodies: the ratio of pupil spacings, with their eyes found from the eye bones. That also lands each new crown where the old head's was.
  - Sheet models: the old head's chin-to-crown height, as Sela's route B used; for Mara this agrees with her painted eye spacing within 1.4%.
- **Cut:** on the 1.85 m MakeHuman bodies, about 4 cm below the front of each person's lowest outfit neckline (1.50–1.54 m) and at least 1 cm above the bottom of the bust as placed on that outfit: Ada 1.48 m, Mara 1.49, Kest 1.50 (his bust ends at 1.48–1.49), Orin 1.46, Tavin 1.475, 1.47 and 1.48, and Mike 1.465, 1.47 and 1.48 in the field tunic, travel coat and work vest. The sheet models keep 1.53 m, 1.54 m and 1.62 m for Ada, Mara and Jessa, the last inside her cowl and mail, which stay.
- **Skin:** the MakeHuman bodies' skin paint is tinted to each new neck, ×0.63–1.13 per channel.

**Found and fixed along the way**, now in the tool and the [head pass](../../../docs/production-workflows/art-flows/3d-models.md#give-a-person-a-generated-head):

- **Crumpled face:** glTF splits vertices along texture seams, so the whole face read as open edges and was drawn towards the old skin. The tool now merges vertices first.
- **Crown flap:** generated hair locks are open sheets. Drawing their edges out to the old head's larger shell raised a flap at Ada's crown; only the cut's edge moves now.
- **Collar shards:** removing covered faces of any bone by colour cut Ada's hood in shards, because its brown-grey is close to her hair's. Now only head, neck and spine skin goes, never shoulders.
- **Old hair left behind:**
  - MakeHuman ponytails and braids hang partly on the spine and shoulders, so a "head only" rule kept their tails, and a "half on the head" rule took a whole body (its dense face is half its vertices).
  - A head part is now at least a tenth on the head and at most a tenth on a limb. A long braid is 21% and 0%, a body 53% and 42%.
- **Undershirt:** stripping the views' grey undershirt left the old neck showing, in another colour, between its neckline and the clothing. It stays, fitted onto the body under the clothing ([The head and neck, and the run's back](#the-head-and-neck-and-the-runs-back)), and at an open neckline it reads as an undershirt.
- **Skin tint:**
  - Sampling only light skin missed Tavin's dark skin.
  - Sampling all warm colours counted Ada's and Mara's brown braids and darkened their bodies by half.
  - It now takes the lighter half of the warm samples on each side.
- **One-mesh bodies:** tinting them by colour also shifted clothing, so they are not tinted.
- **Clip timing:** the first heads were exported at Blender's 24 fps, which resampled their 30 fps clips and cut the 0.7 s run loop to 0.667 s, dropping the frame that closes it. The command now keeps the body's own rate, and every head was rebuilt on November 4. Their clips now match their bodies' lengths, within 0.22° and a fraction of a millimetre.
- **Not defects:** the dark band behind Tavin's, Mara's and Orin's necks in some outfits is the work vest's and travel coat's own standing back collar.

**Measured faces** (`work/tools/face.py`, `review/heads/face.json`), nose ahead of the eyes:

| Person | Before | After, sheet model | After, library outfits |
| --- | --- | --- | --- |
| Ada | 1.0 cm (sheet) | 2.1 cm | 3.7 cm |
| Mara Reed | 1.3 cm (sheet), 1.9 cm (field tunic) | 2.3 cm | 2.8 cm |
| Ser Jessa Cairn | 0.1 cm (sheet) | 2.3 cm | |
| Tavin Vale | 2.5 cm (travel coat) | | 2.9 cm |
| Kest | 2.4 cm (field tunic) | | 4.0 cm |
| Orin | not measured | | 2.8 cm |
| Mike | not measured | | 4.0 cm |

For comparison, Sela's route B measures 3.2 cm and the mercenary 3.4 cm. The sheet models' painted heads were small (about 1:9 of the body), so their new heads are too, and measure lower.

**Checked:**

- **Close renders:** every person's working selection rendered painted and as clay, front, three-quarter and back (`review/heads/faces-before-after.png`, `review/heads/renders/`).
- **Motion:** head-and-shoulders frames mid-clip in Idle, Walk, Attack, Wave and Sprint for Ada's and Jessa's sheet models, Tavin's work vest and Kest's field tunic (`review/heads/motion/motion-sheet.jpg`). The seams held and the cowl, hood and collars stayed whole.
- **Clips:** all 21 files kept their eight clips, at their bodies' lengths since the November 4 rebuild.
- **Viewer:** the files load in the local art study, where each person's subject lists them as "generated head" versions, and Ada's renders correctly close up in Smooth 3D.

## Planted feet

**Found** while moving the fixes into the game. The upright clips stand on the ground, and that showed their feet sliding. The library's feet speed up under the hips through each stance (a sprint foot from about 4 to 11 m/s while down), and the earlier clips' feet had floated and touched for a frame. In the scene study's game travel (the camp: Ada, Mara Reed, Tavin Vale and the mercenary), planted toes slid a median 43% of body speed, against 14% for the published November 1 files.

**The fix, in `art-tool.py clips`** ([design](../../../docs/projects/art-workflow-tech-design.md#44-clips-give-a-rig-the-clips-the-game-plays)):

- In a stride, a foot is down while its toes are within 4 cm of their lowest and move back under the hips. Through each run of at least three such frames the toes move at one steady speed, from where they land to where they lift.
- The library walk never sets its feet flat: its toes hover 1–3 cm through each stance and reach the floor only as the foot rolls off them, which a 1.5 cm band missed.
- The ground speed is measured as before, on the clip after planting. Pacing to the planted stretch alone sped up the mercenary's sprint, whose feet touch for one frame each, and slid his left foot 80% of body speed.

Every cast file, both Sela routes, the mercenary's motion and all 39 head files were rebuilt with it; the stance checks above read the same.

**Measured** in the scene study's game travel: the game's own code, 60 fps in headless Chrome on Mike's Mac, steady travel at 6.6 m/s, drift per contact as a share of body speed:

| Files | Camp: median (contacts) | 90th percentile | Watchpost (Kest, Orin) |
| --- | --- | --- | --- |
| Published November 1 | 14% (15) | 64% | 17% (recorded November 1) |
| Upright, before planting | 43% (26) | 57% | |
| Planted | 7% (27) | 30% | 13% (12) |

**Offline gait** (`review/runtime/gait-compare.txt`), with the game's blend and pacing from [`gait.ts`](../../../apps/client/src/characters/gait.ts). It measures the toes' speed over the ground while within 1 cm of it, as the mean of both feet, across the 21 outfits and the mercenary:

| Speed | Published November 1: median, worst | Planted: median, worst |
| --- | --- | --- |
| 6.6 m/s, the world's travel | 12%, 12% | 6%, 10% |
| 3.0 m/s, walk and run blended | 6%, 16% | 20%, 26% |

**Limits:**

- **Walking speeds:** feet slide more than before. The back of the walk's stance needs a leg longer than it stands, which placed legs refuse, so the toes slip as the foot rolls off. In the world people walk only while starting and stopping: they travel at one speed, 6.6 m/s at normal game speed.
- **Sprint:** the source is uneven between the feet, so one foot keeps some slide (the mercenary's feet touch for one frame each).
- **Sampling:** runs at 60 fps catch 12–27 contacts each, so their medians are steadier than their tails.

## The head and neck, and the run's back

**Found** by Mike on November 4, reviewing the first prepared game files in the art study: a screenshot of Kest's travel coat mid-run, "umm are you seeing this", then "Are you kidding me? Do you not seeing the messed up head and neck?" and "also why does he have a hunchback?". Publication stopped there; nothing had gone out.

**What was wrong**, measured on the files:

- **A shelf of chest.** Placed by the eyes, a generated head's bust is the generated person's chest, not the body's. Below the base of the neck it stood up to 8–10 cm outside the clothing on Kest and Mike, about 4 cm on Tavin and 3 cm on Ada and Mara; Orin's lay inside. It was cut flat at the neck cut. MakeHuman bodies have no skin under their clothes, so it took its weights from the nearest skin, the throat and chin, and swung with the head (`review/heads/neck/kest-travel-coat-before.png`, `kest-travel-coat-throat-before.png`).
- **A line down the back of the neck.** Removing the old head's faces also removed their vertices, which renumbered the rest, so the tool's per-vertex list of bones no longer lined up. Half of the old nape read as finger skin and stayed over the new neck on every MakeHuman body, a hard vertical line down the back of the neck, since the first graft (`kest-travel-coat-nape-line-before.png`). The same slip sampled the skin tint from the wrong faces.
- **A hunched run.** The library run curls the upper back 29° further than its hips lean (41° from upright at the shoulders), with the neck bent back 27° to look ahead; its sprint curls 20° and its walk 11°. The November 1 files had it too.

**The fixes, in the art tool** ([design](../../../docs/projects/art-workflow-tech-design.md#45-head-give-a-body-a-sculpted-head)):

- **`head` fits the bust onto the bare skin** below the base of the neck, as cloth is fitted: pressed onto the nearest skin and relaxed in turns, its open edge laid level at its own height. The press is full at the base of the body's own neck, where its skin hangs half on the neck and head: at the nape that is the lowest neck bone (1.60 m on Kest), at the throat about 6 cm lower. It takes the skin's own weights where it lies, so it moves with that skin; what the skin cannot take, where it stops under clothing, goes. Tried first and dropped (`review/heads/neck/tried-*.png`):
  - pushed just inside the clothing, it folded into a ruff at the neckline, where the nearest surface jumps from the skin to the clothing's edge;
  - pressed in one go, or looked at level from outside, the shelf's flat top crumpled into a strip just above the neckline;
  - cut away wherever the clothing was nearer, it left a jagged strip of old skin above the neckline;
  - pressed from the lowest neck bone all round, it pushed a generated throat standing in front of the old one (Kest's, by about 2 cm) back onto it just under the jaw, and left a ring across the neck (`tried-pressed-from-the-bone.png`), found in the close check before Mike's look;
  - pressed from lower, ending below where the generated chest juts out, part of the chest stayed out and pinched the neck above the collar.
- **Only the old head's faces go**, not their vertices, so the bones line up.
- **Old skin:** where skin is its own mesh, all of it above the base of the neck counts as neck, whatever bones it hangs on. MakeHuman hangs the sides of the neck partly on the collarbones, and that skin showed at Ada's collar. Old skin the fitted bust lies on goes too.
- **A bust piece is fitted** when any of it comes near the body. Judged by its cut edge alone, a cut through only the front of Mike's chest was nowhere near and left the shelf.
- **Cuts** now sit about 4 cm below each person's lowest outfit neckline (Faces, above). At 1.50 m Orin's, Mike's and Tavin's busts ended at their necklines, and a strip of old skin showed there mid-run. At 1.46 m Mike's work-vest cut missed his bust, which sits 1.4 cm higher on that outfit, and left the shelf whole; `head` now refuses a cut below the head.
- **`clips` straightened a stride's back** at first: each spine bone kept 30% of its forward curl beyond the hips' lean. Mike's second look (below) found that not enough, and strides now stand as runners stand.

**Rebuilt:** every cast file and the mercenary's motion, both Sela routes, and all 21 head files. Pressing to the body's own neck base changed only Kest's and Mike's six head files; on the other bodies that base lies within 4 cm of the neck bone all round, and their files came out byte for byte the same.

**Measured:**

- **Bust stand-off** below the lowest neck bone, outside the original dressed body, before (`work/tools/neck/bust_gap_all.py`) and after, split by what it stands off (`work/tools/neck/bust_gap_split.py`). In front of the old bare skin is the new throat kept as sculpted; the graft removes that old skin:

  | | Before: points over 2 cm out, farthest | After: outside the clothing | After: in front of the old bare skin, farthest |
  | --- | --- | --- | --- |
  | Kest, three outfits | 1,101–1,693, 7.7–9.2 cm | none over 2 cm, 0.1 cm | 2.7 cm (79–82 points over 2 cm, his throat) |
  | Mike | 313–450, 9.6–10.2 cm | none, 0.1 cm | 1.8 cm |
  | Tavin Vale | 139–249, 3.6–4.1 cm | none, 0.7–0.8 cm | 1.0–1.1 cm |
  | Ada | 32–36, 3.0 cm | 4 points over 2 cm, 2.2 cm | 0.2 cm |
  | Mara Reed | 46–52, 2.6–3.4 cm | none, 0.1–0.6 cm | 0.3 cm |
  | Orin | none, 0.8–1.1 cm | none, 0.1 cm | 0.3 cm |
- **Torso lean**, hips to the base of the neck, mean over the clip, beyond standing (`work/tools/neck/torso_lean.py`):

  | | Walk | Run | Sprint |
  | --- | --- | --- | --- |
  | Kest's travel coat, before | 10.5° | 30.6° | 56.3° |
  | Kest's travel coat, straighter back | 5.4° | 17.3° | 47.5° |
  | Kest's travel coat, as runners stand | 3.2° | 11.6° | 19.9° |
  | Ada's field tunic, before | 10.9° | 31.4° | 57.2° |
  | Ada's field tunic, straighter back | 5.7° | 17.7° | 48.1° |
  | Ada's field tunic, as runners stand | 3.5° | 11.8° | 20.4° |

- **Stride speeds:** the straighter back left all 23 people's walk, run and sprint ground speeds unchanged. Standing as runners stand, with the hips turned about their joints, keeps them within 0.5% on the library files (below).
- **Sela's braid** swings less as her back straightens: tip travel from rigid in Walk 8.3 → 6.6 → 5.9 cm, Run 14.8 → 9.5 → 8.4 cm, Sprint 24.9 → 21.8 → 12.5 cm, against the planted files (`work/sela-b-swing-{planted,straight,upright}.log`); the other clips are unchanged.

**Checked:** close textured renders of every MakeHuman person's head and neck from the front, side, three-quarter and back, standing and mid-run (`review/heads/neck/sheet-*.jpg`): no shelf, no ring across the throat, no line down the neck, no old skin at the collar. Ada's field-tunic collar looks ragged mid-run, as on her original body: that is the tunic's own edge. So is the pale scrap at the front of Kest's collar in side view. Kest's run side-on before and after is `review/heads/neck/kest-run-side-before-after.jpg`, and his walk, run and sprint `kest-walk-run-sprint-back-before-after.png`. In the art study, on the local check viewer, Kest's travel-coat game file shows the fixed head and neck close up in Smooth 3D, mid-run, from the front three-quarter and the side.

**Limits:**

- **Open necklines** show the head's dark undershirt as a band, in place of the old skin there.
- **Collar bumps:** Orin's lower neck shows small bumps along the collar, where the generated undershirt's collar and collarbones lie partly pressed onto the skin; the first fit had them too.
- **The painted sheet bodies**, regrafted and looking as before: Mara's keeps the lower part of her old painted ponytail on her back and a sliver of the new head's edge along her collar. Ada's shows her old painted chest inside her hood.

**Second look**, the same evening, on the fixed files in the local check viewer: a screenshot of Kest's travel coat mid-run, "he still looks really weird. Long neck sticking out, hunchback, his chest looks like he has mini boobs. Are you not doing a visual inspection? Like how can you give this to me as a final product?". Whole-figure renders beside his original body showed all three there too, and in the close renders above, which had been checked only for the defects just fixed:

- **The run's posture.** The straighter back still leaned 12° from the hips with 9° of curl over them, and the shoulders, arms and neck kept the clip's turns for its old 41° chest. The shoulders rolled forward against the straighter chest, raising the coat behind the neck, and mid-run the head stood 20 cm ahead of where it stands over the hips.
- **The neck.** MakeHuman's neck leans 38° forward standing; tilted with the chest, it carried the head out in front, chin first.
- **The chest.** Kest's and Mike's MakeHuman bodies are the cast's most muscled. Every outfit on them follows the round lower edge of the chest muscles with a shelf under it, standing too, and the rolled shoulders squeezed those into mounds. Tavin's and Orin's outfits are smooth.

**Fixed:**

- **`clips` stands strides as runners stand** ([design](../../../docs/projects/art-workflow-tech-design.md#44-clips-give-a-rig-the-clips-the-game-plays)): the back leans in one line with the hips, the shoulders turn with the chest and the arms half as far, the neck keeps its standing direction and the head the clip's gaze. A stride's hips lean at most 20° beyond standing on average, so the sprint leans 20° instead of 45°; the run's 12° and the walk's 4° stay. The hips turn about their joints, not their middle, so the legs keep the clip's reach and the feet land where the clip's do. This settles the earlier open question of the sprint's lean, reversibly.
- **Chests:** `work/recipes/people/smooth-chests.py` smooths the front of the chest of Kest's and Mike's six outfits before their clips are built (`export/sources/`, which `build-cast.sh` reads): the innermost garment, by Taubin's smoothing, which keeps the volume, over 120 rounds, from 62% to 81% of the height and within 20 cm of the middle, with its open edges held so the collars do not move, and the vest over it moved with it. Up to 2.4 cm moves. The bodies have no skin under these garments, so nothing shows through.
- **Tried and dropped** (`review/heads/person/tried-*.jpg`): the arms turned fully with the chest (the sprint's forward hand rose above the head) or left at the clip's turns (its back arm swung out straight behind); the neck in the chest's line or halfway (the head stayed out in front); half of every stride's lean (the run looked stiff); lifting only the hollow under the chest (the shelf stayed). Two more, for the sprint's feet: legs aimed from its upright hips moved where its feet landed, its ground speed rose by up to 31%, and in the scene study's game travel the watchpost runners' toes slid a median 26–30% of body speed over two runs, against 6–7% for the files Mike saw. Keeping the clip's own forward-tipped hips under the upright back planted the feet as before but made the sprint dive again (`tried-sprint-hips.jpg`). Aiming each foot from where the clip's hips put the thigh restored the speeds, but Ada's push-off leg could not reach back from her upright hips: her foot lifted early and, in the offline gait check at travel speed, slid 93% of body speed. Turned about their joints, the hips stay upright and the legs keep the clip's reach.

**Found in the foot check and fixed: sprints that hitched.** Re-measuring planted feet in the scene study's game travel showed the watchpost runners sliding more. Besides the sprint's feet (above), 13 of the 22 game motion files Mike saw had a sprint loop that did not close: `clips` sought the left heel strike on the loop's repeated last frame too, found it there, kept the loop unrotated, and ended it on a frame that after retargeting no longer matched the first, so the sprint hitched once a stride. The strike is now sought among the frames once round, and every stride loop closes (`work/tools/person/loops.py`).

**Rebuilt** again, with the hips turned about their joints and every loop closing: every cast file and the mercenary's motion, both Sela routes, the 21 study heads and the 18 game heads, with the art tool at SHA-256 `33b9ece9e08f4c09079f0150a059c2436f6faedf6709b5bb64c817f9dba9a6ea`.

**Measured** on the rebuilt files:

- **The head mid-run** (`work/tools/neck/shoulder_pose.py`), Kest's travel coat, Run's mean: 20.0 cm ahead of where it stands over the hips in the files Mike saw, 12.9 cm now, level with the base of his neck (12.7 cm), so it sits over the neck instead of out in front of it. Ada's field tunic: 11.9 cm and 11.7 cm.
- **Torso lean**: the table above, "as runners stand".
- **Stride speeds**: the 21 library files' 63 walk, run and sprint ground speeds stay within 0.5% of the files Mike saw (the most, Mara's work-vest sprint: 7.823 → 7.784 m/s); the mercenary's sprint moves 10.521 → 10.445 (0.7%).
- **Clips:** every study head keeps its body's clips, at their lengths, within 0.224° and 1.5 mm.

**Checked:** every person as a person, painted and as clay: standing from four sides, four phases of Run from the side and three-quarter, Sprint and Walk, and the upper body mid-run from the side, three-quarter and front (`review/heads/person/f*.jpg`, all 26 at a glance in `all-1.jpg`–`all-3.jpg`). Each runs upright with the head over the shoulders, the sprint leans like a sprint, and no man's chest reads as breasts. Mid-run a soft fold still crosses Mike's chest below the chest muscles, like a shirt's fold. The files Mike saw against the game files now, matched pose for pose: `review/heads/person/{kest-travel-coat,mike-travel-coat,kest-field-tunic,ada-field-tunic}-before-after.jpg`. In the art study, on the local check viewer, Kest's travel-coat game file runs upright in Smooth 3D, from the front, three-quarter and side.

**Found in the whole-figure check, not fixed — the hands.** Every library outfit hides the skin under the Viking tunic's sleeve by cutting it away, and the cut runs past the tailored cuffs. Each hand's skin ends in one open zigzag edge round the wrist (66 edges, 69 cm on Kest) that also leaves most of the back of the hand open, so close up the hand shows a jagged hole and pale shards at the wrist (`review/heads/hands/kest-hand-as-made.jpg`, `kest-hand-open-edge.jpg`). It came with the library bodies: all 21 game files have the same open edge on both hands (`work/tools/hands/holes.py`). MakeHuman, which could cut the bodies again, is not installed. Three fills were tried and dropped (`review/heads/hands/tried-*.jpg`, `work/tools/hands/`):

- a patch faired to continue the skin round it bulged like a tent;
- faired with the jagged rim, it pinched the hand into a stalk;
- laid on the hand's convex hull, it looked whole from the front but left spikes at its edge.

The fix needs the hands' own skin: the bodies cut again without the sleeve's cut, or a whole hand fitted to each.

## Into the game

Mike asked for the fixes in the game on November 4 ("Yes, move them"). His looks at the prepared files found the neck, back and chest faults above. He then rejected the MakeHuman bodies themselves ("They are horrible") and asked for the new bodies first: "we can move the new bodies into the game first without all that other stuff". Kest, Tavin Vale, Orin and Mike stay "as they are" until their character sheets come; people built from parts come later ([people built from parts](../../../docs/maintainers/art/people.md)).

**Ada and Mara on their sheet models**, published November 5 with Mike's permission ("Yes, publish", with the dresses as they are) as development runtime revision `sha256-9953d8419b6328fc707700e8a697be4c6e32c883419f8013c1eb2c06fb2034a9` (manifest SHA-256 `06cd3da048b08f01ad3b5794aaa00304530ef61b4da66417dd800d1e181e496d`, operation `sheet-people-development-runtime-20261105`), revision 7 of the `development/runtime` selection. It keeps every file of revision 6 and adds only the two files below; [`assets/locks/development.json`](../../../assets/locks/development.json) names it. A saved world uses it once its owner chooses **Use installed game art**. The public studies release does not carry the two files yet, so the art study served from a checkout cannot load their subjects until it does:

- `source-sheet-people/{ada,mara}-sheet-model.glb`: the sheet model with her generated head and the eight clips, grafted again with `head --max-texture 1024` so both maps are 1024²; 58,457 and 58,935 triangles, 3.8 MB each. One file serves as both still and motion, as in the study.
- [`selections.json`](../../../apps/client/src/props/art-study/selections.json) shows them in place of Ada's field tunic and Mara's travel coat in the game's current art. Saved worlds and the world's definitions are unchanged, and the art study lists the MakeHuman outfits as retained sources.
- Strides at the files' 1.83–1.84 m, Walk, Run and Sprint in m/s: Ada 1.220, 4.874, 10.674; Mara 1.259, 4.970, 10.737.

**Checked:**

- The whole figure in every stride, from four sides, painted and as clay (runtime folder `build/sheet-game/person-{ada,mara}.jpg`), and in the game's renderer close up, in the game's pixel look and in Smooth 3D (`check/game-look-{ada,mara}-sheet-{balanced,native}.jpg`): upright, the head over the shoulders, faces and hands whole.
- Their clips equal their bodies' within 0.07° and 0.5 mm, and every loop closes.
- Feet at the world's travel speed, 6.86 m/s, in the offline gait check: Ada's toes slide a median 14–16% of body speed while down, Mara's 8–14%; the shipped library people measured 12–17%. In two runs of the scene study's camp travel, Ada 21–38% and Mara 20–50%, against 10–55% for the shipped Tavin and mercenary in the same runs; the live capture varies that much from run to run.
- The art and scene studies load them with no page error; typecheck passes.

**Limits:**

- **The dresses stretch between the legs** in Run and Sprint. The clothes are part of the one painted body, so the skirt is skinned to the legs and spans from the hips to the trailing ankle. The game's travel blends Run and Sprint, so it shows whenever they travel. Separate clothing is the fix.
- **Sprint arms** rise to the face at the top of each stride, seen from the front.
- **Triangles:** 58,457 and 58,935 against the proposed 40,000 ([A3D04](../../../docs/limits/3d-pixel-art.md#a3d04--mesh-complexity)); the sheet bodies were over before their heads.
- Ada's old painted chest shows inside her hood, Ada and Mara still read alike at play distance, and every person stands on the world's single 1.75 m body.

**Prepared and not moving:** a development runtime release of 29 files for the MakeHuman people and the mercenary, built before the hip pivot (runtime folder `workspace/`). Mike keeps the four as they are, and the repository points at the shipped files again. Its contents, kept for a later decision:

- **The library people's 21 motion files** (`source-<person>/<person>-<outfit>-motion.glb`): upright clips with planted feet, standing in strides as runners stand; Kest's and Mike's with their chests smoothed.
  - Ada, Mara Reed, Kest, Tavin Vale, Orin and Mike also carry their generated heads.
  - The padded-armour study body keeps its head: it is a body for armour, not a person.
  - Their still fitted models keep the old heads; neither the game nor the art study loads them for people.
- **The mercenary:**
  - `mercenary-motion.glb`, upright, planted and standing in strides as runners stand.
  - `mercenary.glb` with the re-cut body layout: every triangle corner kept its position, normal, joints and weights. Both images that use the layout are re-baked: the base colour, and the emission map, which the game discards.
  - His six other body paints follow the layout: `variants/body-{faithful,painted,graphic}.png`, baked from their 1024² originals at 2048², and `source-mercenary/body-{restored,tailored,embroidered}.png`, the study's re-cuts.
  - The game's default `restored` paint is the re-cut Mike reviewed. His three study models in `source-mercenary/` stay as the lineup's before versions.
- **Checked:** the re-cut layout matches the reviewed study re-cut at every triangle corner, and each of the mercenary's seven paints renders on it with its own colours and fewer seam lines (`review/runtime/paints-before-after.png`).

**Game maps:** the game's copies of generated heads use 1024² maps (`--max-texture 1024`), against the study's 2048², and the flag caps a generated body's own 2048² map as well. The library people's other maps are 256²–512², and a 2048² map would add about 22 MiB of GPU memory per person against the proposed 256 MiB for all appearance art ([A3D11](../../../docs/limits/3d-pixel-art.md#a3d11--client-loading-and-residency)). At matched zoom in Smooth 3D the faces show the same detail (`review/runtime/kest-head-2048-vs-1024.png`).

## Review and remaining gaps

**Review images:**

- `review/stance/stance-before-after.png`: five people's Frozen pose, before and after, front and side.
- `review/sela/sela-face-routes-sheet.png` and `review/sela/sela-routes-with-braid.png`: the old head and both routes, painted and as clay, with the braid.
- `review/mercenary/mercenary-recut-before-after.png`.
- `review/heads/faces-before-after.png`: the seven people's working selections, before and after, painted and as clay; `review/heads/motion/motion-sheet.jpg`: four of them mid-clip.
- `review/heads/neck/`: the neck and back fixes: Kest before, what was tried, and every MakeHuman person's head and neck from four sides, standing and mid-run, after (`sheet-*.jpg`).
- `review/heads/person/`: the second look: every person whole through their strides, the files Mike saw against the rebuilt ones, the chests before and after smoothing, and what was tried; `review/heads/hands/`: the hands' open edge and the fills tried.

**Checked in the art study** on the local view server (below), in the in-app browser at 1600 × 1100 and in Smooth 3D:

- The lineup shows all ten people upright in the Frozen pose.
- Sela's subject shows her sheet model, both face routes and the candidates.
- The mercenary's subject shows all six versions, and the re-cut restored one renders clean close up. The page's only failed requests are its favicon and three interface catalogs the studies release does not hold.

**Checked again on the hosted pages** after publication, in the in-app browser:

- The lineup loads all ten people with their working choices and the page's fonts.
- Ada's subject shows her ten versions, and her generated head renders close up in Smooth 3D.
- Walk plays.
- Sela's subject shows both routes and the candidates.
- The mercenary's subject shows all six versions.
- The scene study loads.
- Every request succeeded.

Blender clay and painted renders, at known scale, are in `review/`.

**Budgets:**

- **Route B:** 64,368 triangles, against the proposed 40,000 per skinned body and the old sheet model's 42,949: body 42,170, head 13,942, braid 8,256. Texture area is 512 pixels over (two 2048² maps plus the braid's 64 × 8 bands). Her height is 1.752 m against the record's 1.76 m, because the new crown sits 8 mm below the old hair helmet.
- **Route A:** 68,752 triangles (face 8,632, eyes 172, hair 9,522, braid 8,256); textures 6.55 million pixels, within budget.
- **Re-cut mercenaries:** 42,500 triangles, unchanged and already over the proposed budget; textures within budget.
- **Generated heads:**
  - On the MakeHuman bodies: 33,560–39,028 triangles, within the proposed 40,000.
  - On the sheet models: 56,343–59,028.
  - Textures stay within budget: each adds one 2048² map in the study files and one 1024² map in the game's.
  - Every MakeHuman file still has its rig's 163 joints, over the proposed 64, as before.
- **The game's mercenary:** 13,843,892 bytes against 14,391,244 before, and its body gains 2,547 vertices where the new seams split them; triangles unchanged. Its paints are now 2048² against 1024² (1254² for the built-in one).

Finishing either for the game would decimate to budget.

**Limits:**

- **Long skirts** still split with the legs, as in the proof run.
- **Gait lean:** beyond standing, the torso leans about 3° in Walk, 12° in Run and 20° in Sprint, in one line from the hips.
- **Hands:** every library person's hands are open across the back of each hand, as their bodies came ([second look](#the-head-and-neck-and-the-runs-back)).
- **Mara's sheet model** shows pale old painted chest skin at her open neckline, beside the new neck. A body painted as one mesh is not tinted, and its skin there is outside the new head.
- **Tavin's work vest** keeps a few darker flecks of old skin at the collar.
- **Dark undershirt:** where a neckline is open, the head's own undershirt shows as a band (Kest, Mike, Tavin, Orin).
- **Paint:** the new heads carry the generator's detailed paint (2048² in the study, 1024² in the game), not the prepared limited-colour paint the [production notes](../../decisions.md#how-the-current-look-changes-production) ask of people, and the MakeHuman bodies keep their own paint, only tinted.
- **Head size:** Ada's library head is larger than her sheet model's (25 cm against 20 cm chin to crown at 1.85 m), because each takes its own body's old head size.
- **Walking speeds:** feet slide more than in the November 1 files while people start and stop ([Planted feet](#planted-feet)).

**Cost**, at the Plus plan's $0.039–0.049 per credit:

- **The three fixes:** 44 Higgsfield credits, about $1.72–2.16; the balance went from 314.75 to 270.75.
- **The faces task:** 192 credits, about $7.49–9.41, inside its $10 ceiling; the balance went from 270.75 to 78.75.

| Job | Credits |
| --- | --- |
| Sela: four GPT Image 2.5 views, 2.75 each | 11 |
| Sela: Tripo H3.1 Multiview | 18 |
| Sela: Hunyuan3D v3 | 15 |
| The cast: 24 GPT Image 2.5 views, 2.75 each (four right views mirrored for free) | 66 |
| The cast: seven Tripo H3.1 Multiview heads, 18 each | 126 |

The seven head jobs sent at once and stopped unstarted charged nothing. Everything else ran locally at no cost.

## Resume

- **Working folder:** `~/Documents/ChatGPT/OpenLegend-art/2026-11-03-character-fixes/`.
  - `study/`:
    - `views/` (v01 with prompts and job records);
    - `models/` (m01, m02 and the mercenary's inputs);
    - `export/clips/k01-upright-idle.glb`;
    - `export/sources/` (Kest's and Mike's six library outfits with their chests smoothed, before clips);
    - `export/people/` (f01–f27 and `mercenary-motion-only.glb`, each with clip facts);
    - `export/sela/` (f28 route B, f29 route A, with clip facts);
    - `export/mercenary/` (the three re-cut study files);
    - `export/review/` (the 58 height-scaled study files and three re-cut copies);
    - `views/v02-*`–`v08-*` and `models/m03-*`–`m09-*` (the cast's head views and heads);
    - `export/heads/` (f30–f50, the 21 bodies with generated heads);
    - `work/` (recipes, tools and the Sela and mercenary work files);
    - `review/` (reports, ranges, renders and sheets).
  - `publish/` holds the study's files at their catalog paths: the 49 published (below), 46 of them since replaced by the fixed versions, which are not published yet.
  - `local.index.json` lists the 46 fixed files; `view.index.json` joins them with the public studies lock.
- **Recipes:**
  - stance: `work/recipes/upright-idle.py`, `work/recipes/people/{smooth-chests.py,cast-clips.sh,build-cast.sh}` (run `smooth-chests.py` in Blender with the character motion study's library folder and `export/sources`, then `build-cast.sh` with `MERC` naming a folder that holds the runtime `mercenary.glb` and the October 31 `mercenary-motion.glb`);
  - Sela: `work/recipes/sela/{route-b.py,route-a.py,braid.py,braid-swing.py}`; rigs before clips in `work/sela/`;
  - the cast's heads: `work/recipes/heads/{views.py,models.py,graft.py,heads.json}` (`heads.json` notes how each body's cut was chosen), with `work/tools/{landmarks.py,grid.py,head-pairs.py,heads.py,head-sheet.py,head-motion.py,face.py}` for landmarks and checks, and `work/tools/neck/` for the neck and back checks (`review_head.py` and `review_sheet.py` make the four-side sheets, `bust_gap_all.py` and `bust_gap_split.py` the stand-off, `torso_lean.py` the lean), `work/tools/person/` for the whole-figure review (`review_person.py` renders one person, `person_sheet.py` and `compare_person.py` make the sheets) and `work/tools/hands/` for the hand fills tried;
  - study files: `work/recipes/review/{plan.json,scale-heights.py,write-catalog.py}`.
- **View:** open the hosted [art study](https://assets.openlegend.ai/studies/public/viewers/webgl-b5e612ef55fe01b22918f69abd44a130b748051167d34b80365a10159130ef0b/art-study.html) and choose **Character lineup · own heights** or a **Characters ·** subject, or serve a checkout's current pages with `pnpm assets serve --page /art-study.html`.
  - The working folder's view server was needed only while the study was private. It answers changed files from `publish/` and the rest from the public studies release: from this checkout, run `node_modules/.bin/vite --config <working folder>/study/work/tools/view-server.config.mts`, then open `http://localhost:5201/art-study.html#subject=characters`.
- **Ada's and Mara's publication:** `~/Documents/ChatGPT/OpenLegend-art/2026-11-05-sheet-people-runtime/` holds the release manifest, its builder (`work/build_manifest.py`), the complete release it was published from (`full-dev/`) and the receipts.
- **Game files and checks:** `~/Documents/ChatGPT/OpenLegend-art/2026-11-04-character-fixes-runtime/`.
  - `workspace-sheet/` holds Ada's and Mara's two game files at their repository paths; `build/sheet-game/` their builds, reports and whole-figure renders; `check/` their game-look captures and foot checks, and `after.index.json` the local viewer's file list for them.
  - `workspace/` holds the 29 MakeHuman and mercenary files built before the hip pivot, not moving; `build/heads-30fps/` the pivot build's game heads, not moving either; `workspace-planted/` the first prepared set, superseded. The second set, which Mike looked at, was superseded unpublished and not kept; its renders are in `review/heads/person/`.
  - `work/` holds the recipes: `runtime_heads.py` (the game heads), `assemble_runtime.py` (the re-cut `mercenary.glb`), `stage_runtime.py`, `update_game_catalogs.py`, and `build_runtime_manifest.py` and `build_studies_manifest.py` for the releases.
  - `check/` holds the checks and the local check viewer: run `check/view_index.py`, then `node_modules/.bin/vite --config <runtime folder>/check/view-server.config.mts` from this checkout and open `http://localhost:5202/art-study.html#subject=kest`.
  - The manifests prepared there before the neck and back fixes (runtime, studies and a third archive batch) are superseded and were never published.
- **Archive:** `work/recipes/review/build-manifest.py` stages the archive and writes its manifest: asset `character-fixes-2026-11-03` in `art-studies` / `curated-private`. It leaves out provider job records, logs, scratch, the height-scaled copies already staged under `apps/` and the copies of public files. Those height-scaled copies are kept in the public studies release (below).
  - **First batch:**
    - **Release:** revision `sha256-bbb1f337cc451a329d1655d4815730b7c32b62352a8febc06c221928d5a5f7f5`, manifest SHA-256 `d5e1851a91daaaa3263499d8bba556a588553f98f5ad5ffb973b8b9d51e6633b`, operation `character-fixes-2026-11-03-archive`, evidence `owner-authorized-character-fixes-2026-11-03`.
    - **Content:** the stance, Sela and mercenary work, 321 files, 449,298,872 bytes, verified November 4.
  - **Faces batch:**
    - **Release:** revision `sha256-98dfbccbf8c16c03270445a39013a40e9885829d1b5bf3fe440c10749c9a537a`, manifest SHA-256 `2bc9e29fe10ad8876e333675608a3e02708558b85d76914cd9d103bbf17dd929`, operation `character-fixes-2026-11-04-faces`, evidence `owner-requested-character-faces-2026-11-04`, source commit `65f530cf2`.
    - **Content:** the whole working folder, 607 files and 863,092,630 bytes, verified November 4; 291 of them (413,839,364 bytes) are new or changed since the first batch.
    - **Index:** the exact list is in [archive.index.json](archive.index.json).
  - **Superseded:** the first batch's revision stays in storage; its index is `archive.index.json` in the working folder.
  - **Fetch** with the main checkout's asset authority and the AWS sign-in: `pnpm assets workspace --index art-direction/studies/2026-11-03-character-fixes/archive.index.json --all --output <new folder>`.
- **Public studies:** published November 4 with Mike's permission ("Yes, publish").
  - **Release:** public studies revision `sha256-c03439a53666bd699a83ac0d05d03b9c7fe37c4a723af36165f8407c48494b23`, manifest SHA-256 `10ce6047e5e3b55cf8602241af2abafcf8b621237eb39c6dd30f30153acb5de4`, operation `character-fixes-public-studies-20261104`, evidence `owner-authorized-character-fixes-public-2026-11-04`. [`assets/locks/studies.json`](../../../assets/locks/studies.json) names it.
  - **Content:** it inherits the [character heights](../2026-11-03-character-heights/README.md#resume) revision `sha256-ddc18f0e4c1e62a65c1af71ffe9d043d3ad13474bdfdfedea6fb5f0c556d2ca2`, replaces the 23 people rebuilt upright and the catalog, and adds the 26 new models, all under `apps/client/src/props/art-study/study-characters/`: 50 files, 195,178,930 bytes. All 62 public copies in that folder verified.
  - **Working folder:** `~/Documents/ChatGPT/OpenLegend-art/2026-11-04-character-fixes-public/` (manifest, recipe and the staged files).
  - **Not in it:** the game's own motion files (the `source-*` groups) and the mercenary's game motion stay as they were; replacing them belongs to the runtime decision below.
- **Hosted pages:** build `sha256-b5e612ef55fe01b22918f69abd44a130b748051167d34b80365a10159130ef0b` of the art and scene studies (manifest SHA-256 `4cddf16c1f7d3e3cadf9098b3d3f2f46255198eaea56a4ec8d4471969f56023c`, operation `compiled-study-public-20261104`), made from that revision at commit `cdc7a46b0`.
  - `studyViewerBaseUrl` in [`assets/delivery.json`](../../../assets/delivery.json) points at it, so the game's art-inspector link opens it. It replaces the November 3 build.
  - Its working folder is `~/Documents/ChatGPT/OpenLegend-art/2026-11-04-hosted-study-build/`.
- **Open decisions:**
  - Mike's look at the rebuilt study files before they are archived and published in the public studies and the hosted pages, with Ada's and Mara's two game files, which that release lacks ([Into the game](#into-the-game));
  - character sheets for Kest, Tavin Vale, Orin and Mike, which Mike will send.

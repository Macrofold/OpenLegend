# Source-based starting-world art study

Delivered October 16, 2026. Working selections, not creator approval.

[Open the complete visual study](https://assets.openlegend.ai/studies/public/viewers/current-ca54817de5bc3f01018bb88a/art-direction/studies/archive-through-2026-10-16/source-based-study/index.html). It starts with real scene captures, then matched motion, scale, references, composition annotations and all 41 asset families. Click images for their original capture resolution. All 123 choices and 38 source controls remain available. The earlier rejected study is preserved beside this folder.

The working combination is the restored original mercenary, source-based people and animals, quiet woodland materials, 40 samples/metre, one final shared resolve, 12 held poses/second, settled cloth and Economy shadows. Camera framing is closer (zoom 5.5 / pitch 0.68); the former 12 / 0.88 overview is retained. Body scale is independent: 2.035 m mercenary beside 1.85 m adults, ten percent taller. This is shaped 3D with designed pixel rendering, not permanent voxel anatomy.

![Actual camp, clear daylight](https://assets.openlegend.ai/studies/public/blobs/sha256/83/8361c2a919ff02264e0244ebc1f28573f80797fc6a4ef8f9757765001f1f93f9)

![Three original-model mercenary interpretations](https://assets.openlegend.ai/studies/public/blobs/sha256/70/704b1bd99c08c5e5d358c2ecaa56fa89717d2a356309551242ece46451f20dc0)

Left to right: restored original (working choice), quiet tailoring, selective embroidery.

## Review in the engine

From `/Users/mzw/.codex/worktrees/415f/OpenLegend`:

```sh
pnpm exec vite --config apps/client/vite.config.ts --host 127.0.0.1 --port 4175 --strictPort
```

Open `http://127.0.0.1:4175/scene-study.html` for the actual game renderer with seven existing-world views. Open `http://127.0.0.1:4175/art-study.html` for all options, source controls, neutral light, motion, camera controls and GLB/Blender links. Change `4175` to another available port when needed. The scene page uses recorded permitted views; no server, provider call or saved-world replacement is needed. The ordinary game still requires its normal server startup.

## Scope and caveats

Seven named people; hare, deer, stag, wolf, bear and woodland bird; broadleaf/conifer/birch, shrubs/grass/fern/rocks; chest, sword, shield, knife, bow/arrow, cord, sling and stone tool; berry bushes, reeds, fibers, branches, stones, markers, supplies, bundles, workbench, backpack and shelter. Existing terrain, structures, river, sprites and effects supply the surrounding scene. Unsupported poses retain existing art rather than inventing successful native actions. New-world appearance bindings do not migrate a currently saved game.

The warm moving camp measured 16.7 / 18.6 / 18.7 ms median / p95 / maximum displayed intervals on the available M1 Pro, with roughly 99.58 MB of counted texture and geometry buffers. A first-load 400 ms hitch remains. This is not general device, crowd or strict 60 Hz qualification. Source hashes were checked against 20 Blender files and 203 runtime model files (223 checks); all matched. The complete study model collection is 250,322,196 bytes, loaded on demand rather than simultaneously.

The conspicuous rectangular terrain supports, planar conifer boughs, coarse bear form and simple human animation remain weaker than the leading references. Small world faces are not portraits. Pixel silhouettes still change with perspective; sampled clips do not prove a universal absence of shimmer. Mercenary production rights remain unqualified. All source credits and changes are recorded in the repository catalogs and `apps/client/src/props/ATTRIBUTION.md`.

Paid-tool spending: $0 settled / $0 reserved / $0 uncertain of the shared $25 ceiling. No new paid generation.

## Working choices

- **Peacock Mercenary — restored.** Restored keeps the original red mantle, mail, brown quilting and face closest to your concept. Quiet tailoring loses some identity; the embroidery option spreads attention across the chest. The continuous cape stays attached to the existing rig and cloth owner.
- **Ada — field tunic.** Field tunic gives the strongest plain-wool silhouette and leaves the face readable. The vest and long coat are retained, without treating either costume as armor.
- **Mike — field tunic.** Field tunic keeps a clear waist and familiar human proportions; more elaborate outerwear competes with the mercenary.
- **Mara Reed — travel coat.** Travel coat best carries Mara’s patched, practical clothing. Her authored red satchel with blue-cross stitching remains a separate existing item; the new backpack does not replace it.
- **Tavin Vale — work vest.** Work vest gives Tavin the clearest woven waist-and-shoulder silhouette beside Mara’s longer coat.
- **Kest — travel coat.** Travel coat establishes the longer, muted silhouette among the watchpost figures without granting any new protection.
- **Orin — field tunic.** Field tunic keeps Orin distinct from Kest’s long coat. Facial expression and unique gestures remain less developed than the leading character reference.
- **Padded armor study — field tunic.** Field tunic is the quieter ordinary-body control. The retained mail and fitted overlays allow a material comparison; this study grants no equipment or combat statistics.
- **Hare — field.** Field coat balances a pale muzzle and darker ear tips with the strongest source anatomy. The hop retains the acquired rig; it is not a stretched procedural rabbit.
- **Deer — woodland doe.** Woodland doe keeps the neck, head and light underside clear with limited coat noise.
- **Stag — branching antlers.** Branching antlers distinguish the stag from the doe without relying on tint alone.
- **Wolf — field grey.** Field grey preserves a long muzzle, darker back and leg separation. Its ordinary walking clip is retained from the source.
- **Bear — forest brown.** Forest brown has the clearest broad body and muzzle. The source is angular and its newly authored walk is a study clip, not a complete bear behavior library.
- **Woodland bird — grey wing.** Grey wing gives a restrained pale face and darker wing. The ground walk now keeps the wings folded; no flight behavior is claimed.
- **Library broadleaf — sheltered crown.** Sheltered crown has the clearest asymmetric mass and visible trunk. The alternatives compare actual library crown arrangements, rather than three tints of the same sphere.
- **Conifer — sheltered pine.** Sheltered pine has the strongest broad lower boughs. Overlapping planes remain visible in close views; the working scene keeps foliage still to avoid distracting leaf motion.
- **Pale woodland tree — slender birch.** Slender birch separates its pale trunk from rounded broadleaf crowns. Dark bark marks are subordinate to the trunk silhouette.
- **Woodland shrub — rounded thicket.** Rounded thicket keeps compact overlapping foliage below the tree line. Berry bushes have their own distinct fruit clusters.
- **Weathered stone — rounded shoulder.** Rounded shoulder gives useful large planes and a grounded base. This changes decorative rocks; rectangular physical banks/supports remain visible in the landscape.
- **Ground growth — broad tuft.** Broad tuft reads as one plant at normal distance, with fewer isolated bright blade tips.
- **Woodland fern — open fronds.** Open fronds make the plant type distinct from ordinary grass while leaving the ground visible between leaves.
- **Sword — broad tip.** Broad tip keeps the blade and hilt readable at the shared density. The narrow alternatives lose more of their shape at ordinary distance. The camp sword is explicitly a display fixture.
- **Shield — round boards.** Round boards separate the wood face, rim and central fitting with a strong silhouette.
- **Knife — utility.** Utility has a readable short blade and plain grip, fitting the practical woodland equipment language.
- **Bow — field bow.** Field bow keeps one clear bent-wood line and a restrained grip. Small string detail remains limited at overview distance.
- **Arrow — bone point.** Bone point gives a useful point/shaft/flight distinction without a bright metallic speck dominating the image.
- **Fiber cord — loose coil.** Loose coil communicates flexible cord through a continuous loop. It is authored geometry rather than an invented library provenance claim.
- **Field sling — split pouch.** Split pouch gives the leather a clear central shape and leaves the two cords legible at inspection distance.
- **Stone tool — broad flake.** Broad flake makes a distinct cutting plane. At ordinary distance this small object needs inspection; increasing its real size is not the solution.
- **Supply chest — banded lid.** Banded lid is the clearest practical timber-and-iron chest. The ornate generated chest is a preserved comparison, not the default for every bundle and stockpile.
- **Berry bush — fruit groups.** Fruit groups make berries identifiable against ordinary shrubs. The depleted export removes fruit while keeping the same plant silhouette.
- **River reeds — river fan.** River fan makes a readable bank-side clump with gaps, rather than a solid grass wall.
- **Dry fibers — standing stems.** Standing stems distinguish the pale harvestable material from green meadow tufts.
- **Fallen wood — loose branches.** Loose branches make a readable stockpile rather than another chest. Ends and bark carry the material contrast.
- **Loose river stones — loose stones.** Loose stones retain separate silhouettes and quiet cool planes beside the water.
- **Carved work marker — single board.** Single board is the simplest useful marker at ordinary size; more construction obscures its purpose.
- **Workshop supplies — open box.** Open box shows purposeful contents, separating workshop supplies from a closed treasure chest.
- **Travelling bundle — rolled wool.** Rolled wool reads as cloth through its rolled end and broad surface, with restrained strapping.
- **Riverside workbench — open bench.** Open bench keeps the working surface and legs distinct. The workshop camera now faces across the bank so its tree does not cover the table.
- **Travelling pack — canvas pack.** Canvas pack uses an acquired Quaternius body, cloth panels and visible fastening. It is an equipment study, not a replacement for Mara’s distinctive satchel.
- **Canvas shelter — open awning.** Open awning leaves the covered space visible. This is a construction comparison; physical shelter openings and support rules are unchanged.

## All asset comparisons

Each image retains all three options under one shared camera/light treatment. Original/library controls and editable exports are in the full HTML review and the engine inspector.

### Padded armor study

![Padded armor study alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/48/48793daefc363865ecd71a05ee3774eeb0b73029853d706e9a941d23b2dff921)

Left to right: field tunic; work vest; travel coat. Working choice: **field tunic**.

### Bear

![Bear alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/65/65ba8cb61ab8b9c110efbb4bdadd1a48b1c698bf3b3e5de2be9f5f8eecd20602)

Left to right: forest brown; heavy shoulder; pale muzzle. Working choice: **forest brown**.

### Woodland bird

![Woodland bird alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/b6/b6b02dadc80e9bee998e81a3e43913bfcb4d8f8824722bc48df45c374d78442b)

Left to right: grey wing; warm bib; wing bars. Working choice: **grey wing**.

### Supply chest

![Supply chest alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/dc/dc86693e05bfd7a65de9b22fed7fbb8b2d1292fe1bbaf3144219f5197e90b63b)

Left to right: carved lid; banded lid; plank cache. Working choice: **banded lid**.

### Deer

![Deer alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/cd/cd89ea25dd6dee00b4a7a560abcfa2cea900e715ff632622b0c036377d42f26f)

Left to right: woodland doe; slender doe; dark back. Working choice: **woodland doe**.

### Sword

![Sword alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/fd/fd3215913bf0bac01a9e25e0938c02c31cd380699633e7048430774067ded921)

Left to right: straight crossguard; broad tip; long grip. Working choice: **broad tip**.

### Shield

![Shield alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/20/202522ece85f8258a07132ab42ec81ced3ec3be6da47a995e22cfb690418e5d1)

Left to right: round boards; reinforced round; heater. Working choice: **round boards**.

### Knife

![Knife alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/3a/3a955d025826e299f02946d1dd6fce8960275bf9b54f84c4857b711ab7fe6e29)

Left to right: utility; leaf point; long knife. Working choice: **utility**.

### Bow

![Bow alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/61/619d7029d18eedf631a2529c55f227fd7d6ca37d58e2cefa2ee9b15f2e22b404)

Left to right: field bow; curved limbs; bound grip. Working choice: **field bow**.

### Arrow

![Arrow alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/cd/cd234b191ee942c96034fc9449f9b3a5f9b1a4d24f374ad23e49fdc637088dce)

Left to right: bone point; broad fletching; slender shaft. Working choice: **bone point**.

### Hare

![Hare alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/5d/5da7ae33ce8ea1bd3f242800e602a93a5eaa4797f2790fa4a3b6e796dd212348)

Left to right: field; russet; winter. Working choice: **field**.

### Kest

![Kest alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/25/25207ba590dbeef9fe8f268b19eccd2fd1077258c613bd197d630361a6e97c00)

Left to right: field tunic; work vest; travel coat. Working choice: **travel coat**.

### Mara Reed

![Mara Reed alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/77/77b5f721fe10deb02399be4ebd1f8ab233c126845fb3bc9a66b0163f7935f410)

Left to right: field tunic; work vest; travel coat. Working choice: **travel coat**.

### Peacock Mercenary

![Peacock Mercenary alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/70/704b1bd99c08c5e5d358c2ecaa56fa89717d2a356309551242ece46451f20dc0)

Left to right: restored; tailored; embroidered. Working choice: **restored**.

### Mike

![Mike alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/9b/9b94311eafd073575a95c6b17db14e53f13d2ede12d4c61dca09f98cfd3df4df)

Left to right: field tunic; work vest; travel coat. Working choice: **field tunic**.

### Library broadleaf

![Library broadleaf alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/51/51c0b420635f5e726384218e2a60ec03165a45a62e5da76de316972486d2b95f)

Left to right: open boughs; layered crown; sheltered crown. Working choice: **sheltered crown**.

### Orin

![Orin alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/ad/adbb01667db343cdf0dd3482ef3bc9118f02679d09330533776855b299d8bdb0)

Left to right: field tunic; work vest; travel coat. Working choice: **field tunic**.

### Ada

![Ada alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/6f/6f2811dab4ca0f671670a0499eac6ffc43bffb30a3aa328c366fd34c60784a64)

Left to right: field tunic; work vest; travel coat. Working choice: **field tunic**.

### Berry bush

![Berry bush alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/41/41b808918b9dae3670b60240c240e69377c97a60f4fccdf9915ba9ba08e634a5)

Left to right: fruit groups; open canes; low thicket. Working choice: **fruit groups**.

### River reeds

![River reeds alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/42/42458ceed576c71040ce5c890da0aac7099fac001c566428f44cf42fdc861670)

Left to right: river fan; broad leaves; broken stems. Working choice: **river fan**.

### Dry fibers

![Dry fibers alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/e9/e97f8b013ca5bf38b840d137cd8b8b0b39c717049b17689aacc29d0290e81f2a)

Left to right: standing stems; loose stems; low tuft. Working choice: **standing stems**.

### Fallen wood

![Fallen wood alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/a9/a9ea8d9a9579ffef888c9b61717317a95b6dd01e5c3d22fc26c645abdef92eff)

Left to right: loose branches; fallen log; forked stump. Working choice: **loose branches**.

### Loose river stones

![Loose river stones alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/2d/2dd9740fbdd57ea2629e515e6b2f7a5a22df040ae9182f6a0b6845720189eea1)

Left to right: loose stones; flat stone; split stone. Working choice: **loose stones**.

### Carved work marker

![Carved work marker alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/54/54940faec43fc9f8877403710ab03f278bdde04b2c48c87623e6f5208b402a7d)

Left to right: single board; crossroads; worn post. Working choice: **single board**.

### Workshop supplies

![Workshop supplies alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/f5/f55f1016de0d72de62eb9c7d42e9b7ded67c525cdcfdafb466f4961a3c88c844)

Left to right: open box; wide box; stave barrel. Working choice: **open box**.

### Travelling bundle

![Travelling bundle alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/be/be73c3b33e2c35b2421e6b007651d5fe056f17fcfaadff549558223d65930828)

Left to right: rolled wool; open bedroll; tied bundle. Working choice: **rolled wool**.

### Riverside workbench

![Riverside workbench alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/9f/9f55cc83f9aee98fca70d7bf78bacfd196b13ca8523605d82b371500bd5bc93b)

Left to right: open bench; long table; narrow bench. Working choice: **open bench**.

### Travelling pack

![Travelling pack alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/db/dba5404540078a4556ed251220a37799e63d8bdf9ce0e92a68b307132f426d1c)

Left to right: canvas pack; broad flap; slender pack. Working choice: **canvas pack**.

### Canvas shelter

![Canvas shelter alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/6d/6d3b76d938bc7a19b3aabc6090db15e66ef399a30d04dafe95e21e944636d17e)

Left to right: open awning; canvas tent; framed tent. Working choice: **open awning**.

### Fiber cord

![Fiber cord alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/52/5291c27a241774201c757d7668d156d7fbf2e47236c1f11db95c47656b2bd6fc)

Left to right: loose coil; figure eight; working length. Working choice: **loose coil**.

### Field sling

![Field sling alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/f4/f4d1f32ece3734c3e2a530fa13d2ebb6f7a672ba7f4ae5dd59970d2edae40f7e)

Left to right: split pouch; oval pouch; long pouch. Working choice: **split pouch**.

### Stone tool

![Stone tool alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/c1/c1ef76994a116b45f6a8fe0a1ddd371dbd42423ab1611d4230b4c62a2acfdf43)

Left to right: broad flake; pointed flake; small scraper. Working choice: **broad flake**.

### Stag

![Stag alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/92/9222fd1d39806217cfd654dffe412e9159a96358f74c888a6198864e2154d9c8)

Left to right: branching antlers; slender stag; dark mantle. Working choice: **branching antlers**.

### Tavin Vale

![Tavin Vale alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/10/105eb402b1578a39a8a3f789514fd26daf7f856454223dc1b5e9697a545aa493)

Left to right: field tunic; work vest; travel coat. Working choice: **work vest**.

### Conifer

![Conifer alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/bf/bfb6ba3408bf21236f64258ec7b18821ef932681330d390f0ddcc0df4ca98f2e)

Left to right: tiered boughs; slender crown; sheltered pine. Working choice: **sheltered pine**.

### Pale woodland tree

![Pale woodland tree alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/9d/9dafb8bba4bf19c86fc4fda5f9479fffa77c4c49ff271c95a85109501fab7a30)

Left to right: forked trunk; slender birch; open branches. Working choice: **slender birch**.

### Woodland shrub

![Woodland shrub alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/cc/cc607b888378a8e86701d1d65d10a66b087a6b608534b9d65df9a0467a419401)

Left to right: rounded thicket; open flowering; low spreading. Working choice: **rounded thicket**.

### Weathered stone

![Weathered stone alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/56/5601bdb06ca439c1b443f9f516ab2df44e48a79dec47f8418f3eadff31dbadf5)

Left to right: rounded shoulder; split planes; low slab. Working choice: **rounded shoulder**.

### Ground growth

![Ground growth alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/7b/7b11401bf8a52e50ea7a3ff086bbeb9fa6ad702d381a3fd5f84dd1da396bbdb5)

Left to right: broad tuft; fine tuft; open stems. Working choice: **broad tuft**.

### Woodland fern

![Woodland fern alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/a3/a359d180b8d3794d8e5412f0ae8df8ad4e47a7c798dba2cfce15fe05fe6a1070)

Left to right: open fronds; arching fronds; sheltered fronds. Working choice: **open fronds**.

### Wolf

![Wolf alternatives](https://assets.openlegend.ai/studies/public/blobs/sha256/9a/9a821b92a3a3bdd08044d5b04500ddbeb49eae017bf4a9a31b72a0f10b444c2a)

Left to right: field grey; full ruff; dark saddle. Working choice: **field grey**.

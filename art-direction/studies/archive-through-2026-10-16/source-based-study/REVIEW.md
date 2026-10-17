# Source-based starting-world art study

Delivered October 16, 2026. Working selections, not creator approval.

[Open the complete visual study](index.html). It starts with real scene captures, then matched motion, scale, references, composition annotations and all 41 asset families. Click images for their original capture resolution. All 123 choices and 38 source controls remain available. The earlier rejected study is preserved beside this folder.

The working combination is the restored original mercenary, source-based people and animals, quiet woodland materials, 40 samples/metre, one final shared resolve, 12 held poses/second, settled cloth and Economy shadows. Camera framing is closer (zoom 5.5 / pitch 0.68); the former 12 / 0.88 overview is retained. Body scale is independent: 2.035 m mercenary beside 1.85 m adults, ten percent taller. This is shaped 3D with designed pixel rendering, not permanent voxel anatomy.

![Actual camp, clear daylight](scenes/camp-day.png)

![Three original-model mercenary interpretations](options/mercenary.png)

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

![Padded armor study alternatives](options/armor.png)

Left to right: field tunic; work vest; travel coat. Working choice: **field tunic**.

### Bear

![Bear alternatives](options/library-bear.png)

Left to right: forest brown; heavy shoulder; pale muzzle. Working choice: **forest brown**.

### Woodland bird

![Woodland bird alternatives](options/library-bird.png)

Left to right: grey wing; warm bib; wing bars. Working choice: **grey wing**.

### Supply chest

![Supply chest alternatives](options/library-chest.png)

Left to right: carved lid; banded lid; plank cache. Working choice: **banded lid**.

### Deer

![Deer alternatives](options/library-deer.png)

Left to right: woodland doe; slender doe; dark back. Working choice: **woodland doe**.

### Sword

![Sword alternatives](options/library-sword.png)

Left to right: straight crossguard; broad tip; long grip. Working choice: **broad tip**.

### Shield

![Shield alternatives](options/library-shield.png)

Left to right: round boards; reinforced round; heater. Working choice: **round boards**.

### Knife

![Knife alternatives](options/library-knife.png)

Left to right: utility; leaf point; long knife. Working choice: **utility**.

### Bow

![Bow alternatives](options/library-bow.png)

Left to right: field bow; curved limbs; bound grip. Working choice: **field bow**.

### Arrow

![Arrow alternatives](options/library-arrow.png)

Left to right: bone point; broad fletching; slender shaft. Working choice: **bone point**.

### Hare

![Hare alternatives](options/library-hare.png)

Left to right: field; russet; winter. Working choice: **field**.

### Kest

![Kest alternatives](options/kest.png)

Left to right: field tunic; work vest; travel coat. Working choice: **travel coat**.

### Mara Reed

![Mara Reed alternatives](options/mara.png)

Left to right: field tunic; work vest; travel coat. Working choice: **travel coat**.

### Peacock Mercenary

![Peacock Mercenary alternatives](options/mercenary.png)

Left to right: restored; tailored; embroidered. Working choice: **restored**.

### Mike

![Mike alternatives](options/mike.png)

Left to right: field tunic; work vest; travel coat. Working choice: **field tunic**.

### Library broadleaf

![Library broadleaf alternatives](options/library-broadleaf.png)

Left to right: open boughs; layered crown; sheltered crown. Working choice: **sheltered crown**.

### Orin

![Orin alternatives](options/orin.png)

Left to right: field tunic; work vest; travel coat. Working choice: **field tunic**.

### Ada

![Ada alternatives](options/ada.png)

Left to right: field tunic; work vest; travel coat. Working choice: **field tunic**.

### Berry bush

![Berry bush alternatives](options/library-berry-bush.png)

Left to right: fruit groups; open canes; low thicket. Working choice: **fruit groups**.

### River reeds

![River reeds alternatives](options/library-reeds.png)

Left to right: river fan; broad leaves; broken stems. Working choice: **river fan**.

### Dry fibers

![Dry fibers alternatives](options/library-dry-fiber.png)

Left to right: standing stems; loose stems; low tuft. Working choice: **standing stems**.

### Fallen wood

![Fallen wood alternatives](options/library-fallen-wood.png)

Left to right: loose branches; fallen log; forked stump. Working choice: **loose branches**.

### Loose river stones

![Loose river stones alternatives](options/library-river-stones.png)

Left to right: loose stones; flat stone; split stone. Working choice: **loose stones**.

### Carved work marker

![Carved work marker alternatives](options/library-marker.png)

Left to right: single board; crossroads; worn post. Working choice: **single board**.

### Workshop supplies

![Workshop supplies alternatives](options/library-supplies.png)

Left to right: open box; wide box; stave barrel. Working choice: **open box**.

### Travelling bundle

![Travelling bundle alternatives](options/library-bundle.png)

Left to right: rolled wool; open bedroll; tied bundle. Working choice: **rolled wool**.

### Riverside workbench

![Riverside workbench alternatives](options/library-workbench.png)

Left to right: open bench; long table; narrow bench. Working choice: **open bench**.

### Travelling pack

![Travelling pack alternatives](options/library-backpack.png)

Left to right: canvas pack; broad flap; slender pack. Working choice: **canvas pack**.

### Canvas shelter

![Canvas shelter alternatives](options/library-shelter.png)

Left to right: open awning; canvas tent; framed tent. Working choice: **open awning**.

### Fiber cord

![Fiber cord alternatives](options/library-cord.png)

Left to right: loose coil; figure eight; working length. Working choice: **loose coil**.

### Field sling

![Field sling alternatives](options/library-sling.png)

Left to right: split pouch; oval pouch; long pouch. Working choice: **split pouch**.

### Stone tool

![Stone tool alternatives](options/library-stone-tool.png)

Left to right: broad flake; pointed flake; small scraper. Working choice: **broad flake**.

### Stag

![Stag alternatives](options/library-stag.png)

Left to right: branching antlers; slender stag; dark mantle. Working choice: **branching antlers**.

### Tavin Vale

![Tavin Vale alternatives](options/tavin.png)

Left to right: field tunic; work vest; travel coat. Working choice: **work vest**.

### Conifer

![Conifer alternatives](options/library-conifer.png)

Left to right: tiered boughs; slender crown; sheltered pine. Working choice: **sheltered pine**.

### Pale woodland tree

![Pale woodland tree alternatives](options/library-birch.png)

Left to right: forked trunk; slender birch; open branches. Working choice: **slender birch**.

### Woodland shrub

![Woodland shrub alternatives](options/library-shrub.png)

Left to right: rounded thicket; open flowering; low spreading. Working choice: **rounded thicket**.

### Weathered stone

![Weathered stone alternatives](options/library-rock.png)

Left to right: rounded shoulder; split planes; low slab. Working choice: **rounded shoulder**.

### Ground growth

![Ground growth alternatives](options/library-grass.png)

Left to right: broad tuft; fine tuft; open stems. Working choice: **broad tuft**.

### Woodland fern

![Woodland fern alternatives](options/library-fern.png)

Left to right: open fronds; arching fronds; sheltered fronds. Working choice: **open fronds**.

### Wolf

![Wolf alternatives](options/library-wolf.png)

Left to right: field grey; full ruff; dark saddle. Working choice: **field grey**.


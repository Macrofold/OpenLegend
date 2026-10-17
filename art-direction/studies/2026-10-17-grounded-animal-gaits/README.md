# Grounded animal gait study — October 17, 2026

[Open the comparison](comparison.html). Task baseline: `dc20b4c97`; previous motion acceptance was superseded by Mike’s report of spider-like deer steps and liquid wolf forepaws.

The selected exports retain all three coats per animal and original controls. Exact prior catalogs, GLBs and editable Blender files are in `previous-assets/`; their original recipe is available at the task baseline in Git. Their recorded `sourceFile` paths identify the historical repository location, while the matching archived Blender files are directly linked in the gallery. Earlier dated archives are unchanged.

## What changed

- Deer/stag: corrected hind → same-side fore → opposite hind → opposite fore touchdown sequence; removed conflicting source IK constraints after preserving evaluated Idle; solved fixed-length leg segments with consistent front/rear bends; kept stance feet level and matched foot velocity at swing/contact boundaries.
- Wolf: retained source gait timing and wrist rotations, removed animated foreleg joint translation/stretch, and held toes in their neutral shape. The rest wrist-to-toe distance is approximately 0.10987 m. Exported old motion ranged from approximately 0.09046 to 0.27723 m across the two paws.
- Changes are baked offline. Runtime mesh detail, skeleton size, animation-channel counts, tree art, lighting, body dimensions, native travel and pixel treatment are unchanged.

The [verification report](../../../docs/verification/natural-source-replacements.md#deer-stride-and-wolf-forepaws--october-17-2026) owns checks and limits. Original sources remain CDmir/TinyWorlds CC0 deer and Wildfire Games CC BY-SA 3.0 wolf; derivative credit/license metadata remains embedded.

## Captures

All recordings use the existing inspector or scene renderer, daylight, the balanced 30/60 pixel treatment and the ordinary close inspection framing. Side/quarter/front views are explicitly labeled. Large inspector images are not claims about gameplay readability. The woodland recording uses the existing staged motion fixture and held12 scene profile.

- `doe-final-side` and `doe-final-front`: final deer stride, including continuous contact velocity; front compares all three finishes.
- `stag-final-side`: final stag stride.
- `wolf-final-side` and `wolf-final-three-coats`: final rigid foreleg/neutral toe motion; the three-coat recording precedes an attribution-only export refresh.
- `doe-final-idle.png`: preserved source idle/front view, all three finishes.
- `woodland-final`: actual scene renderer and recorded woodland population.
- `doe-grounded-*`: rejected initial pass with all knees bent rearward and excessive crouch.
- `doe-refined-side` and `stag-final-quarter`: intermediate bend/height correction before continuous contact velocity was added.
- `wolf-rigid-offset-trial`: first rigid-length correction, before neutralizing excessive toe curl.
- `wolf-stable-paw-side`: neutral toes before normalizing source quaternion values; subsequent refinement removes tiny unwanted scale variation.

Previous reference clips remain linked in their original archive. The new manifest covers every local file except itself. No paid provider was called.

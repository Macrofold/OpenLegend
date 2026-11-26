# Peacock Mercenary measured anatomy correction

The corrected tall body and selected face are joined in one rigged Blender study for Mike's anatomy review. The [preceding Meshy-to-MetaHuman study](../2026-11-11-peacock-meshy-conform/README.md) owns the exact references, raw geometry and native fits. Mike flagged the curved back taper, protruding seat, flattened muscle relief and posterior neck bulge. Clothing awaits his review under [MHP08](../../../docs/maintainers/art/metahuman-poc.md#peacock-likeness-follow-through).

## Method and evidence

The 203.21 cm baseline, reference landmarks, silhouette overlays and fixed muscle sections were hashed before sculpting. Body renders use the same neutral pose, scale and camera. The body sections hold reference-defined heights and a shared hip-joint origin. The reference profile's lowered arm hides the rear lumbar contour. Its shorts hide the underlying pelvis, seat and fold. Image measurements are projections, with an estimated side registration. Mesh measurements use centimeters or millimeters and percentages of stature.

- **Taper and seat.** Back lower-rib width changed from 12.76% to 14.03% of stature against 14.01% projected. The largest back taper width error fell from 1.47 to 0.61 percentage points of stature. The covered seat peak moved from 7.90% to 6.44% rearward against 6.50% projected, and from 55.75% to 54.25% above the sole against 53.67%. At the reference seat height, the anatomy provides about 2.4 cm of the 2.6 cm reduction in rear projection. The original studio shorts are fitted separately.
- **Relief.** The corrected chest, abdomen, obliques and upper back all gain measured relief. Upper abdominal relief changes from −0.09 to 4.22 mm and lower abdominal relief from 0.70 to 5.23 mm. Raw Meshy supplies a scale-matched geometry comparison. The image supplies visual targets for the volumes and no physical relief depth. The obliques and scapular forms remain softer than the reference.
- **Joined neck.** The aligned face is transferred by matching UV corners to the tall topology, with fixed stature and shared boundary. The largest rear-neck contour deviation drops from 24.3 to 12.6 mm. The base remains about 11 mm deeper than the body projection. In neutral, both 25° turns and a 12° downward tilt, all 92 sampled LOD0 seam positions stay within 0.001 mm. The four poses show a faint rear shading band and small throat fold, with no visible seam opening. The neck sculpt leaves the protected eyes, nose and jaw fixed.

The widest shoulder row still exceeds the back projection by about 2.2 cm, with pose affecting the comparison. The studio shorts retain a crotch crease. The revised body preserves rig transforms, topology, UVs and weights in four body LODs. The assembled Blender source reopens and renders. Lower-LOD neck matching, facial motion, in-game playback and wardrobe remain outside this study.

## Preservation

The [private archive index](anatomy-correction-review.index.json) selects the 66,900,640-byte `Peacock-anatomy-correction-review.zip` and its exact prior study dependency. It contains the frozen baseline, corrected source, 457 comparison rows in `measurements.csv`, and the measurement, overlay and pose plates. An empty-cache workspace restored all 112 payloads and the inventory and matched their hashes. A separate read matched the committed S3 object version.

The correction and renders ran locally in Blender 5.2.3 LTS with no generation charges. Private archive clients closed after 50 seconds. Modeled archive compute and transfer were about $0.07 before minor storage and request charges. Actual AWS billing is unmeasured.
